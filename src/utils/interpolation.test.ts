import { describe, it, expect } from 'vitest';
import { interpolateMarkerPositions } from './interpolation';
import { Vehicle360MarkerPosition } from '../types';

describe('interpolateMarkerPositions', () => {
  it('interpolates between two keyframes', () => {
    const keyframes: Vehicle360MarkerPosition[] = [
      { id: '1', frameNumber: 0, posX: 10, posY: 10, visible: true, isKeyframe: true },
      { id: '2', frameNumber: 10, posX: 20, posY: 20, visible: true, isKeyframe: true },
      { id: '3', frameNumber: 11, posX: 0, posY: 0, visible: false, isKeyframe: true },
      { id: '4', frameNumber: 23, posX: 0, posY: 0, visible: false, isKeyframe: true }
    ];
    
    const result = interpolateMarkerPositions(keyframes, 24);
    
    expect(result.length).toBe(11); // 0 to 10
    expect(result.find(r => r.frameNumber === 5)?.posX).toBe(15);
  });
  
  it('handles circular interpolation', () => {
    const keyframes: Vehicle360MarkerPosition[] = [
      { id: '3', frameNumber: 3, posX: 0, posY: 0, visible: false, isKeyframe: true },
      { id: '4', frameNumber: 21, posX: 0, posY: 0, visible: false, isKeyframe: true },
      { id: '1', frameNumber: 22, posX: 10, posY: 10, visible: true, isKeyframe: true },
      { id: '2', frameNumber: 2, posX: 20, posY: 20, visible: true, isKeyframe: true }
    ];
    
    const result = interpolateMarkerPositions(keyframes, 24); // 22, 23, 0, 1, 2
    
    expect(result.length).toBe(5);
    expect(result.find(r => r.frameNumber === 0)?.posX).toBe(15);
  });
  
  it('does not interpolate through hidden keyframes', () => {
    const keyframes: Vehicle360MarkerPosition[] = [
      { id: '1', frameNumber: 0, posX: 10, posY: 10, visible: true, isKeyframe: true },
      { id: '2', frameNumber: 5, posX: 20, posY: 20, visible: false, isKeyframe: true },
      { id: '3', frameNumber: 10, posX: 30, posY: 30, visible: true, isKeyframe: true }
    ];
    
    const result = interpolateMarkerPositions(keyframes, 24);
    expect(result.length).toBe(15);
  });
});
