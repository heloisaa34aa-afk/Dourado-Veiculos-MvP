import sys
import re

with open('src/utils/validation360.ts', 'r') as f:
    text = f.read()

old_content = """import { Vehicle360Project, Vehicle360Frame } from '../types';

export const validation360 = {
  validImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  minFrames: 24,
  maxFrames: 96,"""

new_content = """import { Vehicle360Project, Vehicle360Frame } from '../types';

export type Vehicle360ViewType = 'exterior' | 'interior';

export const FRAME_LIMITS = {
  exterior: {
    minimumToPublish: 24,
    recommended: 36,
    maximum: 96
  },
  interior: {
    minimumToPublish: 8,
    recommended: 12,
    maximum: 48
  }
} satisfies Record<Vehicle360ViewType, {
  minimumToPublish: number;
  recommended: number;
  maximum: number;
}>;

export const validation360 = {
  validImageTypes: ['image/jpeg', 'image/png', 'image/webp'],"""

text = text.replace(old_content, new_content)

old_checklist = """  checklist360(project: Vehicle360Project, frames: Vehicle360Frame[]): { valid: boolean, errors: string[] } {
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
  },"""

new_checklist = """  checklist360(project: Vehicle360Project | null | undefined, frames: Vehicle360Frame[], viewType: Vehicle360ViewType): { valid: boolean, errors: string[], warnings?: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
        
    if (!project) {
      errors.push("Projeto não encontrado.");
      return { valid: false, errors, warnings };
    }

    const limits = FRAME_LIMITS[viewType];

    if (frames.length < limits.minimumToPublish) {
      if (viewType === 'exterior') {
        errors.push(`A visão externa precisa de pelo menos ${limits.minimumToPublish} imagens para publicação.`);
      } else {
        errors.push(`A visão interna precisa de pelo menos ${limits.minimumToPublish} imagens para publicação.`);
      }
    } else if (frames.length < limits.recommended) {
      if (viewType === 'exterior') {
        warnings.push(`Para um giro mais fluido, recomendamos ${limits.recommended} imagens.`);
      } else {
        warnings.push(`Para um giro interno mais fluido, recomendamos de 12 a 16 imagens.`);
      }
    }

    if (frames.length > limits.maximum) {
      errors.push(`Máximo de ${limits.maximum} frames excedido (atual: ${frames.length}).`);
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

    return { valid: errors.length === 0, errors, warnings };
  },"""

text = text.replace(old_checklist, new_checklist)

with open('src/utils/validation360.ts', 'w') as f:
    f.write(text)

