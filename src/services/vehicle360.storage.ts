import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'vehicles';

export const vehicle360Storage = {
  async uploadFrame(vehicleId: string, projectId: string, file: File, filename: string): Promise<{ imageUrl: string, storagePath: string }> {
    const storagePath = `360/${vehicleId}/${projectId}/frames/${filename}`;
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true
    });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return { imageUrl: publicUrl, storagePath };
  },

  async uploadHotspotImage(vehicleId: string, projectId: string, file: File): Promise<{ imageUrl: string, storagePath: string }> {
    const filename = `${crypto.randomUUID()}-${file.name}`;
    const storagePath = `360/${vehicleId}/${projectId}/hotspots/${filename}`;
    
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true
    });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return { imageUrl: publicUrl, storagePath };
  },

  async uploadDamageImage(vehicleId: string, projectId: string, file: File): Promise<{ imageUrl: string, storagePath: string }> {
    const filename = `${crypto.randomUUID()}-${file.name}`;
    const storagePath = `360/${vehicleId}/${projectId}/damages/${filename}`;
    
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true
    });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return { imageUrl: publicUrl, storagePath };
  },

  async deleteStorageObject(storagePath: string): Promise<void> {
    if (!storagePath) return;
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    if (error) throw error;
  },

  async deleteStorageObjects(storagePaths: string[]): Promise<void> {
    const validPaths = storagePaths.filter(Boolean);
    if (validPaths.length === 0) return;
    const { error } = await supabase.storage.from(BUCKET_NAME).remove(validPaths);
    if (error) throw error;
  },

  async deleteProjectStorage(vehicleId: string, projectId: string): Promise<void> {
    const prefix = `360/${vehicleId}/${projectId}/`;
    
    // We need to list all files in this prefix and its subdirectories
    // Supabase JS library doesn't easily list recursive, so we check known subfolders
    const folders = ['frames', 'hotspots', 'damages'];
    let allFiles: string[] = [];
    
    for (const folder of folders) {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list(`${prefix}${folder}`);
      if (data && !error) {
        allFiles.push(...data.map(f => `${prefix}${folder}/${f.name}`));
      }
    }
    
    if (allFiles.length > 0) {
      await this.deleteStorageObjects(allFiles);
    }
  }
};
