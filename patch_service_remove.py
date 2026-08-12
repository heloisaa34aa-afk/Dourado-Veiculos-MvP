import sys
import re

with open('src/services/vehicle360.service.ts', 'r') as f:
    text = f.read()

old_remove = """  async removeFrame(projectId: string, frameId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_vehicle_360_frame', {
      p_project_id: projectId,
      p_frame_id: frameId
    });
    if (error) throw error;
  },"""

new_remove = """  async removeFrame(projectId: string, frameId: string): Promise<{deleted_frame_id: string, deleted_frame_number: number, storage_path: string, remaining_frames: number}> {
    const { data, error } = await supabase.rpc('remove_vehicle_360_frame', {
      p_project_id: projectId,
      p_frame_id: frameId
    });
    if (error) throw error;
    return data;
  },"""

text = text.replace(old_remove, new_remove)

with open('src/services/vehicle360.service.ts', 'w') as f:
    f.write(text)

