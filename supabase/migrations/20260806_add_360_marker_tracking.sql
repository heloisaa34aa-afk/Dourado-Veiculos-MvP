CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE vehicle_360_hotspot_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotspot_id UUID NOT NULL REFERENCES vehicle_360_hotspots(id) ON DELETE CASCADE,
    frame_number INTEGER NOT NULL,
    pos_x NUMERIC NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
    pos_y NUMERIC NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100),
    visible BOOLEAN NOT NULL DEFAULT true,
    is_keyframe BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotspot_id, frame_number)
);

CREATE TABLE vehicle_360_damage_marker_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    marker_id UUID NOT NULL REFERENCES vehicle_360_damage_markers(id) ON DELETE CASCADE,
    frame_number INTEGER NOT NULL,
    pos_x NUMERIC NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
    pos_y NUMERIC NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100),
    visible BOOLEAN NOT NULL DEFAULT true,
    is_keyframe BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(marker_id, frame_number)
);

-- Migração dos marcadores existentes
INSERT INTO vehicle_360_hotspot_positions (hotspot_id, frame_number, pos_x, pos_y, visible, is_keyframe)
SELECT id, frame_number, pos_x, pos_y, true, true
FROM vehicle_360_hotspots;

INSERT INTO vehicle_360_damage_marker_positions (marker_id, frame_number, pos_x, pos_y, visible, is_keyframe)
SELECT id, frame_number, pos_x, pos_y, true, true
FROM vehicle_360_damage_markers;
