import { supabase } from '../lib/supabase';
import { 
  Vehicle360Project, 
  Vehicle360Frame, 
  Vehicle360Hotspot, 
  Vehicle360DamageMarker,
  Vehicle360DamageImage
} from '../types';

export const vehicle360Service = {
  // Public Viewer
  async getPublishedProjectByVehicleId(vehicleId: string): Promise<Vehicle360Project | null> {
    const { data: project, error } = await supabase
      .from('vehicle_360_projects')
      .select(`
        *,
        frames:vehicle_360_frames(*),
        hotspots:vehicle_360_hotspots(*),
        damage_markers:vehicle_360_damage_markers(
          *,
          images:vehicle_360_damage_images(*)
        )
      `)
      .eq('vehicle_id', vehicleId)
      .eq('status', 'completed')
      .maybeSingle();

    if (error) {
      console.error('Error fetching published project:', error);
      throw error;
    }

    if (!project) return null;

    // Convert snake_case to camelCase
    return {
      id: project.id,
      vehicleId: project.vehicle_id,
      status: project.status,
      frameCount: project.frame_count,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      frames: project.frames?.map((f: any) => ({
        id: f.id,
        projectId: f.project_id,
        frameNumber: f.frame_number,
        imageUrl: f.image_url,
        storagePath: f.storage_path,
        originalFilename: f.original_filename,
        width: f.width,
        height: f.height,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })) || [],
      hotspots: project.hotspots?.map((h: any) => ({
        id: h.id,
        projectId: h.project_id,
        title: h.title,
        description: h.description,
        frameNumber: h.frame_number,
        posX: h.pos_x,
        posY: h.pos_y,
        imageUrl: h.image_url,
        storagePath: h.storage_path,
        active: h.active,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
      })) || [],
      damageMarkers: project.damage_markers?.map((d: any) => ({
        id: d.id,
        projectId: d.project_id,
        title: d.title,
        description: d.description,
        category: d.category,
        frameNumber: d.frame_number,
        posX: d.pos_x,
        posY: d.pos_y,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        images: d.images?.map((i: any) => ({
          id: i.id,
          markerId: i.marker_id,
          imageUrl: i.image_url,
          storagePath: i.storage_path,
          orderIndex: i.order_index,
          createdAt: i.created_at,
        })) || []
      })) || []
    } as any;
  },

  // Admin
  async getProjectByVehicleId(vehicleId: string): Promise<Vehicle360Project | null> {
    const { data: project, error } = await supabase
      .from('vehicle_360_projects')
      .select(`
        *,
        frames:vehicle_360_frames(*),
        hotspots:vehicle_360_hotspots(*),
        damage_markers:vehicle_360_damage_markers(
          *,
          images:vehicle_360_damage_images(*)
        )
      `)
      .eq('vehicle_id', vehicleId)
      .maybeSingle();

    if (error) throw error;
    if (!project) return null;

    // Convert snake_case to camelCase
    return {
      id: project.id,
      vehicleId: project.vehicle_id,
      status: project.status,
      frameCount: project.frame_count,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      frames: project.frames?.map((f: any) => ({
        id: f.id,
        projectId: f.project_id,
        frameNumber: f.frame_number,
        imageUrl: f.image_url,
        storagePath: f.storage_path,
        originalFilename: f.original_filename,
        width: f.width,
        height: f.height,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })) || [],
      hotspots: project.hotspots?.map((h: any) => ({
        id: h.id,
        projectId: h.project_id,
        title: h.title,
        description: h.description,
        frameNumber: h.frame_number,
        posX: h.pos_x,
        posY: h.pos_y,
        imageUrl: h.image_url,
        storagePath: h.storage_path,
        active: h.active,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
      })) || [],
      damageMarkers: project.damage_markers?.map((d: any) => ({
        id: d.id,
        projectId: d.project_id,
        title: d.title,
        description: d.description,
        category: d.category,
        frameNumber: d.frame_number,
        posX: d.pos_x,
        posY: d.pos_y,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        images: d.images?.map((i: any) => ({
          id: i.id,
          markerId: i.marker_id,
          imageUrl: i.image_url,
          storagePath: i.storage_path,
          orderIndex: i.order_index,
          createdAt: i.created_at,
        })) || []
      })) || []
    } as any;
  },

  async createProject(vehicleId: string): Promise<Vehicle360Project> {
    const existing = await this.getProjectByVehicleId(vehicleId);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('vehicle_360_projects')
      .insert({ vehicle_id: vehicleId, status: 'draft' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const concurrentExisting = await this.getProjectByVehicleId(vehicleId);
        if (concurrentExisting) return concurrentExisting;
      }
      throw error;
    }
    
    return {
      id: data.id,
      vehicleId: data.vehicle_id,
      status: data.status,
      frameCount: data.frame_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      frames: [],
    };
  },

  async updateProjectStatus(projectId: string, status: 'draft' | 'processing' | 'completed'): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_projects')
      .update({ status })
      .eq('id', projectId);

    if (error) throw error;
  },

  async replaceProjectFrames(projectId: string, frames: Omit<Vehicle360Frame, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    // 1. Delete existing frames
    const { error: deleteError } = await supabase
      .from('vehicle_360_frames')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) throw deleteError;

    // 2. Insert new frames
    if (frames.length > 0) {
      const { error: insertError } = await supabase
        .from('vehicle_360_frames')
        .insert(frames.map(f => ({
          project_id: projectId,
          frame_number: f.frameNumber,
          image_url: f.imageUrl,
          storage_path: f.storagePath,
          original_filename: f.originalFilename,
          width: f.width,
          height: f.height,
        })));

      if (insertError) throw insertError;
    }
  },

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  },

  async createHotspot(hotspot: Omit<Vehicle360Hotspot, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_hotspots')
      .insert({
        project_id: hotspot.projectId,
        title: hotspot.title,
        description: hotspot.description,
        frame_number: hotspot.frameNumber,
        pos_x: hotspot.posX,
        pos_y: hotspot.posY,
        image_url: hotspot.imageUrl,
        storage_path: hotspot.storagePath,
        active: hotspot.active
      });

    if (error) throw error;
  },

  async deleteHotspot(hotspotId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_hotspots')
      .delete()
      .eq('id', hotspotId);

    if (error) throw error;
  },

  async createDamageMarker(
    marker: Omit<Vehicle360DamageMarker, 'id' | 'createdAt' | 'updatedAt' | 'images'>,
    images: { imageUrl: string, storagePath?: string }[]
  ): Promise<void> {
    const { data: insertedMarker, error: markerError } = await supabase
      .from('vehicle_360_damage_markers')
      .insert({
        project_id: marker.projectId,
        title: marker.title,
        description: marker.description,
        category: marker.category,
        frame_number: marker.frameNumber,
        pos_x: marker.posX,
        pos_y: marker.posY,
      })
      .select()
      .single();

    if (markerError) throw markerError;

    if (images.length > 0) {
      const { error: imagesError } = await supabase
        .from('vehicle_360_damage_images')
        .insert(images.map((img, idx) => ({
          marker_id: insertedMarker.id,
          image_url: img.imageUrl,
          storage_path: img.storagePath,
          order_index: idx
        })));

      if (imagesError) throw imagesError;
    }
  },

  async deleteDamageMarker(markerId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_damage_markers')
      .delete()
      .eq('id', markerId);

    if (error) throw error;
  },
  

};
