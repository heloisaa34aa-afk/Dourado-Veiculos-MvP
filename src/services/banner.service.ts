import { supabase } from '../lib/supabase';

export type BannerPlacement = 'top_bar' | 'home_inline' | 'popup';

export interface SiteBanner {
  id: string;
  name: string;
  placement: BannerPlacement;
  title: string;
  subtitle: string;
  desktop_image_url: string | null;
  desktop_storage_path: string | null;
  mobile_image_url: string | null;
  mobile_storage_path: string | null;
  cta_label: string | null;
  cta_url: string | null;
  background_color: string;
  text_color: string;
  is_active: boolean;
  is_dismissible: boolean;
  show_once_per_session: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export type BannerInput = Omit<SiteBanner, 'id' | 'created_at' | 'updated_at'>;

function throwIfError(error: { message?: string } | null) {
  if (error) throw new Error(error.message || 'Não foi possível concluir a operação com o banner.');
}

export const bannerService = {
  async listPublic(): Promise<SiteBanner[]> {
    const { data, error } = await supabase
      .from('site_banners')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    throwIfError(error);
    return (data ?? []) as SiteBanner[];
  },

  async listAll(): Promise<SiteBanner[]> {
    const { data, error } = await supabase
      .from('site_banners')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    throwIfError(error);
    return (data ?? []) as SiteBanner[];
  },

  async save(input: BannerInput, id?: string): Promise<SiteBanner> {
    const payload = { ...input, updated_at: new Date().toISOString() };
    const query = id
      ? supabase.from('site_banners').update(payload).eq('id', id)
      : supabase.from('site_banners').insert(payload);
    const { data, error } = await query.select('*').single();
    throwIfError(error);
    return data as SiteBanner;
  },

  async remove(banner: SiteBanner): Promise<void> {
    const { error } = await supabase.from('site_banners').delete().eq('id', banner.id);
    throwIfError(error);
    const paths = [banner.desktop_storage_path, banner.mobile_storage_path].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from('banners').remove(paths);
  },

  async uploadImage(file: File, variant: 'desktop' | 'mobile') {
    if (!file.type.startsWith('image/')) throw new Error('Selecione uma imagem válida.');
    if (file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 8 MB.');
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Entre novamente com uma conta administrativa.');
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${auth.user.id}/${Date.now()}-${variant}.${extension}`;
    const { error } = await supabase.storage.from('banners').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    throwIfError(error);
    const { data } = supabase.storage.from('banners').getPublicUrl(path);
    return { url: data.publicUrl, path };
  },
};
