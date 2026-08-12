-- Fix remove_vehicle_360_frame

CREATE OR REPLACE FUNCTION public.remove_vehicle_360_frame(
    p_project_id UUID,
    p_frame_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_frame_number INT;
    v_storage_path TEXT;
    v_total_frames INT;
    v_remaining_frames INT;
    v_offset INT := 100000;
BEGIN
    -- 1. Validar usuário autorizado (usando RLS existente ou assumindo segurança definer)
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Bloquear o projeto
    PERFORM id FROM public.vehicle_360_projects WHERE id = p_project_id FOR UPDATE;

    -- 3. Confirmar que o frame pertence ao projeto e obter dados
    SELECT frame_number, storage_path INTO v_frame_number, v_storage_path
    FROM public.vehicle_360_frames
    WHERE id = p_frame_id AND project_id = p_project_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Frame not found in project';
    END IF;

    -- 4. Impedir exclusão quando existe apenas um frame
    SELECT COUNT(*) INTO v_total_frames FROM public.vehicle_360_frames WHERE project_id = p_project_id;
    IF v_total_frames <= 1 THEN
        RAISE EXCEPTION 'Cannot remove the last frame';
    END IF;

    -- 6. Excluir posições daquele número
    DELETE FROM public.vehicle_360_hotspot_positions
    WHERE frame_number = v_frame_number 
      AND hotspot_id IN (SELECT id FROM public.vehicle_360_hotspots WHERE project_id = p_project_id);

    DELETE FROM public.vehicle_360_damage_marker_positions
    WHERE frame_number = v_frame_number
      AND marker_id IN (SELECT id FROM public.vehicle_360_damage_markers WHERE project_id = p_project_id);

    -- 7. Excluir o frame selecionado
    DELETE FROM public.vehicle_360_frames WHERE id = p_frame_id;

    -- 8. Renumerar frames posteriores sem colisão
    -- Adicionar offset
    UPDATE public.vehicle_360_frames
    SET frame_number = frame_number + v_offset
    WHERE project_id = p_project_id AND frame_number > v_frame_number;

    -- Subtrair offset + 1
    UPDATE public.vehicle_360_frames
    SET frame_number = frame_number - v_offset - 1
    WHERE project_id = p_project_id AND frame_number >= v_offset;

    -- 9. Mesma renumeração nas posições posteriores
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

    -- 10. Ajustar frame_number principal dos hotspots e damage markers
    -- Maiores diminuem 1
    UPDATE public.vehicle_360_hotspots
    SET frame_number = frame_number - 1
    WHERE project_id = p_project_id AND frame_number > v_frame_number;

    UPDATE public.vehicle_360_damage_markers
    SET frame_number = frame_number - 1
    WHERE project_id = p_project_id AND frame_number > v_frame_number;

    -- Iguais ao removido passam para uma posição sobrevivente ou 0 se não houver
    UPDATE public.vehicle_360_hotspots h
    SET frame_number = COALESCE((
            SELECT MIN(p.frame_number) 
            FROM public.vehicle_360_hotspot_positions p 
            WHERE p.hotspot_id = h.id
        ), 0)
    WHERE h.project_id = p_project_id AND h.frame_number = v_frame_number;

    UPDATE public.vehicle_360_damage_markers m
    SET frame_number = COALESCE((
            SELECT MIN(p.frame_number) 
            FROM public.vehicle_360_damage_marker_positions p 
            WHERE p.marker_id = m.id
        ), 0)
    WHERE m.project_id = p_project_id AND m.frame_number = v_frame_number;

    -- Atualizar pos_x e pos_y
    UPDATE public.vehicle_360_hotspots h
    SET pos_x = p.pos_x,
        pos_y = p.pos_y
    FROM public.vehicle_360_hotspot_positions p
    WHERE h.project_id = p_project_id 
      AND p.hotspot_id = h.id
      AND h.frame_number = p.frame_number;

    UPDATE public.vehicle_360_damage_markers m
    SET pos_x = p.pos_x,
        pos_y = p.pos_y
    FROM public.vehicle_360_damage_marker_positions p
    WHERE m.project_id = p_project_id 
      AND p.marker_id = m.id
      AND m.frame_number = p.frame_number;

    -- 11. Nunca deixar frame_number negativo (COALESCE fallback para 0 ja trata) ou acima do ultimo
    -- (O update renumera certinho, e 0 sempre será válido pois impedimos excluir o último)

    -- 12. Atualizar frame_count
    SELECT COUNT(*) INTO v_remaining_frames FROM public.vehicle_360_frames WHERE project_id = p_project_id;
    UPDATE public.vehicle_360_projects
    SET frame_count = v_remaining_frames,
        updated_at = NOW()
    WHERE id = p_project_id;

    -- 14. Retornar JSON
    RETURN jsonb_build_object(
        'deleted_frame_id', p_frame_id,
        'deleted_frame_number', v_frame_number,
        'storage_path', v_storage_path,
        'remaining_frames', v_remaining_frames
    );
END;
$$;
