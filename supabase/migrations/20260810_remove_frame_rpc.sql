-- Function to safely remove a frame and reorder the remaining frames
CREATE OR REPLACE FUNCTION remove_vehicle_360_frame(p_project_id UUID, p_frame_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_frame_number INT;
    v_total_frames INT;
BEGIN
    -- Get the frame number being deleted
    SELECT frame_number INTO v_frame_number
    FROM vehicle_360_frames
    WHERE id = p_frame_id AND project_id = p_project_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Frame not found';
    END IF;

    -- Count total frames
    SELECT COUNT(*) INTO v_total_frames
    FROM vehicle_360_frames
    WHERE project_id = p_project_id;

    IF v_total_frames <= 1 THEN
        RAISE EXCEPTION 'Cannot remove the last frame';
    END IF;

    -- Delete the frame
    DELETE FROM vehicle_360_frames
    WHERE id = p_frame_id AND project_id = p_project_id;

    -- Shift down the frame_number for all subsequent frames
    UPDATE vehicle_360_frames
    SET frame_number = frame_number - 1
    WHERE project_id = p_project_id AND frame_number > v_frame_number;

    -- Update the project frame count
    UPDATE vehicle_360_projects
    SET frame_count = frame_count - 1, updated_at = NOW()
    WHERE id = p_project_id;
END;
$$;
