import React, { useState } from 'react';
import { useVehicle360 } from '../hooks/useVehicle360';
import { ImageCoordinateStage } from './360/ImageCoordinateStage';
import { ChevronLeft, ChevronRight, Play, Pause, AlertTriangle, Info, Maximize } from 'lucide-react';
import { Vehicle360Hotspot, Vehicle360DamageMarker } from '../types';
import { MarkerDetailModal } from './360/MarkerDetailModal';

interface ClientPoiPanelProps {
  vehicleId: string;
  embedded?: boolean;
  viewType?: 'exterior' | 'interior';
}

export function ClientPoiPanel({ vehicleId, embedded = false, viewType = 'exterior' }: ClientPoiPanelProps) {
  const { 
    project, 
    loading, 
    currentFrame, 
    isAutoSpinning, 
    toggleAutoSpin,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    nextFrame,
    prevFrame,
    totalFrames
  } = useVehicle360(vehicleId, 'public', viewType);

  const [activePoi, setActivePoi] = useState<Vehicle360Hotspot | null>(null);
  const [activeDamage, setActiveDamage] = useState<Vehicle360DamageMarker | null>(null);

  if (loading) {
    return <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gray-50/50 animate-pulse text-gray-500 rounded-2xl">Carregando visão 360°...</div>;
  }

  if (!project || totalFrames === 0) {
    return null;
  }

  const currentFrameData = project.frames![currentFrame];
  if (!currentFrameData) return null;

  const currentHotspots = (project.hotspots || []).filter(h => h.active).map(h => {
    const pos = h.positions?.find(p => p.frameNumber === currentFrame);
    if (pos) { 
      return pos.visible ? { ...h, posX: pos.posX, posY: pos.posY } : null;
    }
    return h.frameNumber === currentFrame ? h : null;
  }).filter(Boolean) as Vehicle360Hotspot[];

  const currentDamages = (project.damageMarkers || []).map(d => {
    const pos = d.positions?.find(p => p.frameNumber === currentFrame);
    if (pos) { 
      return pos.visible ? { ...d, posX: pos.posX, posY: pos.posY } : null;
    }
    return d.frameNumber === currentFrame ? d : null;
  }).filter(Boolean) as Vehicle360DamageMarker[];

  const openPoiModal = (h: Vehicle360Hotspot) => {
    setActivePoi(h);
    setActiveDamage(null);
    if (isAutoSpinning) toggleAutoSpin();
  };

  const openDamageModal = (d: Vehicle360DamageMarker) => {
    setActiveDamage(d);
    setActivePoi(null);
    if (isAutoSpinning) toggleAutoSpin();
  };

  const markers = [
    ...currentHotspots.map(h => ({
      id: h.id,
      x: h.posX,
      y: h.posY,
      content: (
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openPoiModal(h); }}
          className="w-8 h-8 rounded-full bg-blue-500/90 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 hover:scale-110 transition-transform cursor-pointer pointer-events-auto"
          aria-label={h.title}
        >
          <Info size={16} />
        </button>
      )
    })),
    ...currentDamages.map(d => ({
      id: d.id,
      x: d.posX,
      y: d.posY,
      content: (
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openDamageModal(d); }}
          className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-lg hover:bg-red-600 hover:scale-110 transition-transform cursor-pointer pointer-events-auto"
          aria-label={d.title}
        >
          <AlertTriangle size={16} />
        </button>
      )
    }))
  ];

  return (
    <div className={`bg-white shadow-sm overflow-hidden flex flex-col ${embedded ? 'w-full h-full rounded-2xl' : 'rounded-xl border border-gray-200'}`}>
      {!embedded && (
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">Visão 360° do Veículo</h3>
          
          <div className="flex gap-2">
            <button onClick={prevFrame} className="p-2 rounded-full hover:bg-gray-100 text-gray-600" aria-label="Frame anterior">
              <ChevronLeft size={20} />
            </button>
            <button onClick={toggleAutoSpin} className="p-2 rounded-full hover:bg-gray-100 text-gray-600" aria-label={isAutoSpinning ? "Pausar giro" : "Giro automático"}>
              {isAutoSpinning ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={nextFrame} className="p-2 rounded-full hover:bg-gray-100 text-gray-600" aria-label="Próximo frame">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      <div className={`relative bg-gray-100 touch-none flex-1 ${!embedded ? 'aspect-video' : 'w-full h-full'}`}>
        <ImageCoordinateStage
          imageUrl={currentFrameData.imageUrl}
          markers={markers}
          className={`cursor-ew-resize w-full h-full object-contain ${embedded ? 'absolute inset-0' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        
        {embedded && (
           <button onClick={toggleAutoSpin} className="absolute bottom-4 right-4 z-10 p-3 bg-black/60 hover:bg-black/80 backdrop-blur text-white rounded-xl shadow-lg transition-all" aria-label={isAutoSpinning ? "Pausar giro" : "Giro automático"}>
             {isAutoSpinning ? <Pause size={24} /> : <Play size={24} />}
           </button>
        )}

        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium flex gap-2 shadow-sm">
            <span>Arraste para girar em 360°</span>
          </div>
        </div>
      </div>

      <MarkerDetailModal 
        isOpen={!!activePoi}
        onClose={() => setActivePoi(null)}
        type="poi"
        title={activePoi?.title || ''}
        description={activePoi?.description}
        frameNumber={activePoi?.frameNumber}
        images={activePoi?.imageUrl ? [{ url: activePoi.imageUrl, order: 0 }] : []}
      />

      <MarkerDetailModal 
        isOpen={!!activeDamage}
        onClose={() => setActiveDamage(null)}
        type="damage"
        title={activeDamage?.title || ''}
        description={activeDamage?.description}
        category={activeDamage?.category}
        frameNumber={activeDamage?.frameNumber}
        images={activeDamage?.images?.sort((a, b) => a.orderIndex - b.orderIndex).map((img, i) => ({ url: img.imageUrl, order: i })) || []}
      />
    </div>
  );
}
