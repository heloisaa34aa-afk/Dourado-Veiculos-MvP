-- ========================================================================
-- DOURADO VEÍCULOS - CANONICAL DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Clean, unified, single-source-of-truth schema
-- ========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. CATEGORIES
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  icon text,
  color text,
  "order" integer default 0
);

-- 2. VEHICLES
create table if not exists vehicles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  brand text not null,
  model text not null,
  version text,
  year text not null,
  price numeric not null,
  mileage numeric not null default 0,
  fuel text,
  transmission text,
  color text,
  description text,
  city text default 'São Paulo',
  state text default 'SP',
  category text,
  status text default 'Disponível', -- 'Disponível', 'Vendido', 'Reservado'
  featured boolean default false,
  new_price numeric,
  sold boolean default false,
  whatsapp_clicks integer default 0,
  views integer default 0,
  cover_image text
);

-- 3. VEHICLE_IMAGES (Gallery and Technical Photos)
create table if not exists vehicle_images (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  image_url text not null,
  image_type text default 'gallery', -- 'cover', 'gallery', '360', 'technical'
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. VEHICLE_FEATURES
create table if not exists vehicle_features (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  feature text not null,
  unique (vehicle_id, feature)
);

-- 5. VEHICLE_360_PROJECTS
create table if not exists public.vehicle_360_projects (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    status text not null default 'draft' check (status in ('draft', 'processing', 'completed')),
    frame_count integer not null default 0,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    unique(vehicle_id)
);

-- 6. VEHICLE_360_FRAMES
create table if not exists public.vehicle_360_frames (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.vehicle_360_projects(id) on delete cascade,
    frame_number integer not null check (frame_number >= 0),
    image_url text not null,
    storage_path text,
    original_filename text,
    width integer check (width is null or width > 0),
    height integer check (height is null or height > 0),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    unique(project_id, frame_number)
);

-- 7. VEHICLE_360_HOTSPOTS
create table if not exists public.vehicle_360_hotspots (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.vehicle_360_projects(id) on delete cascade,
    title text not null,
    description text,
    frame_number integer not null check (frame_number >= 0),
    pos_x numeric not null check (pos_x >= 0 and pos_x <= 100),
    pos_y numeric not null check (pos_y >= 0 and pos_y <= 100),
    image_url text,
    storage_path text,
    active boolean not null default true,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 8. VEHICLE_360_DAMAGE_MARKERS
create table if not exists public.vehicle_360_damage_markers (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.vehicle_360_projects(id) on delete cascade,
    title text not null,
    description text,
    category text not null default 'Outro',
    frame_number integer not null check (frame_number >= 0),
    pos_x numeric not null check (pos_x >= 0 and pos_x <= 100),
    pos_y numeric not null check (pos_y >= 0 and pos_y <= 100),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 9. VEHICLE_360_DAMAGE_IMAGES
create table if not exists public.vehicle_360_damage_images (
    id uuid primary key default gen_random_uuid(),
    marker_id uuid not null references public.vehicle_360_damage_markers(id) on delete cascade,
    image_url text not null,
    storage_path text,
    order_index integer not null default 0,
    created_at timestamptz not null default timezone('utc'::text, now()),
    unique(marker_id, order_index)
);

-- 10. VEHICLE_VIDEOS
create table if not exists vehicle_videos (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  video_url text not null,
  provider text default 'youtube', -- 'upload', 'youtube'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. LEADS
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  message text,
  status text default 'Pendente' -- 'Pendente', 'Respondido', 'Arquivado'
);

-- 12. QUOTES
create table if not exists quotes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  city text,
  status text default 'Pendente',
  user_id uuid
);

-- 13. SCHEDULES
create table if not exists schedules (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  date text not null,
  time text not null,
  status text default 'Pendente',
  user_id uuid
);

-- 14. FAVORITES
create table if not exists favorites (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid not null,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  unique (user_id, vehicle_id)
);

-- 15. ADMINS
create table if not exists admins (
  id uuid primary key,
  name text not null,
  email text not null unique,
  role text default 'Vendedor',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 16. SETTINGS
create table if not exists settings (
  id text primary key default 'default',
  company_name text default 'Dourado Veículos',
  logo text,
  phone text default '(11) 99999-9999',
  whatsapp text default '(11) 99999-9999',
  instagram text,
  facebook text,
  address text default 'Av. Paulista, 1000 - São Paulo, SP',
  hours text default 'Segunda a Sexta: 9h às 18h | Sábado: 9h às 13h',
  primary_color text default '#ef4444',
  secondary_color text default '#0f172a'
);

-- 17. VEHICLE_INSPECTION_ITEMS (Technical Inspection Checklist)
create table if not exists vehicle_inspection_items (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references vehicles(id) on delete cascade not null,
  category text not null, -- 'Exterior' or 'Interior'
  item_name text not null,
  status text default 'Não avaliado', -- 'Não avaliado', 'OK', 'Atenção', 'Problema'
  notes text default '',
  photos jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ========================================================================
-- SEED DEFAULTS
-- ========================================================================

insert into settings (id, company_name, phone, whatsapp, address, hours, primary_color, secondary_color)
values ('default', 'Dourado Veículos', '(11) 99999-9999', '(11) 99999-9999', 'Av. Paulista, 1000 - São Paulo, SP', 'Segunda a Sexta: 9h às 18h | Sábado: 9h às 13h', '#ef4444', '#0f172a')
on conflict (id) do nothing;

insert into categories (name, icon, color, "order") values
  ('Hatch', '🚗', 'bg-blue-500', 1),
  ('SUV', '🚙', 'bg-green-500', 2),
  ('Sedan', '🚘', 'bg-indigo-500', 3),
  ('Picape', '🛻', 'bg-amber-500', 4),
  ('Utilitário', '🚐', 'bg-purple-500', 5),
  ('Popular', '🏎️', 'bg-red-500', 6)
on conflict (name) do nothing;

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================

alter table categories enable row level security;
alter table vehicles enable row level security;
alter table vehicle_images enable row level security;
alter table vehicle_features enable row level security;
alter table vehicle_360_projects enable row level security;
alter table vehicle_360_frames enable row level security;
alter table vehicle_360_hotspots enable row level security;
alter table vehicle_360_damage_markers enable row level security;
alter table vehicle_360_damage_images enable row level security;
alter table vehicle_videos enable row level security;
alter table leads enable row level security;
alter table quotes enable row level security;
alter table schedules enable row level security;
alter table favorites enable row level security;
alter table admins enable row level security;
alter table settings enable row level security;
alter table vehicle_inspection_items enable row level security;

-- Public read policies
create policy "Allow public read access to categories" on categories for select using (true);
create policy "Allow public read access to vehicles" on vehicles for select using (true);
create policy "Allow public read access to vehicle_images" on vehicle_images for select using (true);
create policy "Allow public read access to vehicle_features" on vehicle_features for select using (true);
create policy "Allow public read access to vehicle_360_projects" on vehicle_360_projects for select using (true);
create policy "Allow public read access to vehicle_360_frames" on vehicle_360_frames for select using (true);
create policy "Allow public read access to vehicle_360_hotspots" on vehicle_360_hotspots for select using (true);
create policy "Allow public read access to vehicle_360_damage_markers" on vehicle_360_damage_markers for select using (true);
create policy "Allow public read access to vehicle_360_damage_images" on vehicle_360_damage_images for select using (true);
create policy "Allow public read access to vehicle_videos" on vehicle_videos for select using (true);
create policy "Allow public read access to settings" on settings for select using (true);
create policy "Allow public read access to vehicle_inspection_items" on vehicle_inspection_items for select using (true);

-- Public write/manage policies for application operation
create policy "Allow public manage vehicles" on vehicles for all using (true);
create policy "Allow public manage vehicle_images" on vehicle_images for all using (true);
create policy "Allow public manage vehicle_features" on vehicle_features for all using (true);
create policy "Allow public manage vehicle_360_projects" on vehicle_360_projects for all using (true);
create policy "Allow public manage vehicle_360_frames" on vehicle_360_frames for all using (true);
create policy "Allow public manage vehicle_360_hotspots" on vehicle_360_hotspots for all using (true);
create policy "Allow public manage vehicle_360_damage_markers" on vehicle_360_damage_markers for all using (true);
create policy "Allow public manage vehicle_360_damage_images" on vehicle_360_damage_images for all using (true);
create policy "Allow public manage vehicle_videos" on vehicle_videos for all using (true);
create policy "Allow public manage leads" on leads for all using (true);
create policy "Allow public manage quotes" on quotes for all using (true);
create policy "Allow public manage schedules" on schedules for all using (true);
create policy "Allow public manage favorites" on favorites for all using (true);
create table if not exists admins (id uuid primary key);
create policy "Allow public manage admins" on admins for all using (true);
create policy "Allow public manage settings" on settings for all using (true);
create policy "Allow public manage vehicle_inspection_items" on vehicle_inspection_items for all using (true);
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
