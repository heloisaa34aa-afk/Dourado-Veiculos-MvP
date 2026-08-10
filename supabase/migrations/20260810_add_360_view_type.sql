-- Add view_type column to vehicle_360_projects
ALTER TABLE vehicle_360_projects 
ADD COLUMN IF NOT EXISTS view_type TEXT NOT NULL DEFAULT 'exterior' CHECK (view_type IN ('exterior', 'interior'));

-- Drop the old unique constraint on vehicle_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'vehicle_360_projects_vehicle_id_key'
        AND table_name = 'vehicle_360_projects'
    ) THEN
        ALTER TABLE vehicle_360_projects DROP CONSTRAINT vehicle_360_projects_vehicle_id_key;
    END IF;
END $$;

-- Add new unique constraint for (vehicle_id, view_type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'vehicle_360_projects_vehicle_view_key'
        AND table_name = 'vehicle_360_projects'
    ) THEN
        ALTER TABLE vehicle_360_projects ADD CONSTRAINT vehicle_360_projects_vehicle_view_key UNIQUE (vehicle_id, view_type);
    END IF;
END $$;
