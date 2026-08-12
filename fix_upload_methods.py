import sys

with open('src/services/vehicle360.service.ts', 'r') as f:
    text = f.read()

# Add addFrames to service
add_frames_method = """
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
"""

text = text.replace("async reorderFrames(", add_frames_method + "\n  async reorderFrames(")

with open('src/services/vehicle360.service.ts', 'w') as f:
    f.write(text)

# Fix useVehicle360.ts
with open('src/hooks/useVehicle360.ts', 'r') as f:
    text = f.read()

old_upload_impl = """      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const frameNumber = startIndex + i;
        const path = `360/${project.id}/${Date.now()}_frame_${frameNumber}.jpg`;
        const url = await vehicle360Storage.uploadFile(path, file);
        
        await vehicle360Service.addFrame(project.id, {
          frameNumber: frameNumber,
          imageUrl: url,
          storagePath: path
        });
        
        successCount++;
        setUploadProgress({ current: successCount, total: files.length });
      }"""

new_upload_impl = """      let successCount = 0;
      const newFrames: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const frameNumber = startIndex + i;
        const { imageUrl, storagePath } = await vehicle360Storage.uploadFrame(vehicleId, project.id, file, `${Date.now()}_frame_${frameNumber}.jpg`);
        
        newFrames.push({
          frameNumber,
          imageUrl,
          storagePath
        });
        
        successCount++;
        setUploadProgress({ current: successCount, total: files.length });
      }
      
      if (mode === 'replace') {
        await vehicle360Service.replaceProjectFrames(project.id, newFrames);
      } else {
        await vehicle360Service.addFrames(project.id, newFrames);
      }"""

text = text.replace(old_upload_impl, new_upload_impl)
text = text.replace("await vehicle360Service.clearFrames(project.id);", "")

with open('src/hooks/useVehicle360.ts', 'w') as f:
    f.write(text)
