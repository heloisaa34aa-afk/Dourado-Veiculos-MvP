BEGIN;

-- Preserve the already deployed atomic implementation and place a validated
-- partial-capture gate in front of it. This migration is idempotent.
DO $$
BEGIN
  IF to_regprocedure('public.finalize_vehicle_360_capture_complete(uuid)') IS NULL THEN
    ALTER FUNCTION public.finalize_vehicle_360_capture(UUID)
      RENAME TO finalize_vehicle_360_capture_complete;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_vehicle_360_capture(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_session RECORD;
  v_confirmed_count INTEGER;
  v_minimum_count INTEGER;
  v_slot INTEGER;
BEGIN
  SELECT id, view_type, target_frame_count, status
    INTO v_session
  FROM public.vehicle_360_capture_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.status <> 'active' THEN
    RAISE EXCEPTION 'Session is not in active state';
  END IF;

  v_minimum_count := CASE
    WHEN v_session.view_type = 'exterior' THEN 24
    WHEN v_session.view_type = 'interior' THEN 8
    ELSE NULL
  END;

  IF v_minimum_count IS NULL THEN
    RAISE EXCEPTION 'Invalid view_type %', v_session.view_type;
  END IF;

  SELECT COUNT(*)::INTEGER
    INTO v_confirmed_count
  FROM public.vehicle_360_capture_frames
  WHERE session_id = p_session_id
    AND status = 'confirmed';

  IF v_confirmed_count < v_minimum_count THEN
    RAISE EXCEPTION 'Minimum frames not reached: expected at least %, got %',
      v_minimum_count, v_confirmed_count;
  END IF;

  IF v_confirmed_count > v_session.target_frame_count THEN
    RAISE EXCEPTION 'Confirmed frames exceed the session target';
  END IF;

  -- Partial completion is allowed only for a continuous sequence starting at 0.
  FOR v_slot IN 0..(v_confirmed_count - 1) LOOP
    IF (
      SELECT COUNT(*)
      FROM public.vehicle_360_capture_frames
      WHERE session_id = p_session_id
        AND slot_number = v_slot
        AND status = 'confirmed'
    ) <> 1 THEN
      RAISE EXCEPTION 'Missing or duplicate confirmed frame at slot %', v_slot;
    END IF;
  END LOOP;

  -- The preserved implementation is already atomic and validates its target.
  -- Shrink the target to the confirmed continuous set before delegating to it.
  UPDATE public.vehicle_360_capture_sessions
  SET target_frame_count = v_confirmed_count,
      current_step = v_confirmed_count,
      updated_at = NOW()
  WHERE id = p_session_id;

  RETURN public.finalize_vehicle_360_capture_complete(p_session_id);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_vehicle_360_capture_complete(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_vehicle_360_capture(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_vehicle_360_capture(UUID) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
