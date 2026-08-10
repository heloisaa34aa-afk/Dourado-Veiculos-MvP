import React, { useState, useEffect, useCallback, useRef } from 'react';
import { vehicle360Service } from '../services/vehicle360.service';
import { vehicle360Storage } from '../services/vehicle360.storage';
import { validation360 } from '../utils/validation360';
import { Vehicle360Project, Vehicle360Frame, Vehicle360Hotspot, Vehicle360DamageMarker } from '../types';

export function useVehicle360(vehicleId: string, mode: 'public' | 'admin' = 'public', viewType: 'exterior' | 'interior' = 'exterior') {
  const [project, setProject] = useState<Vehicle360Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<Error | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const startX = useRef(0);
  const startFrame = useRef(0);
  const autoSpinInterval = useRef<NodeJS.Timeout | null>(null);

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = mode === 'public' 
        ? await vehicle360Service.getPublishedProjectByVehicleId(vehicleId, viewType)
        : await vehicle360Service.getProjectByVehicleId(vehicleId, viewType);
      
      if (data && data.frames) {
        data.frames.sort((a, b) => a.frameNumber - b.frameNumber);
        const totalFrames = data.frames.length;
        let warned = false;

        const processPositions = (positions: any[]) => {
          if (!positions) return [];
          const seenFrames = new Set();
          const filtered = positions.filter((p) => {
            if (p.frameNumber < 0 || p.frameNumber >= totalFrames) {
              warned = true;
              return false;
            }
            if (seenFrames.has(p.frameNumber)) {
              warned = true;
              return false; // deduplicate
            }
            seenFrames.add(p.frameNumber);
            return true;
          });
          return filtered.sort((a, b) => a.frameNumber - b.frameNumber);
        };

        if (data.hotspots) {
          data.hotspots.forEach(h => {
            h.positions = processPositions(h.positions);
          });
        }
        if (data.damageMarkers) {
          data.damageMarkers.forEach(d => {
            d.positions = processPositions(d.positions);
          });
        }
        
        if (warned && mode === 'admin') {
          alert("Aviso: Foram ignoradas posições inválidas (duplicadas ou fora dos limites do projeto).");
        }
      }
      setProject(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, mode, viewType]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const totalFrames = project?.frames?.length || 0;

  const nextFrame = useCallback(() => {
    if (totalFrames > 0) {
      setCurrentFrame(prev => (prev + 1) % totalFrames);
    }
  }, [totalFrames]);

  const prevFrame = useCallback(() => {
    if (totalFrames > 0) {
      setCurrentFrame(prev => (prev - 1 + totalFrames) % totalFrames);
    }
  }, [totalFrames]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (totalFrames <= 0) return;
    setIsDragging(true);
    setIsAutoSpinning(false);
    startX.current = e.clientX;
    startFrame.current = currentFrame;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || totalFrames <= 0) return;
    const deltaX = e.clientX - startX.current;
    const framesToMove = Math.floor(deltaX / 10); 
    
    let nextIdx = (startFrame.current - framesToMove) % totalFrames;
    if (nextIdx < 0) nextIdx += totalFrames;
    
    setCurrentFrame(nextIdx);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (isAutoSpinning && totalFrames > 0) {
      autoSpinInterval.current = setInterval(nextFrame, 100);
    } else {
      if (autoSpinInterval.current) clearInterval(autoSpinInterval.current);
    }
    return () => {
      if (autoSpinInterval.current) clearInterval(autoSpinInterval.current);
    };
  }, [isAutoSpinning, nextFrame, totalFrames]);

  const toggleAutoSpin = useCallback(() => {
    setIsAutoSpinning(prev => !prev);
  }, []);

  const uploadFrames = async (files: File[]) => {
    if (!project) return;
    setUploading(true);
    setError(null);
    setUploadProgress({ current: 0, total: files.length });
    
    try {
      await vehicle360Service.updateProjectStatus(project.id, 'processing');
      
      const newFrames: Omit<Vehicle360Frame, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[] = [];
      let current = 0;
      
      // Parallel upload with concurrency limit (e.g. 3)
      const CONCURRENCY = 3;
      for (let i = 0; i < files.length; i += CONCURRENCY) {
        const batch = files.slice(i, i + CONCURRENCY);
        const promises = batch.map(async (file, batchIdx) => {
          const globalIdx = i + batchIdx;
          const { width, height } = await validation360.getImageDimensions(file);
          const filename = `${String(globalIdx).padStart(3, '0')}-${file.name}`;
          const { imageUrl, storagePath } = await vehicle360Storage.uploadFrame(vehicleId, project.id, file, filename);
          return {
            frameNumber: globalIdx,
            imageUrl,
            storagePath,
            originalFilename: file.name,
            width,
            height
          };
        });
        
        const results = await Promise.all(promises);
        newFrames.push(...results);
        current += results.length;
        setUploadProgress({ current, total: files.length });
      }
      
      await vehicle360Service.replaceProjectFrames(project.id, newFrames);
      await vehicle360Service.updateProjectStatus(project.id, 'draft');
      await loadProject();
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const publishProject = async () => {
    if (!project || !project.frames) return false;
    const { valid, errors } = validation360.checklist360(project, project.frames);
    if (!valid) {
      setError(new Error(errors.join('\n')));
      return false;
    }
    await vehicle360Service.updateProjectStatus(project.id, 'completed');
    await loadProject();
    return true;
  };

  const unpublishProject = async () => {
    if (!project) return false;
    await vehicle360Service.updateProjectStatus(project.id, 'draft');
    await loadProject();
    return true;
  };

  const deleteProject = async () => {
    if (!project) return;
    await vehicle360Storage.deleteProjectStorage(vehicleId, project.id);
    await vehicle360Service.deleteProject(project.id);
    setProject(null);
  };
  
  const createHotspot = async (data: {
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
  };

  const updateHotspot = async (hotspotId: string, updates: Partial<Vehicle360Hotspot>) => {
    if (!project) return;
    await vehicle360Service.updateHotspot(hotspotId, updates);
    await vehicle360Service.touchProject(project.id);
    await loadProject();
  };

  const repositionHotspot = async (hotspotId: string, posX: number, posY: number) => {
    if (!project) return;
    await vehicle360Service.repositionHotspot(hotspotId, posX, posY);
    await vehicle360Service.touchProject(project.id);
    await loadProject();
  };
  
  const deleteHotspot = async (hotspot: Vehicle360Hotspot) => {
    if (!project) return;
    if (hotspot.storagePath) {
      await vehicle360Storage.deleteStorageObject(hotspot.storagePath);
    }
    await vehicle360Service.deleteHotspot(hotspot.id);
    await vehicle360Service.touchProject(project.id);
    await loadProject();
  };

  const createDamageMarker = async (data: {
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
              }, images);
      await vehicle360Service.touchProject(project.id);
      return id;
    } finally {
      setUploading(false);
    }
  };

  const updateDamageMarker = async (markerId: string, updates: Partial<Vehicle360DamageMarker>) => {
    if (!project) return;
    await vehicle360Service.updateDamageMarker(markerId, updates);
    await vehicle360Service.touchProject(project.id);
    await loadProject();
  };

  const repositionDamageMarker = async (markerId: string, posX: number, posY: number) => {
    if (!project) return;
    await vehicle360Service.repositionDamageMarker(markerId, posX, posY);
    await vehicle360Service.touchProject(project.id);
    await loadProject();
  };

  const deleteDamageMarker = async (marker: Vehicle360DamageMarker) => {
    if (!project) return;
    if (marker.images && marker.images.length > 0) {
      const paths = marker.images.map(img => img.storagePath).filter((p): p is string => !!p);
      await vehicle360Storage.deleteStorageObjects(paths);
    }
    await vehicle360Service.deleteDamageMarker(marker.id);
    await vehicle360Service.touchProject(project.id);
    await loadProject();
  };

  const replaceFrame = async (frame: Vehicle360Frame, file: File) => {
    if (!project) return;
    setUploading(true);
    try {
      // 1. Upload new image
      const { width, height } = await validation360.getImageDimensions(file);
      const filename = `${String(frame.frameNumber).padStart(3, '0')}-${file.name}`;
      const { imageUrl, storagePath } = await vehicle360Storage.uploadFrame(vehicleId, project.id, file, filename);
      
      // 2. Update record
      await vehicle360Service.replaceFrame(frame.id, {
        imageUrl,
        storagePath,
        originalFilename: file.name,
        width,
        height
      });
      
      // 3. Delete old image
      if (frame.storagePath) {
        await vehicle360Storage.deleteStorageObject(frame.storagePath);
      }
      
      await vehicle360Service.touchProject(project.id);
      await loadProject();
    } catch(err: any) {
      setError(err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const removeFrame = async (frame: Vehicle360Frame) => {
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
  };

  const reorderFrames = async (orderedFrames: Vehicle360Frame[]) => {
    if (!project) return;
    try {
      await vehicle360Service.reorderFrames(project.id, orderedFrames);
      await loadProject();
    } catch(err: any) {
      setError(err);
      throw err;
    }
  };

  return {
    project,
    frames: project?.frames || [],
    hotspots: project?.hotspots || [],
    damageMarkers: project?.damageMarkers || [],
    loading,
    uploading,
    uploadProgress,
    error,
    currentFrame,
    setCurrentFrame,
    totalFrames,
    nextFrame,
    prevFrame,
    isAutoSpinning,
    toggleAutoSpin,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    reload: loadProject,
    uploadFrames,
    publishProject,
    unpublishProject,
    deleteProject,
    createHotspot,
    updateHotspot,
    repositionHotspot,
    deleteHotspot,
    createDamageMarker,
    updateDamageMarker,
    repositionDamageMarker,
    deleteDamageMarker,
    replaceFrame,
    removeFrame,
    reorderFrames
  };
}
