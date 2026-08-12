BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create tables
CREATE TABLE IF NOT EXISTS public.vehicle_360_capture_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.vehicle_360_projects(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    view_type TEXT NOT NULL CHECK (view_type IN ('exterior', 'interior')),
    token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    target_frame_count INTEGER NOT NULL,
    capture_mode TEXT NOT NULL CHECK (capture_mode IN ('replace', 'append')),
    status TEXT NOT NULL CHECK (status IN ('active', 'finalizing', 'completed', 'expired', 'cancelled')),
    current_step INTEGER NOT NULL DEFAULT 0 CHECK (current_step >= 0),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Validations
    CONSTRAINT check_exterior_frames CHECK (view_type != 'exterior' OR (target_frame_count >= 24 AND target_frame_count <= 96)),
    CONSTRAINT check_interior_frames CHECK (view_type != 'interior' OR (target_frame_count >= 8 AND target_frame_count <= 48)),
    CONSTRAINT check_capture_expiration CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.vehicle_360_capture_frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.vehicle_360_capture_sessions(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL CHECK (slot_number >= 0),
    storage_path TEXT NOT NULL,
    image_url TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER CHECK (file_size IS NULL OR (file_size > 0 AND file_size <= 5242880)),
    width INTEGER CHECK (width IS NULL OR (width > 0 AND width <= 2560)),
    height INTEGER CHECK (height IS NULL OR (height > 0 AND height <= 2560)),
    status TEXT NOT NULL CHECK (status IN ('uploaded', 'confirmed', 'rejected')),
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, slot_number),
    UNIQUE(storage_path)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_capture_sessions_token_hash ON public.vehicle_360_capture_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_capture_sessions_project_status ON public.vehicle_360_capture_sessions(project_id, status);
CREATE INDEX IF NOT EXISTS idx_capture_sessions_expires_status ON public.vehicle_360_capture_sessions(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_capture_frames_session_slot ON public.vehicle_360_capture_frames(session_id, slot_number);

-- 3. RLS Policies
ALTER TABLE public.vehicle_360_capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_360_capture_frames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view sessions" ON public.vehicle_360_capture_sessions;
CREATE POLICY "Admins can view sessions" 
ON public.vehicle_360_capture_sessions FOR SELECT 
USING (auth.uid() IN (SELECT id FROM public.admins));

DROP POLICY IF EXISTS "Admins can view frames" ON public.vehicle_360_capture_frames;
CREATE POLICY "Admins can view frames" 
ON public.vehicle_360_capture_frames FOR SELECT 
USING (auth.uid() IN (SELECT id FROM public.admins));

-- 4. RPC for Finalizing
CREATE OR REPLACE FUNCTION public.finalize_vehicle_360_capture(
    p_session_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_session RECORD;
    v_project RECORD;
    v_frames_count INT;
    v_frame_idx INT;
    v_max_frames INT;
    v_existing_frames INT;
    v_offset INT := 0;
    v_old_paths TEXT[] := ARRAY[]::TEXT[];
    v_frame_record RECORD;
BEGIN
    -- 1. Lock Session
    SELECT * INTO v_session
    FROM public.vehicle_360_capture_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_session.status != 'active' THEN
        RAISE EXCEPTION 'Session is not in active state';
    END IF;

    IF v_session.expires_at < NOW() THEN
        RAISE EXCEPTION 'Session is expired';
    END IF;

    -- Update status to finalizing during the transaction
    UPDATE public.vehicle_360_capture_sessions
    SET status = 'finalizing', updated_at = NOW()
    WHERE id = p_session_id;

    -- 2. Lock Project
    SELECT * INTO v_project
    FROM public.vehicle_360_projects
    WHERE id = v_session.project_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project not found';
    END IF;

    IF v_project.vehicle_id != v_session.vehicle_id THEN
        RAISE EXCEPTION 'Project vehicle_id does not match session vehicle_id';
    END IF;

    IF v_project.view_type != v_session.view_type THEN
        RAISE EXCEPTION 'Project view_type does not match session view_type';
    END IF;

    -- 3. Validate slots
    SELECT COUNT(*) INTO v_frames_count
    FROM public.vehicle_360_capture_frames
    WHERE session_id = p_session_id AND status = 'confirmed';

    IF v_frames_count != v_session.target_frame_count THEN
        RAISE EXCEPTION 'Incomplete frames: expected %, got %', v_session.target_frame_count, v_frames_count;
    END IF;

    -- Validate sequence 0 to target_frame_count - 1 and duplicate slots
    FOR v_frame_idx IN 0..(v_session.target_frame_count - 1) LOOP
        IF (SELECT COUNT(*) FROM public.vehicle_360_capture_frames 
            WHERE session_id = p_session_id AND slot_number = v_frame_idx AND status = 'confirmed') != 1 THEN
            RAISE EXCEPTION 'Missing or duplicate confirmed frame at slot %', v_frame_idx;
        END IF;
    END LOOP;

    -- 4. Limits and Mode logic
    IF v_session.view_type = 'exterior' THEN
        v_max_frames := 96;
    ELSIF v_session.view_type = 'interior' THEN
        v_max_frames := 48;
    ELSE
        RAISE EXCEPTION 'Invalid view_type %', v_session.view_type;
    END IF;

    SELECT COUNT(*) INTO v_existing_frames
    FROM public.vehicle_360_frames
    WHERE project_id = v_project.id;

    IF v_session.capture_mode = 'replace' THEN
        IF v_session.target_frame_count > v_max_frames THEN
            RAISE EXCEPTION 'Exceeds maximum frames limit for view_type %', v_session.view_type;
        END IF;

        -- Collect old paths to delete later
        SELECT COALESCE(
            array_agg(storage_path) FILTER (WHERE storage_path IS NOT NULL AND storage_path <> ''),
            ARRAY[]::TEXT[]
        )
        INTO v_old_paths
        FROM public.vehicle_360_frames
        WHERE project_id = v_project.id;

        -- Delete tracking positions for this project
        DELETE FROM public.vehicle_360_hotspot_positions
        WHERE hotspot_id IN (SELECT id FROM public.vehicle_360_hotspots WHERE project_id = v_project.id);
        
        DELETE FROM public.vehicle_360_damage_marker_positions
        WHERE marker_id IN (SELECT id FROM public.vehicle_360_damage_markers WHERE project_id = v_project.id);

        -- Delete old frames
        DELETE FROM public.vehicle_360_frames WHERE project_id = v_project.id;

        -- Adjust existing hotspots base frame_number if needed (bound to new max frame)
        UPDATE public.vehicle_360_hotspots
        SET frame_number = LEAST(frame_number, v_session.target_frame_count - 1)
        WHERE project_id = v_project.id;

        UPDATE public.vehicle_360_damage_markers
        SET frame_number = LEAST(frame_number, v_session.target_frame_count - 1)
        WHERE project_id = v_project.id;

        v_offset := 0;
    ELSE
        -- append
        IF (v_existing_frames + v_session.target_frame_count) > v_max_frames THEN
            RAISE EXCEPTION 'Exceeds maximum frames limit for view_type %', v_session.view_type;
        END IF;
        
        -- Calculate max existing frame_number to append after it
        SELECT COALESCE(MAX(frame_number) + 1, 0) INTO v_offset
        FROM public.vehicle_360_frames
        WHERE project_id = v_project.id;
    END IF;

    -- 5. Insert new frames
    FOR v_frame_record IN (
        SELECT * FROM public.vehicle_360_capture_frames
        WHERE session_id = p_session_id AND status = 'confirmed'
        ORDER BY slot_number ASC
    ) LOOP
        INSERT INTO public.vehicle_360_frames (
            project_id,
            frame_number,
            image_url,
            storage_path,
            original_filename,
            width,
            height
        ) VALUES (
            v_project.id,
            v_offset + v_frame_record.slot_number,
            v_frame_record.image_url,
            v_frame_record.storage_path,
            v_frame_record.slot_number::text || '.jpg',
            v_frame_record.width,
            v_frame_record.height
        );
    END LOOP;

    -- 6. Update project
    UPDATE public.vehicle_360_projects
    SET status = 'draft',
        frame_count = (CASE WHEN v_session.capture_mode = 'replace' THEN v_session.target_frame_count ELSE v_existing_frames + v_session.target_frame_count END),
        updated_at = NOW()
    WHERE id = v_project.id;

    -- 7. Update session
    UPDATE public.vehicle_360_capture_sessions
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'project_id', v_project.id,
        'view_type', v_project.view_type,
        'inserted_frames', v_session.target_frame_count,
        'total_frames', (CASE WHEN v_session.capture_mode = 'replace' THEN v_session.target_frame_count ELSE v_existing_frames + v_session.target_frame_count END),
        'old_storage_paths', v_old_paths
    );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_vehicle_360_capture(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_vehicle_360_capture(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_vehicle_360_capture(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_vehicle_360_capture(UUID) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
