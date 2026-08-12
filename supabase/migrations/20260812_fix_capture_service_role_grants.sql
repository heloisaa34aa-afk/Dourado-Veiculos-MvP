BEGIN;

-- The Edge Function authenticates users and performs all mobile writes with the
-- service role. RLS bypass alone does not replace PostgreSQL table privileges.
GRANT SELECT ON TABLE public.admins TO service_role;
GRANT SELECT ON TABLE public.vehicle_360_projects TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.vehicle_360_capture_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vehicle_360_capture_frames TO service_role;

-- Capture sessions and their temporary frames are never accessed directly by
-- a public browser. All access goes through vehicle-360-capture.
REVOKE ALL ON TABLE public.vehicle_360_capture_sessions FROM anon;
REVOKE ALL ON TABLE public.vehicle_360_capture_frames FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.vehicle_360_capture_sessions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.vehicle_360_capture_frames FROM authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_vehicle_360_capture(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.finalize_vehicle_360_capture(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_vehicle_360_capture(UUID) FROM authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
