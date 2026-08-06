/// <reference lib="webworker" />

type TrackRequest = {
  frames: string[];
  initialFrame: number;
  initialX: number;
  initialY: number;
};

type TrackResult = {
  frameNumber: number;
  posX: number;
  posY: number;
  confidence: number;
  visible: boolean;
};

async function loadImageData(url: string): Promise<ImageData> {
  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  ctx.drawImage(bitmap, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();
  return imageData;
}

function getPatch(img: ImageData, cx: number, cy: number, patchSize: number) {
  const half = Math.floor(patchSize / 2);
  const patch = new Uint8ClampedArray(patchSize * patchSize * 4);
  
  for (let y = 0; y < patchSize; y++) {
    for (let x = 0; x < patchSize; x++) {
      const srcY = cy - half + y;
      const srcX = cx - half + x;
      
      const destIdx = (y * patchSize + x) * 4;
      
      if (srcX >= 0 && srcX < img.width && srcY >= 0 && srcY < img.height) {
        const srcIdx = (srcY * img.width + srcX) * 4;
        patch[destIdx] = img.data[srcIdx];
        patch[destIdx + 1] = img.data[srcIdx + 1];
        patch[destIdx + 2] = img.data[srcIdx + 2];
        patch[destIdx + 3] = img.data[srcIdx + 3];
      } else {
        patch[destIdx] = 0;
        patch[destIdx + 1] = 0;
        patch[destIdx + 2] = 0;
        patch[destIdx + 3] = 0;
      }
    }
  }
  return patch;
}

function computeNCC(patchA: Uint8ClampedArray, patchB: Uint8ClampedArray) {
  let meanA = 0, meanB = 0;
  const numPixels = patchA.length / 4;
  
  for (let i = 0; i < patchA.length; i += 4) {
    const grayA = (patchA[i] + patchA[i+1] + patchA[i+2]) / 3;
    const grayB = (patchB[i] + patchB[i+1] + patchB[i+2]) / 3;
    meanA += grayA;
    meanB += grayB;
  }
  meanA /= numPixels;
  meanB /= numPixels;
  
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < patchA.length; i += 4) {
    const grayA = (patchA[i] + patchA[i+1] + patchA[i+2]) / 3;
    const grayB = (patchB[i] + patchB[i+1] + patchB[i+2]) / 3;
    const valA = grayA - meanA;
    const valB = grayB - meanB;
    num += valA * valB;
    denA += valA * valA;
    denB += valB * valB;
  }
  
  if (denA === 0 || denB === 0) return 0;
  return num / Math.sqrt(denA * denB);
}

function searchTemplate(
  img: ImageData, 
  template: Uint8ClampedArray, 
  patchSize: number, 
  startX: number, 
  startY: number, 
  searchRadius: number
) {
  let bestScore = -Infinity;
  let bestX = startX;
  let bestY = startY;
  
  // Stride of 2 for faster coarse search
  for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
      const cx = startX + dx;
      const cy = startY + dy;
      
      if (cx < 0 || cx >= img.width || cy < 0 || cy >= img.height) continue;
      
      const candidatePatch = getPatch(img, cx, cy, patchSize);
      const score = computeNCC(template, candidatePatch);
      
      if (score > bestScore) {
        bestScore = score;
        bestX = cx;
        bestY = cy;
      }
    }
  }
  
  let refinedBestScore = bestScore;
  let refinedBestX = bestX;
  let refinedBestY = bestY;
  
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const cx = bestX + dx;
      const cy = bestY + dy;
      if (cx < 0 || cx >= img.width || cy < 0 || cy >= img.height) continue;
      
      const candidatePatch = getPatch(img, cx, cy, patchSize);
      const score = computeNCC(template, candidatePatch);
      
      if (score > refinedBestScore) {
        refinedBestScore = score;
        refinedBestX = cx;
        refinedBestY = cy;
      }
    }
  }
  
  return { x: refinedBestX, y: refinedBestY, confidence: refinedBestScore };
}

self.onmessage = async (e: MessageEvent<TrackRequest>) => {
  const { frames, initialFrame, initialX, initialY } = e.data;
  
  try {
    const totalFrames = frames.length;
    
    self.postMessage({ type: 'progress', message: 'Carregando imagens...' });
    const imageDatas: ImageData[] = [];
    for (let i = 0; i < totalFrames; i++) {
      if (frames[i]) {
         imageDatas[i] = await loadImageData(frames[i]);
      }
    }
    
    const patchSize = 40;
    const imgWidth = imageDatas[0].width;
    const imgHeight = imageDatas[0].height;
    
    const startPixelX = Math.round((initialX / 100) * imgWidth);
    const startPixelY = Math.round((initialY / 100) * imgHeight);
    
    const results: TrackResult[] = [];
    results.push({
      frameNumber: initialFrame,
      posX: initialX,
      posY: initialY,
      confidence: 1,
      visible: true
    });
    
    const searchRadius = Math.round(imgWidth * 0.1); 
    
    // Process forward
    let currentTemplate = getPatch(imageDatas[initialFrame], startPixelX, startPixelY, patchSize);
    let currentPixelX = startPixelX;
    let currentPixelY = startPixelY;
    
    for (let i = 1; i <= Math.floor(totalFrames / 2); i++) {
      const frameIndex = (initialFrame + i) % totalFrames;
      if (!imageDatas[frameIndex]) continue;
      
      self.postMessage({ type: 'progress', message: `Analisando frame ${frameIndex + 1} de ${totalFrames} (Avançando)` });
      
      const match = searchTemplate(
        imageDatas[frameIndex], 
        currentTemplate, 
        patchSize, 
        currentPixelX, 
        currentPixelY, 
        searchRadius
      );
      
      const newPosX = (match.x / imgWidth) * 100;
      const newPosY = (match.y / imgHeight) * 100;
      
      const visible = match.confidence > 0.6;
      results.push({
        frameNumber: frameIndex,
        posX: newPosX,
        posY: newPosY,
        confidence: match.confidence,
        visible
      });
      
      if (!visible) {
        // Continue but mark as invisible? No, user requested:
        // "Confiança baixa: marcar o frame como não visível e interromper aquele trecho do rastreamento."
        // "Quando a peça desaparecer no lado oposto do veículo, os frames devem ficar com visible: false."
        break;
      }
      
      currentTemplate = getPatch(imageDatas[frameIndex], match.x, match.y, patchSize);
      currentPixelX = match.x;
      currentPixelY = match.y;
    }
    
    // Process backward
    currentTemplate = getPatch(imageDatas[initialFrame], startPixelX, startPixelY, patchSize);
    currentPixelX = startPixelX;
    currentPixelY = startPixelY;
    
    for (let i = 1; i <= Math.floor(totalFrames / 2); i++) {
      const frameIndex = (initialFrame - i + totalFrames) % totalFrames;
      if (results.find(r => r.frameNumber === frameIndex)) break;
      
      if (!imageDatas[frameIndex]) continue;
      
      self.postMessage({ type: 'progress', message: `Analisando frame ${frameIndex + 1} de ${totalFrames} (Retrocedendo)` });
      
      const match = searchTemplate(
        imageDatas[frameIndex], 
        currentTemplate, 
        patchSize, 
        currentPixelX, 
        currentPixelY, 
        searchRadius
      );
      
      const newPosX = (match.x / imgWidth) * 100;
      const newPosY = (match.y / imgHeight) * 100;
      
      const visible = match.confidence > 0.6;
      results.push({
        frameNumber: frameIndex,
        posX: newPosX,
        posY: newPosY,
        confidence: match.confidence,
        visible
      });
      
      if (!visible) {
        break; 
      }
      
      currentTemplate = getPatch(imageDatas[frameIndex], match.x, match.y, patchSize);
      currentPixelX = match.x;
      currentPixelY = match.y;
    }
    
    // Fill remaining frames with visible: false
    for (let i = 0; i < totalFrames; i++) {
       if (!results.find(r => r.frameNumber === i)) {
           results.push({
               frameNumber: i,
               posX: 50,
               posY: 50,
               confidence: 0,
               visible: false
           });
       }
    }
    
    self.postMessage({ type: 'done', results: results.sort((a,b) => a.frameNumber - b.frameNumber) });
    
  } catch (error: any) {
    self.postMessage({ type: 'error', error: error.message });
  }
};
