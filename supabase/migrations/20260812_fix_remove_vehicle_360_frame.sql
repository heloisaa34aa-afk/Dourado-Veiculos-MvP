-- Fix remove_vehicle_360_frame
BEGIN;

DROP FUNCTION IF EXISTS public.remove_vehicle_360_frame(UUID, UUID);

CREATE FUNCTION public.remove_vehicle_360_frame(
    p_project_id UUID,
    p_frame_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_frame_number INT;
    v_storage_path TEXT;
    v_total_frames INT;
    v_remaining_frames INT;
    v_offset INT := 100000;
    v_view_type TEXT;
    v_current_status TEXT;
    v_min_frames INT;
    v_was_unpublished BOOLEAN := false;
    v_affected_hotspot_ids UUID[];
    v_affected_damage_ids UUID[];
    v_target_frame INT;
    v_id UUID;
    v_closest_frame INT;
    v_closest_x NUMERIC;
    v_closest_y NUMERIC;
BEGIN
    -- 1. Validar administrador
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.admins
        WHERE id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Administrator authentication required'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Bloquear o projeto
    SELECT view_type, status INTO v_view_type, v_current_status
    FROM public.vehicle_360_projects
    WHERE id = p_project_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project not found';
    END IF;

    -- 3. Confirmar que o frame pertence ao projeto e bloquear
    SELECT frame_number, storage_path INTO v_frame_number, v_storage_path
    FROM public.vehicle_360_frames
    WHERE id = p_frame_id AND project_id = p_project_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Frame not found in project';
    END IF;

    -- 4. Impedir exclusão quando existe apenas um frame
    SELECT COUNT(*) INTO v_total_frames FROM public.vehicle_360_frames WHERE project_id = p_project_id;
    IF v_total_frames <= 1 THEN
        RAISE EXCEPTION 'Cannot remove the last frame';
    END IF;

    -- 5. Capturar os IDs dos marcadores originalmente ancorados no frame que será removido
    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO v_affected_hotspot_ids
    FROM public.vehicle_360_hotspots
    WHERE project_id = p_project_id
      AND frame_number = v_frame_number;

    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO v_affected_damage_ids
    FROM public.vehicle_360_damage_markers
    WHERE project_id = p_project_id
      AND frame_number = v_frame_number;

    -- 6. Excluir posições vinculadas a este frame
    DELETE FROM public.vehicle_360_hotspot_positions
    WHERE frame_number = v_frame_number
       AND hotspot_id IN (SELECT id FROM public.vehicle_360_hotspots WHERE project_id = p_project_id);

    DELETE FROM public.vehicle_360_damage_marker_positions
    WHERE frame_number = v_frame_number
      AND marker_id IN (SELECT id FROM public.vehicle_360_damage_markers WHERE project_id = p_project_id);

    -- 7. Excluir o frame selecionado
    DELETE FROM public.vehicle_360_frames WHERE id = p_frame_id;

    -- 8. Renumerar frames posteriores (evitando colisões via offset)
    UPDATE public.vehicle_360_frames
    SET frame_number = frame_number + v_offset
    WHERE project_id = p_project_id AND frame_number > v_frame_number;

    UPDATE public.vehicle_360_frames
    SET frame_number = frame_number - v_offset - 1
    WHERE project_id = p_project_id AND frame_number >= v_offset;

    -- 9. Renumerar posições posteriores
    UPDATE public.vehicle_360_hotspot_positions
    SET frame_number = frame_number + v_offset
    WHERE frame_number > v_frame_number
      AND hotspot_id IN (SELECT id FROM public.vehicle_360_hotspots WHERE project_id = p_project_id);

    UPDATE public.vehicle_360_hotspot_positions
    SET frame_number = frame_number - v_offset - 1
    WHERE frame_number >= v_offset
      AND hotspot_id IN (SELECT id FROM public.vehicle_360_hotspots WHERE project_id = p_project_id);

    UPDATE public.vehicle_360_damage_marker_positions
    SET frame_number = frame_number + v_offset
    WHERE frame_number > v_frame_number
      AND marker_id IN (SELECT id FROM public.vehicle_360_damage_markers WHERE project_id = p_project_id);

    UPDATE public.vehicle_360_damage_marker_positions
    SET frame_number = frame_number - v_offset - 1
    WHERE frame_number >= v_offset
      AND marker_id IN (SELECT id FROM public.vehicle_360_damage_markers WHERE project_id = p_project_id);

    -- 10. Ajustar frame_number principal dos hotspots e damage markers > removido
    UPDATE public.vehicle_360_hotspots
    SET frame_number = frame_number - 1
    WHERE project_id = p_project_id AND frame_number > v_frame_number;

    UPDATE public.vehicle_360_damage_markers
    SET frame_number = frame_number - 1
    WHERE project_id = p_project_id AND frame_number > v_frame_number;
    
    -- Contagem real APÓS a exclusão e renumeração
    SELECT COUNT(*)
    INTO v_remaining_frames
    FROM public.vehicle_360_frames
    WHERE project_id = p_project_id;
    
    v_target_frame := LEAST(v_frame_number, v_remaining_frames - 1);

    -- 11. Reposicionar marcadores que estavam no frame removido (usando as variáveis capturadas)
    FOREACH v_id IN ARRAY v_affected_hotspot_ids
    LOOP
        v_closest_frame := NULL;
        
        -- Achar a posição sobrevivente mais próxima do target_frame
        SELECT frame_number, pos_x, pos_y 
        INTO v_closest_frame, v_closest_x, v_closest_y
        FROM public.vehicle_360_hotspot_positions
        WHERE hotspot_id = v_id
        ORDER BY ABS(frame_number - v_target_frame), frame_number
        LIMIT 1;
        
        IF v_closest_frame IS NOT NULL THEN
            UPDATE public.vehicle_360_hotspots
            SET frame_number = v_closest_frame,
                pos_x = v_closest_x,
                pos_y = v_closest_y
            WHERE id = v_id;
        ELSE
            -- Nenhuma posição sobrevivente, usar target_frame e manter as coords
            UPDATE public.vehicle_360_hotspots
            SET frame_number = v_target_frame
            WHERE id = v_id;
        END IF;
    END LOOP;

    FOREACH v_id IN ARRAY v_affected_damage_ids
    LOOP
        v_closest_frame := NULL;
        
        -- Achar a posição sobrevivente mais próxima do target_frame
        SELECT frame_number, pos_x, pos_y 
        INTO v_closest_frame, v_closest_x, v_closest_y
        FROM public.vehicle_360_damage_marker_positions
        WHERE marker_id = v_id
        ORDER BY ABS(frame_number - v_target_frame), frame_number
        LIMIT 1;
        
        IF v_closest_frame IS NOT NULL THEN
            UPDATE public.vehicle_360_damage_markers
            SET frame_number = v_closest_frame,
                pos_x = v_closest_x,
                pos_y = v_closest_y
            WHERE id = v_id;
        ELSE
            -- Nenhuma posição sobrevivente, usar target_frame e manter as coords
            UPDATE public.vehicle_360_damage_markers
            SET frame_number = v_target_frame
            WHERE id = v_id;
        END IF;
    END LOOP;

    -- 12. Atualizar status e frame_count na mesma transação
    IF v_view_type = 'exterior' THEN
        v_min_frames := 24;
    ELSE
        v_min_frames := 8;
    END IF;

    IF v_current_status = 'completed' AND v_remaining_frames < v_min_frames THEN
        UPDATE public.vehicle_360_projects
        SET status = 'draft',
            frame_count = v_remaining_frames,
            updated_at = NOW()
        WHERE id = p_project_id;
        
        v_was_unpublished := true;
    ELSE
        UPDATE public.vehicle_360_projects
        SET frame_count = v_remaining_frames,
            updated_at = NOW()
        WHERE id = p_project_id;
    END IF;

    -- 13. Retornar JSON
    RETURN jsonb_build_object(
        'deleted_frame_id', p_frame_id,
        'deleted_frame_number', v_frame_number,
        'storage_path', v_storage_path,
        'remaining_frames', v_remaining_frames,
        'project_status', CASE WHEN v_was_unpublished THEN 'draft' ELSE v_current_status END,
        'was_unpublished', v_was_unpublished
    );
END;
$$;

REVOKE ALL ON FUNCTION public.remove_vehicle_360_frame(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_vehicle_360_frame(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_vehicle_360_frame(UUID, UUID) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
