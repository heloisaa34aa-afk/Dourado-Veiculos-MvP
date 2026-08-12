import sys
import re

with open('src/hooks/useVehicle360.ts', 'r') as f:
    text = f.read()

old_remove = """  const removeFrame = async (frame: Vehicle360Frame) => {
    if (!project || !project.frames) return;
    setUploading(true); // Treat as upload to lock UI
    try {
      await vehicle360Service.removeFrame(project.id, frame.id);
      if (frame.storagePath) {
        await vehicle360Storage.deleteStorageObject(frame.storagePath);
      }
      await loadProject();
    } catch(err: any) {
      setError(err);
      throw err;
    } finally {
      setUploading(false);
    }
  };"""

new_remove = """  const removeFrame = async (frame: Vehicle360Frame) => {
    if (!project || !project.frames) return;
    setUploading(true); // Treat as upload to lock UI
    try {
      const response = await vehicle360Service.removeFrame(project.id, frame.id);
      if (response && response.storage_path) {
        try {
          await vehicle360Storage.deleteStorageObject(response.storage_path);
        } catch(e) {
          console.warn("Frame removido, mas o arquivo precisa de limpeza posterior.", e);
        }
      }
      
      const updatedProject = await vehicle360Service.getProjectByVehicleId(vehicleId);
      if (updatedProject && updatedProject.status === 'completed') {
        const { valid } = validation360.checklist360(updatedProject, updatedProject.frames || [], viewType);
        if (!valid) {
          await vehicle360Service.unpublishProject(updatedProject.id);
          alert("O projeto voltou para rascunho porque ficou abaixo do mínimo de publicação.");
        }
      }

      await loadProject();
      if (currentFrame >= (response?.remaining_frames || 1)) {
        setCurrentFrame(Math.max(0, (response?.remaining_frames || 1) - 1));
      }
    } catch(err: any) {
      setError(err);
      alert(err.message || "Erro ao excluir o frame");
      throw err;
    } finally {
      setUploading(false);
    }
  };"""

text = text.replace(old_remove, new_remove)

with open('src/hooks/useVehicle360.ts', 'w') as f:
    f.write(text)

