import { describe, it, expect } from 'vitest';
import { validation360 } from './validation360';
import { Vehicle360Frame, Vehicle360Project } from '../types';

describe('validation360', () => {
  it('extractNumberFromFilename should extract numbers correctly', () => {
    expect(validation360.extractNumberFromFilename('image_01.jpg')).toBe(1);
    expect(validation360.extractNumberFromFilename('frame005.png')).toBe(5);
    expect(validation360.extractNumberFromFilename('no_number.webp')).toBe(0);
  });

  it('validateSequence should return true for continuous sequence from zero', () => {
    const frames: Vehicle360Frame[] = [
      { frameNumber: 0 } as Vehicle360Frame,
      { frameNumber: 1 } as Vehicle360Frame,
      { frameNumber: 2 } as Vehicle360Frame,
    ];
    expect(validation360.validateSequence(frames)).toBe(true);
  });

  it('validateSequence should return false for missing frames', () => {
    const frames: Vehicle360Frame[] = [
      { frameNumber: 0 } as Vehicle360Frame,
      { frameNumber: 2 } as Vehicle360Frame,
    ];
    expect(validation360.validateSequence(frames)).toBe(false);
  });

  it('checklist360 should enforce frame limits and sequence', () => {
    const project = { id: 'p1' } as Vehicle360Project;
    
    // Test too few frames
    const fewFrames: Vehicle360Frame[] = Array.from({ length: 10 }).map((_, i) => ({ frameNumber: i, imageUrl: 'url' } as Vehicle360Frame));
    const result1 = validation360.checklist360(project, fewFrames);
    expect(result1.valid).toBe(false);
    expect(result1.errors.some(e => e.includes('Mínimo de 24 frames'))).toBe(true);

    // Test valid (24 frames)
    const validFrames: Vehicle360Frame[] = Array.from({ length: 24 }).map((_, i) => ({ frameNumber: i, imageUrl: 'url' } as Vehicle360Frame));
    const result2 = validation360.checklist360(project, validFrames);
    expect(result2.valid).toBe(true);
    expect(result2.errors.length).toBe(0);
  });
});
