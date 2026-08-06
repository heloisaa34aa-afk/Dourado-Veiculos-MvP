import React, { useState } from 'react';
import { useVehicle360 } from '../hooks/useVehicle360';
import { ImageCoordinateStage } from './360/ImageCoordinateStage';
import { ChevronLeft, ChevronRight, Play, Pause, AlertTriangle, Info } from 'lucide-react';
import { Vehicle360Hotspot, Vehicle360DamageMarker } from '../types';

interface ClientPoiPanelProps {
  vehicleId: string;
}

export function ClientPoiPanel({ vehicleId }: ClientPoiPanelProps) {
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
  } = useVehicle360(vehicleId, 'public');

  const [activePoi, setActivePoi] = useState<Vehicle360Hotspot | null>(null);
  const [activeDamage, setActiveDamage] = useState<Vehicle360DamageMarker | null>(null);

  if (loading) {
    return <div className="h-64 flex items-center justify-center bg-gray-50 animate-pulse text-gray-500">Carregando visão 360°...</div>;
  }

  if (!project || totalFrames === 0) {
    return null; // Don't show anything if there's no completed project
  }

  const currentFrameData = project.frames![currentFrame];
  if (!currentFrameData) return null;

  const currentHotspots = project.hotspots?.filter(h => h.frameNumber === currentFrame && h.active) || [];
  const currentDamages = project.damageMarkers?.filter(d => d.frameNumber === currentFrame) || [];

  const markers = [
    ...currentHotspots.map(h => ({
      id: h.id,
      x: h.posX,
      y: h.posY,
      content: (
        <button 
          onClick={(e) => { e.stopPropagation(); setActivePoi(h); setActiveDamage(null); }}
          className="w-8 h-8 rounded-full bg-blue-500/80 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 hover:scale-110 transition-transform"
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
          onClick={(e) => { e.stopPropagation(); setActiveDamage(d); setActivePoi(null); }}
          className="w-8 h-8 rounded-full bg-red-500/80 text-white flex items-center justify-center shadow-lg hover:bg-red-600 hover:scale-110 transition-transform"
          aria-label={d.title}
        >
          <AlertTriangle size={16} />
        </button>
      )
    }))
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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

      <div className="relative aspect-video bg-gray-100 touch-none">
        <ImageCoordinateStage
          imageUrl={currentFrameData.imageUrl}
          markers={markers}
          className="cursor-ew-resize"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur text-white px-3 py-1 rounded-full text-sm flex gap-2">
            <span>Arraste para girar</span>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {(activePoi || activeDamage) && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                {activeDamage ? <AlertTriangle className="text-red-500" size={18} /> : <Info className="text-blue-500" size={18} />}
                {activeDamage ? activeDamage.title : activePoi?.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {activeDamage ? activeDamage.description : activePoi?.description}
              </p>
            </div>
            <button 
              onClick={() => { setActivePoi(null); setActiveDamage(null); }}
              className="text-sm text-gray-500 hover:text-gray-900 px-2 py-1"
            >
              Fechar
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {activePoi?.imageUrl && (
              <img src={activePoi.imageUrl} alt={activePoi.title} className="h-32 object-cover rounded-lg shadow-sm" />
            )}
            {activeDamage?.images?.map(img => (
              <img key={img.id} src={img.imageUrl} alt={activeDamage.title} className="h-32 object-cover rounded-lg shadow-sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
