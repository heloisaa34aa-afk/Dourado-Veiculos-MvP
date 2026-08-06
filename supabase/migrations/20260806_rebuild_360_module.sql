-- WARNING: DESTRUCTIVE MIGRATION FOR 360 MODULE DATA ONLY
-- This migration drops and recreates all tables related to the 360 viewer.
-- It does NOT affect vehicles, images, users, or other core tables.

BEGIN;

-- 1. Drop existing legacy and new 360 tables safely
DROP TABLE IF EXISTS public.vehicle_damage_images CASCADE;
DROP TABLE IF EXISTS public.vehicle_damage_markers CASCADE;
DROP TABLE IF EXISTS public.vehicle_hotspots CASCADE;
DROP TABLE IF EXISTS public.vehicle_360_damage_images CASCADE;
DROP TABLE IF EXISTS public.vehicle_360_damage_markers CASCADE;
DROP TABLE IF EXISTS public.vehicle_360_hotspots CASCADE;
DROP TABLE IF EXISTS public.vehicle_360_frames CASCADE;
DROP TABLE IF EXISTS public.vehicle_360_projects CASCADE;

-- 2. Create canonical tables

CREATE TABLE public.vehicle_360_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed')),
    frame_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(vehicle_id)
);

CREATE TABLE public.vehicle_360_frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.vehicle_360_projects(id) ON DELETE CASCADE,
    frame_number integer NOT NULL CHECK (frame_number >= 0),
    image_url text NOT NULL,
    storage_path text,
    original_filename text,
    width integer CHECK (width IS NULL OR width > 0),
    height integer CHECK (height IS NULL OR height > 0),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, frame_number)
);

CREATE TABLE public.vehicle_360_hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.vehicle_360_projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    frame_number integer NOT NULL CHECK (frame_number >= 0),
    pos_x numeric NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
    pos_y numeric NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100),
    image_url text,
    storage_path text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.vehicle_360_damage_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.vehicle_360_projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    category text NOT NULL DEFAULT 'Outro',
    frame_number integer NOT NULL CHECK (frame_number >= 0),
    pos_x numeric NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
    pos_y numeric NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.vehicle_360_damage_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id UUID NOT NULL REFERENCES public.vehicle_360_damage_markers(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    storage_path text,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(marker_id, order_index)
);

-- 3. Create indices
CREATE INDEX idx_v360_projects_vehicle ON public.vehicle_360_projects(vehicle_id);
CREATE INDEX idx_v360_frames_proj_frame ON public.vehicle_360_frames(project_id, frame_number);
CREATE INDEX idx_v360_hotspots_proj_frame ON public.vehicle_360_hotspots(project_id, frame_number);
CREATE INDEX idx_v360_damage_proj_frame ON public.vehicle_360_damage_markers(project_id, frame_number);
CREATE INDEX idx_v360_damage_img_marker_order ON public.vehicle_360_damage_images(marker_id, order_index);

-- 4. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_360_updated_at_column()
RETURNS TRIGGER AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- 5. Attach updated_at triggers
CREATE TRIGGER set_updated_at_vehicle_360_projects
    BEFORE UPDATE ON public.vehicle_360_projects
    FOR EACH ROW EXECUTE PROCEDURE public.update_360_updated_at_column();

CREATE TRIGGER set_updated_at_vehicle_360_frames
    BEFORE UPDATE ON public.vehicle_360_frames
    FOR EACH ROW EXECUTE PROCEDURE public.update_360_updated_at_column();

CREATE TRIGGER set_updated_at_vehicle_360_hotspots
    BEFORE UPDATE ON public.vehicle_360_hotspots
    FOR EACH ROW EXECUTE PROCEDURE public.update_360_updated_at_column();

CREATE TRIGGER set_updated_at_vehicle_360_damage_markers
    BEFORE UPDATE ON public.vehicle_360_damage_markers
    FOR EACH ROW EXECUTE PROCEDURE public.update_360_updated_at_column();

-- 6. Trigger to maintain frame_count
CREATE OR REPLACE FUNCTION public.update_360_frame_count()
RETURNS TRIGGER AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.vehicle_360_projects
        SET frame_count = (SELECT count(*) FROM public.vehicle_360_frames WHERE project_id = NEW.project_id)
        WHERE id = NEW.project_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.vehicle_360_projects
        SET frame_count = (SELECT count(*) FROM public.vehicle_360_frames WHERE project_id = OLD.project_id)
        WHERE id = OLD.project_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.project_id <> OLD.project_id THEN
            UPDATE public.vehicle_360_projects
            SET frame_count = (SELECT count(*) FROM public.vehicle_360_frames WHERE project_id = OLD.project_id)
            WHERE id = OLD.project_id;
            UPDATE public.vehicle_360_projects
            SET frame_count = (SELECT count(*) FROM public.vehicle_360_frames WHERE project_id = NEW.project_id)
            WHERE id = NEW.project_id;
        END IF;
        RETURN NEW;
    END IF;
END;
$function$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_360_frame_count
    AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_360_frames
    FOR EACH ROW EXECUTE PROCEDURE public.update_360_frame_count();

COMMIT;
