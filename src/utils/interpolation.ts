import { Vehicle360MarkerPosition } from '../types';

export function interpolateMarkerPositions(
  keyframes: Vehicle360MarkerPosition[],
  totalFrames: number
): Vehicle360MarkerPosition[] {
  if (!keyframes || keyframes.length === 0) return [];
  
  // Create a copy and sort by frameNumber
  const sortedKeys = [...keyframes].sort((a, b) => a.frameNumber - b.frameNumber);
  
  // If only one keyframe, return it (or we could duplicate it, but prompt says: 
  // "gerar uma posição por frame visível" between keyframes. If only 1 keyframe, 
  // maybe it's only visible on that frame, or visible on all? The prompt says "interpolar posX e posY linearmente entre dois frames-chave visíveis"
  // If there's only one keyframe, we just return it.
  if (sortedKeys.length === 1) {
    if (!sortedKeys[0].visible) return [];
    return [sortedKeys[0]];
  }

  const result: Vehicle360MarkerPosition[] = [];
  
  for (let i = 0; i < sortedKeys.length; i++) {
    const curr = sortedKeys[i];
    const next = sortedKeys[(i + 1) % sortedKeys.length];
    
    if (!curr.visible) continue;
    
    // Add current keyframe
    if (!result.find(p => p.frameNumber === curr.frameNumber)) {
      result.push({ ...curr, isKeyframe: true });
    }
    
    if (!next.visible) continue; // Do not interpolate if next is hidden
    
    let framesDiff = next.frameNumber - curr.frameNumber;
    if (framesDiff <= 0) {
      // It means next is actually wrapping around the circular 360
      framesDiff += totalFrames;
    }
    
    // We interpolate if there is more than 1 frame difference
    if (framesDiff > 1) {
      const stepX = (next.posX - curr.posX) / framesDiff;
      const stepY = (next.posY - curr.posY) / framesDiff;
      
      for (let j = 1; j < framesDiff; j++) {
        const frameNumber = (curr.frameNumber + j) % totalFrames;
        // Check if there is already a keyframe at this frameNumber (shouldn't be, but just in case)
        if (!sortedKeys.find(k => k.frameNumber === frameNumber)) {
          result.push({
            id: 'temp-' + frameNumber,
            frameNumber,
            posX: curr.posX + stepX * j,
            posY: curr.posY + stepY * j,
            visible: true,
            isKeyframe: false
          });
        }
      }
    }
  }

  // Sort final result
  return result.sort((a, b) => a.frameNumber - b.frameNumber);
}
