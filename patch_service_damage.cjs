const fs = require('fs');
let content = fs.readFileSync('src/services/vehicle360.service.ts', 'utf8');

content = content.replace(
  "  async createDamageMarker(\n    marker: Omit<Vehicle360DamageMarker, 'id' | 'createdAt' | 'updatedAt' | 'images'>,\n    images: { imageUrl: string, storagePath?: string }[]\n  ): Promise<void> {",
  "  async createDamageMarker(\n    marker: Omit<Vehicle360DamageMarker, 'id' | 'createdAt' | 'updatedAt' | 'images'>,\n    images: { imageUrl: string, storagePath?: string, orderIndex?: number }[]\n  ): Promise<string> {"
);

content = content.replace(
  "      if (imgError) throw imgError;\n    }\n  },",
  "      if (imgError) throw imgError;\n    }\n    return insertedMarker.id;\n  },"
);

fs.writeFileSync('src/services/vehicle360.service.ts', content);

let hook = fs.readFileSync('src/hooks/useVehicle360.ts', 'utf8');
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
      }, images);
      await vehicle360Service.touchProject(project.id);
      return id;
    } finally {
      setUploading(false);
    }
  };`;

hook = hook.replace(/  const createDamageMarker = async \([\s\S]*?setUploading\(false\);\n    \}\n  \};/, newCreateDamage);
fs.writeFileSync('src/hooks/useVehicle360.ts', hook);
