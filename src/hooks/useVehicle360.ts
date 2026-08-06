import React, { useState, useEffect, useCallback, useRef } from 'react';
import { vehicle360Service } from '../services/vehicle360.service';
import { vehicle360Storage } from '../services/vehicle360.storage';
import { validation360 } from '../utils/validation360';
import { Vehicle360Project, Vehicle360Frame, Vehicle360Hotspot, Vehicle360DamageMarker } from '../types';

export function useVehicle360(vehicleId: string, mode: 'public' | 'admin' = 'public') {
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
  const autoSpinInterval = useRef<NodeJS.Timeout>();

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = mode === 'public' 
        ? await vehicle360Service.getPublishedProjectByVehicleId(vehicleId)
        : await vehicle360Service.getProjectByVehicleId(vehicleId);
      
      if (data && data.frames) {
        data.frames.sort((a, b) => a.frameNumber - b.frameNumber);
      }
      setProject(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, mode]);

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
      setError(new Error(errors.join('\\n')));
      return false;
    }
    await vehicle360Service.updateProjectStatus(project.id, 'completed');
    await loadProject();
    return true;
  };

  const deleteProject = async () => {
    if (!project) return;
    await vehicle360Storage.deleteProjectStorage(vehicleId, project.id);
    await vehicle360Service.deleteProject(project.id);
    setProject(null);
  };
  
  const createHotspot = async (hotspot: Omit<Vehicle360Hotspot, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'imageUrl' | 'storagePath'>, file: File) => {
    if (!project) return;
    setUploading(true);
    try {
      const { imageUrl, storagePath } = await vehicle360Storage.uploadHotspotImage(vehicleId, project.id, file);
      await vehicle360Service.createHotspot({
        ...hotspot,
        projectId: project.id,
        imageUrl,
        storagePath
      });
      await loadProject();
    } finally {
      setUploading(false);
    }
  };
  
  const deleteHotspot = async (hotspot: Vehicle360Hotspot) => {
    if (hotspot.storagePath) {
      await vehicle360Storage.deleteStorageObject(hotspot.storagePath);
    }
    await vehicle360Service.deleteHotspot(hotspot.id);
    await loadProject();
  };

  const createDamageMarker = async (
    marker: Omit<Vehicle360DamageMarker, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'images'>,
    files: File[]
  ) => {
    if (!project) return;
    setUploading(true);
    try {
      const uploadedImages = [];
      for (const file of files) {
        const { imageUrl, storagePath } = await vehicle360Storage.uploadDamageImage(vehicleId, project.id, file);
        uploadedImages.push({ imageUrl, storagePath });
      }
      
      await vehicle360Service.createDamageMarker({
        ...marker,
        projectId: project.id,
      }, uploadedImages);
      
      await loadProject();
    } finally {
      setUploading(false);
    }
  };

  const deleteDamageMarker = async (marker: Vehicle360DamageMarker) => {
    if (marker.images && marker.images.length > 0) {
      const paths = marker.images.map(img => img.storagePath).filter((p): p is string => !!p);
      await vehicle360Storage.deleteStorageObjects(paths);
    }
    await vehicle360Service.deleteDamageMarker(marker.id);
    await loadProject();
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
    deleteProject,
    createHotspot,
    deleteHotspot,
    createDamageMarker,
    deleteDamageMarker
  };
}
