BEGIN;

CREATE TABLE IF NOT EXISTS public.site_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN ('top_bar', 'home_inline', 'popup')),
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  desktop_image_url TEXT,
  desktop_storage_path TEXT,
  mobile_image_url TEXT,
  mobile_storage_path TEXT,
  cta_label TEXT,
  cta_url TEXT,
  background_color TEXT NOT NULL DEFAULT '#0f172a',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_dismissible BOOLEAN NOT NULL DEFAULT true,
  show_once_per_session BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT site_banners_schedule_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CONSTRAINT site_banners_content_check CHECK (title <> '' OR desktop_image_url IS NOT NULL OR mobile_image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_site_banners_public
  ON public.site_banners (placement, is_active, priority DESC);

ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

DROP POLICY IF EXISTS "Public can view active site banners" ON public.site_banners;
CREATE POLICY "Public can view active site banners"
ON public.site_banners FOR SELECT
USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= NOW())
  AND (ends_at IS NULL OR ends_at > NOW())
);

DROP POLICY IF EXISTS "Admins can view all site banners" ON public.site_banners;
CREATE POLICY "Admins can view all site banners"
ON public.site_banners FOR SELECT TO authenticated
USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can create site banners" ON public.site_banners;
CREATE POLICY "Admins can create site banners"
ON public.site_banners FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update site banners" ON public.site_banners;
CREATE POLICY "Admins can update site banners"
ON public.site_banners FOR UPDATE TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete site banners" ON public.site_banners;
CREATE POLICY "Admins can delete site banners"
ON public.site_banners FOR DELETE TO authenticated
USING (public.current_user_is_admin());

GRANT SELECT ON public.site_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_banners TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view banner images" ON storage.objects;
CREATE POLICY "Public can view banner images"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Admins can upload banner images" ON storage.objects;
CREATE POLICY "Admins can upload banner images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'banners'
  AND public.current_user_is_admin()
);

DROP POLICY IF EXISTS "Admins can update banner images" ON storage.objects;
CREATE POLICY "Admins can update banner images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'banners'
  AND public.current_user_is_admin()
);

DROP POLICY IF EXISTS "Admins can delete banner images" ON storage.objects;
CREATE POLICY "Admins can delete banner images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'banners'
  AND public.current_user_is_admin()
);

COMMIT;
NOTIFY pgrst, 'reload schema';
