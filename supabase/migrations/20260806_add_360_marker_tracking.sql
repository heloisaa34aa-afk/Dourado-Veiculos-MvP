CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.vehicle_360_hotspot_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotspot_id UUID NOT NULL REFERENCES public.vehicle_360_hotspots(id) ON DELETE CASCADE,
    frame_number INTEGER NOT NULL,
    pos_x NUMERIC NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
    pos_y NUMERIC NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100),
    visible BOOLEAN NOT NULL DEFAULT true,
    is_keyframe BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotspot_id, frame_number)
);

CREATE INDEX IF NOT EXISTS idx_360_hotspot_positions_lookup 
ON public.vehicle_360_hotspot_positions(hotspot_id, frame_number);

CREATE TABLE IF NOT EXISTS public.vehicle_360_damage_marker_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marker_id UUID NOT NULL REFERENCES public.vehicle_360_damage_markers(id) ON DELETE CASCADE,
    frame_number INTEGER NOT NULL,
    pos_x NUMERIC NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
    pos_y NUMERIC NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100),
    visible BOOLEAN NOT NULL DEFAULT true,
    is_keyframe BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(marker_id, frame_number)
);

CREATE INDEX IF NOT EXISTS idx_360_damage_positions_lookup 
ON public.vehicle_360_damage_marker_positions(marker_id, frame_number);

-- Migração dos marcadores existentes
INSERT INTO public.vehicle_360_hotspot_positions (hotspot_id, frame_number, pos_x, pos_y, visible, is_keyframe)
SELECT id, frame_number, pos_x, pos_y, true, true
FROM public.vehicle_360_hotspots
ON CONFLICT (hotspot_id, frame_number) DO NOTHING;

INSERT INTO public.vehicle_360_damage_marker_positions (marker_id, frame_number, pos_x, pos_y, visible, is_keyframe)
SELECT id, frame_number, pos_x, pos_y, true, true
FROM public.vehicle_360_damage_markers
ON CONFLICT (marker_id, frame_number) DO NOTHING;

NOTIFY pgrst, 'reload schema';
