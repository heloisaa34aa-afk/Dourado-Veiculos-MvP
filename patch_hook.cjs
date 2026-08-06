const fs = require('fs');
let content = fs.readFileSync('src/hooks/useVehicle360.ts', 'utf8');

// replace createHotspot
const newCreateHotspot = `  const createHotspot = async (data: {
    frameNumber: number;
    posX: number;
    posY: number;
    title: string;
    description?: string;
    file?: File;
  }): Promise<string> => {
    if (!project) throw new Error("Projeto não carregado");
    setUploading(true);
    try {
      let imageUrl, storagePath;
      if (data.file) {
        const upload = await vehicle360Storage.uploadHotspotImage(vehicleId, project.id, data.file);
        imageUrl = upload.imageUrl;
        storagePath = upload.storagePath;
      }
      const id = await vehicle360Service.createHotspot({
        projectId: project.id,
        title: data.title,
        description: data.description,
        frameNumber: data.frameNumber,
        posX: data.posX,
        posY: data.posY,
        active: true,
        imageUrl,
        storagePath
      });
      await vehicle360Service.touchProject(project.id);
      return id;
    } finally {
      setUploading(false);
    }
  };`;

content = content.replace(/  const createHotspot = async \([\s\S]*?setUploading\(false\);\n    \}\n  \};/, newCreateHotspot);

// replace createDamageMarker
const newCreateDamage = `  const createDamageMarker = async (data: {
    frameNumber: number;
    posX: number;
    posY: number;
    title: string;
    description?: string;
    category: string;
    files?: File[];
  }): Promise<string> => {
    if (!project) throw new Error("Projeto não carregado");
    setUploading(true);
    try {
      const images = [];
      if (data.files && data.files.length > 0) {
        for (let i = 0; i < data.files.length; i++) {
          const file = data.files[i];
          const upload = await vehicle360Storage.uploadDamageImage(vehicleId, project.id, file);
          images.push({
            imageUrl: upload.imageUrl,
            storagePath: upload.storagePath,
            orderIndex: i
          });
        }
      }
      const id = await vehicle360Service.createDamageMarker({
        projectId: project.id,
        title: data.title,
        description: data.description,
        category: data.category,
        frameNumber: data.frameNumber,
        posX: data.posX,
        posY: data.posY,
        active: true,
        images
      });
      await vehicle360Service.touchProject(project.id);
      return id;
    } finally {
      setUploading(false);
    }
  };`;

content = content.replace(/  const createDamageMarker = async \([\s\S]*?setUploading\(false\);\n    \}\n  \};/, newCreateDamage);

fs.writeFileSync('src/hooks/useVehicle360.ts', content);
