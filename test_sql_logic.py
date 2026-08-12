import re

sql = """
    -- 10. Ajustar frame_number principal dos hotspots
    -- a) maiores diminuem 1
    UPDATE public.vehicle_360_hotspots
    SET frame_number = frame_number - 1
    WHERE project_id = p_project_id AND frame_number > v_frame_number;
    
    -- b) iguais ao removido passam para uma posição sobrevivente ou 0 se não houver
    UPDATE public.vehicle_360_hotspots h
    SET frame_number = COALESCE((
            SELECT MIN(p.frame_number) 
            FROM public.vehicle_360_hotspot_positions p 
            WHERE p.hotspot_id = h.id
        ), 0)
    WHERE h.project_id = p_project_id AND h.frame_number = v_frame_number;

    -- Atualizar pos_x e pos_y para os que tiveram o frame_number realocado para uma posicao existente
    UPDATE public.vehicle_360_hotspots h
    SET pos_x = p.pos_x,
        pos_y = p.pos_y
    FROM public.vehicle_360_hotspot_positions p
    WHERE h.project_id = p_project_id 
      AND p.hotspot_id = h.id
      AND h.frame_number = p.frame_number;
"""
print(sql)
