import re

with open('src/hooks/useVehicle360.ts', 'r') as f:
    text = f.read()

pattern = r"  const uploadFrames = async \(files: File\[\]\) => \{[\s\S]*?setUploading\(false\);\n    \}\n  \};"

new_upload = """  const uploadFrames = async (files: File[], mode: 'replace' | 'append' = 'replace') => {
    if (!project) return;
    try {
      setUploading(true);
      setUploadProgress({ current: 0, total: files.length });

      let startIndex = 0;

      if (mode === 'replace') {
        if (project.frames && project.frames.length > 0) {
          for (const frame of project.frames) {
            if (frame.storagePath) {
              await vehicle360Storage.deleteStorageObject(frame.storagePath);
            }
          }
          await vehicle360Service.clearFrames(project.id);
        }
      } else {
        if (project.frames && project.frames.length > 0) {
          startIndex = Math.max(...project.frames.map(f => f.frameNumber)) + 1;
        }
      }

      let successCount = 0;
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
      }

      await loadProject();
      setCurrentFrame(mode === 'append' ? startIndex : 0);
    } catch(err: any) {
      setError(err);
      throw err;
    } finally {
      setUploading(false);
    }
  };"""

if re.search(pattern, text):
    text = re.sub(pattern, new_upload, text)
    with open('src/hooks/useVehicle360.ts', 'w') as f:
        f.write(text)
    print("Patched!")
else:
    print("Not found.")
