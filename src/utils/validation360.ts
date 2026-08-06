import { Vehicle360Project, Vehicle360Frame } from '../types';

export const validation360 = {
  validImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  minFrames: 24,
  maxFrames: 96,

  validateImageFormat(file: File): boolean {
    return this.validImageTypes.includes(file.type);
  },

  extractNumberFromFilename(filename: string): number {
    const match = filename.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  },

  sortFilesNumerically(files: File[]): File[] {
    return [...files].sort((a, b) => {
      const numA = this.extractNumberFromFilename(a.name);
      const numB = this.extractNumberFromFilename(b.name);
      return numA - numB;
    });
  },

  hasDuplicates(files: File[]): boolean {
    const names = files.map(f => f.name);
    return new Set(names).size !== names.length;
  },

  validateSequence(frames: Vehicle360Frame[]): boolean {
    if (frames.length === 0) return false;
    const sorted = [...frames].sort((a, b) => a.frameNumber - b.frameNumber);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].frameNumber !== i) return false;
    }
    return true;
  },

  checklist360(project: Vehicle360Project, frames: Vehicle360Frame[]): { valid: boolean, errors: string[] } {
    const errors: string[] = [];
    
    if (!project) {
      errors.push("Projeto não encontrado.");
      return { valid: false, errors };
    }

    if (frames.length < this.minFrames) {
      errors.push(`Mínimo de ${this.minFrames} frames (atual: ${frames.length}).`);
    }

    if (frames.length > this.maxFrames) {
      errors.push(`Máximo de ${this.maxFrames} frames (atual: ${frames.length}).`);
    }

    if (!this.validateSequence(frames)) {
      errors.push("A sequência de frames não é contínua a partir de zero.");
    }

    const missingUrls = frames.filter(f => !f.imageUrl);
    if (missingUrls.length > 0) {
      errors.push(`${missingUrls.length} frame(s) sem imagem.`);
    }
    
    const uniqueFrames = new Set(frames.map(f => f.frameNumber));
    if (uniqueFrames.size !== frames.length) {
      errors.push("Existem frames duplicados (mesmo número).");
    }

    return { valid: errors.length === 0, errors };
  },

  async getImageDimensions(file: File): Promise<{ width: number, height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });
  }
};
