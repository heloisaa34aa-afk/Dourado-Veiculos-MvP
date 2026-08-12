import { supabase } from '../lib/supabase';
import { 
  Vehicle360Project, 
  Vehicle360Frame, 
  Vehicle360Hotspot, 
  Vehicle360DamageMarker,
  Vehicle360DamageImage
} from '../types';


export function normalizeMarkerPosition(position: any) {
  return {
    frameNumber: Number(position.frameNumber),
    posX: Number(position.posX),
    posY: Number(position.posY),
    visible: typeof position.visible === 'boolean' ? position.visible : true,
    isKeyframe: typeof position.isKeyframe === 'boolean' ? position.isKeyframe : false,
  };
}

export const vehicle360Service = {
  // Public Viewer
  async getPublishedProjectByVehicleId(vehicleId: string, viewType: 'exterior' | 'interior' = 'exterior'): Promise<Vehicle360Project | null> {
    const { data: project, error } = await supabase
      .from('vehicle_360_projects')
      .select(`
        *,
        frames:vehicle_360_frames(*),
        hotspots:vehicle_360_hotspots(*, positions:vehicle_360_hotspot_positions(*)),
        damage_markers:vehicle_360_damage_markers(
          *,
          images:vehicle_360_damage_images(*),
          positions:vehicle_360_damage_marker_positions(*)
        )
      `)
      .eq('vehicle_id', vehicleId)
      .eq('view_type', viewType)
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
      viewType: project.view_type as 'exterior' | 'interior' || 'exterior',
      
      
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
        positions: h.positions?.map((p: any) => ({
          id: p.id,
          frameNumber: p.frame_number,
          posX: p.pos_x,
          posY: p.pos_y,
          visible: p.visible,
          isKeyframe: p.is_keyframe,
        })) || []
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
        })) || [],
        positions: d.positions?.map((p: any) => ({
          id: p.id,
          frameNumber: p.frame_number,
          posX: p.pos_x,
          posY: p.pos_y,
          visible: p.visible,
          isKeyframe: p.is_keyframe,
        })) || []
      })) || []
    } as any;
  },

  // Admin
  async getProjectByVehicleId(vehicleId: string, viewType: 'exterior' | 'interior' = 'exterior'): Promise<Vehicle360Project | null> {
    const { data: project, error } = await supabase
      .from('vehicle_360_projects')
      .select(`
        *,
        frames:vehicle_360_frames(*),
        hotspots:vehicle_360_hotspots(*, positions:vehicle_360_hotspot_positions(*)),
        damage_markers:vehicle_360_damage_markers(
          *,
          images:vehicle_360_damage_images(*),
          positions:vehicle_360_damage_marker_positions(*)
        )
      `)
      .eq('vehicle_id', vehicleId)
      .eq('view_type', viewType)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        throw new Error("Erro de banco de dados: A tabela de rastreamento de marcadores 360 não existe. Por favor, aplique as migrations pendentes no Supabase.");
      }
      throw error;
    }
    if (!project) return null;

    // Convert snake_case to camelCase
    return {
      id: project.id,
      vehicleId: project.vehicle_id,
      viewType: project.view_type as 'exterior' | 'interior' || 'exterior',
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
        positions: h.positions?.map((p: any) => ({
          id: p.id,
          frameNumber: p.frame_number,
          posX: p.pos_x,
          posY: p.pos_y,
          visible: p.visible,
          isKeyframe: p.is_keyframe,
        })) || []
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
        })) || [],
        positions: d.positions?.map((p: any) => ({
          id: p.id,
          frameNumber: p.frame_number,
          posX: p.pos_x,
          posY: p.pos_y,
          visible: p.visible,
          isKeyframe: p.is_keyframe,
        })) || []
      })) || []
    } as any;
  },

  async createProject(vehicleId: string, viewType: 'exterior' | 'interior' = 'exterior'): Promise<Vehicle360Project> {
    const existing = await this.getProjectByVehicleId(vehicleId, viewType);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('vehicle_360_projects')
      .insert({ vehicle_id: vehicleId, view_type: viewType, status: 'draft' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const concurrentExisting = await this.getProjectByVehicleId(vehicleId, viewType);
        if (concurrentExisting) return concurrentExisting;
      }
      throw error;
    }
    
    return {
      id: data.id,
      vehicleId: data.vehicle_id,
      viewType: data.view_type as 'exterior' | 'interior' || 'exterior',
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

  async touchProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', projectId);
    
    if (error) throw error;
  },

  async replaceProjectFrames(projectId: string, frames: Omit<Vehicle360Frame, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    // To safely replace all frames without transaction:
    // 1. Insert new frames with offset frame_number to avoid unique constraint
    const offset = 10000;
    if (frames.length > 0) {
      const { error: insertError } = await supabase
        .from('vehicle_360_frames')
        .insert(frames.map((f, i) => ({
          project_id: projectId,
          frame_number: i + offset, // Temporarily high number
          image_url: f.imageUrl,
          storage_path: f.storagePath,
          original_filename: f.originalFilename,
          width: f.width,
          height: f.height,
        })));

      if (insertError) throw insertError;
    }

    // 2. Delete old frames (those with frame_number < offset)
    const { error: deleteError } = await supabase
      .from('vehicle_360_frames')
      .delete()
      .eq('project_id', projectId)
      .lt('frame_number', offset);

    if (deleteError) throw deleteError;

    // 3. Update new frames back to normal sequence
    // Supabase JS doesn't have bulk update easily with different values, but since we just need to subtract offset:
    // It's actually easier if we delete first, but that risks empty state if insert fails.
    // Instead of doing multiple calls, we can fetch the inserted ones and update them, or just rely on a fallback.
    // Since we need to update them one by one without a custom function, let's fetch them:
    const { data: newFrames } = await supabase.from('vehicle_360_frames').select('id, frame_number').eq('project_id', projectId).gte('frame_number', offset);
    if (newFrames && newFrames.length > 0) {
      for (const f of newFrames) {
        await supabase.from('vehicle_360_frames').update({ frame_number: f.frame_number - offset }).eq('id', f.id);
      }
    }
  },

  async replaceFrame(frameId: string, updates: Partial<Vehicle360Frame>): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_frames')
      .update({
        image_url: updates.imageUrl,
        storage_path: updates.storagePath,
        original_filename: updates.originalFilename,
        width: updates.width,
        height: updates.height,
      })
      .eq('id', frameId);
      
    if (error) throw error;
  },

  async removeFrame(projectId: string, frameId: string): Promise<{deleted_frame_id: string, deleted_frame_number: number, storage_path: string, remaining_frames: number, project_status: string, was_unpublished: boolean}> {
    const { data, error } = await supabase.rpc('remove_vehicle_360_frame', {
      p_project_id: projectId,
      p_frame_id: frameId
    });
    if (error) throw error;
    return data;
  },

  
  async addFrames(projectId: string, frames: Omit<Vehicle360Frame, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    if (frames.length === 0) return;
    const { error } = await supabase
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
    if (error) throw error;
    await this.touchProject(projectId);
  },

  async reorderFrames(projectId: string, orderedFrames: Vehicle360Frame[]): Promise<void> {
    const offset = 10000;
    // Step 1: Push all to high numbers to avoid unique constraint on (project_id, frame_number)
    for (let i = 0; i < orderedFrames.length; i++) {
      await supabase.from('vehicle_360_frames').update({ frame_number: i + offset }).eq('id', orderedFrames[i].id);
    }
    // Step 2: Bring back to 0-based
    for (let i = 0; i < orderedFrames.length; i++) {
      await supabase.from('vehicle_360_frames').update({ frame_number: i }).eq('id', orderedFrames[i].id);
    }
    await this.touchProject(projectId);
  },

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  },

  async createHotspot(hotspot: Omit<Vehicle360Hotspot, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data: inserted, error } = await supabase
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
      })
      .select()
      .single();

    if (error) throw error;
    
    const { error: posError } = await supabase
      .from('vehicle_360_hotspot_positions')
      .insert({
        hotspot_id: inserted.id,
        frame_number: hotspot.frameNumber,
        pos_x: hotspot.posX,
        pos_y: hotspot.posY,
        visible: true,
        is_keyframe: true
      });
      
    if (posError) throw posError;
    return inserted.id;
  },

  async deleteHotspot(hotspotId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_hotspots')
      .delete()
      .eq('id', hotspotId);

    if (error) throw error;
  },

  async updateHotspot(hotspotId: string, updates: Partial<Vehicle360Hotspot>): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_hotspots')
      .update({
        title: updates.title,
        description: updates.description,
        pos_x: updates.posX,
        pos_y: updates.posY,
        active: updates.active,
        image_url: updates.imageUrl,
        storage_path: updates.storagePath,
      })
      .eq('id', hotspotId);

    if (error) throw error;
  },

  async repositionHotspot(hotspotId: string, posX: number, posY: number): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_hotspots')
      .update({ pos_x: posX, pos_y: posY })
      .eq('id', hotspotId);
      
    if (error) throw error;
  },

  async createDamageMarker(
    marker: Omit<Vehicle360DamageMarker, 'id' | 'createdAt' | 'updatedAt' | 'images'>,
    images: { imageUrl: string, storagePath?: string, orderIndex?: number }[]
  ): Promise<string> {
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

    const { error: posError } = await supabase
      .from('vehicle_360_damage_marker_positions')
      .insert({
        marker_id: insertedMarker.id,
        frame_number: marker.frameNumber,
        pos_x: marker.posX,
        pos_y: marker.posY,
        visible: true,
        is_keyframe: true
      });
      
    if (posError) throw posError;

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
    return insertedMarker.id;
  },

  async updateDamageMarker(markerId: string, updates: Partial<Vehicle360DamageMarker>): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_damage_markers')
      .update({
        title: updates.title,
        description: updates.description,
        category: updates.category,
        pos_x: updates.posX,
        pos_y: updates.posY,
      })
      .eq('id', markerId);
      
    if (error) throw error;
  },

  async repositionDamageMarker(markerId: string, posX: number, posY: number): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_damage_markers')
      .update({ pos_x: posX, pos_y: posY })
      .eq('id', markerId);
      
    if (error) throw error;
  },

  async deleteDamageMarker(markerId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicle_360_damage_markers')
      .delete()
      .eq('id', markerId);

    if (error) throw error;
  },

  async replaceHotspotPositions(hotspotId: string, positions: any[]): Promise<void> {
    const normalized = positions.map(normalizeMarkerPosition);
    
    // Upsert new positions
    if (normalized.length > 0) {
      const { error: upsertError } = await supabase
        .from('vehicle_360_hotspot_positions')
        .upsert(
          normalized.map(p => ({
            hotspot_id: hotspotId,
            frame_number: p.frameNumber,
            pos_x: p.posX,
            pos_y: p.posY,
            visible: p.visible,
            is_keyframe: p.isKeyframe
          })),
          { onConflict: 'hotspot_id, frame_number' }
        );
      if (upsertError) throw upsertError;
    }

    // Delete removed positions
    const frameNumbers = normalized.map(p => p.frameNumber);
    const { error: delError } = await supabase
      .from('vehicle_360_hotspot_positions')
      .delete()
      .eq('hotspot_id', hotspotId)
      .not('frame_number', 'in', `(${frameNumbers.join(',')})`);
      
    if (delError && frameNumbers.length > 0) {
      // If there's an error deleting, at least we upserted
      console.error('Error deleting old hotspot positions', delError);
    } else if (frameNumbers.length === 0) {
       await supabase.from('vehicle_360_hotspot_positions').delete().eq('hotspot_id', hotspotId);
    }
  },

  async replaceDamagePositions(markerId: string, positions: any[]): Promise<void> {
    const normalized = positions.map(normalizeMarkerPosition);
    
    // Upsert new positions
    if (normalized.length > 0) {
      const { error: upsertError } = await supabase
        .from('vehicle_360_damage_marker_positions')
        .upsert(
          normalized.map(p => ({
            marker_id: markerId,
            frame_number: p.frameNumber,
            pos_x: p.posX,
            pos_y: p.posY,
            visible: p.visible,
            is_keyframe: p.isKeyframe
          })),
          { onConflict: 'marker_id, frame_number' }
        );
      if (upsertError) throw upsertError;
    }

    // Delete removed positions
    const frameNumbers = normalized.map(p => p.frameNumber);
    const { error: delError } = await supabase
      .from('vehicle_360_damage_marker_positions')
      .delete()
      .eq('marker_id', markerId)
      .not('frame_number', 'in', `(${frameNumbers.join(',')})`);
      
    if (delError && frameNumbers.length > 0) {
      console.error('Error deleting old damage positions', delError);
    } else if (frameNumbers.length === 0) {
       await supabase.from('vehicle_360_damage_marker_positions').delete().eq('marker_id', markerId);
    }
  },
};
