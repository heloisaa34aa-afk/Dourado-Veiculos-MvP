import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Eye, EyeOff, Save, X, Plus } from 'lucide-react';
import { Vehicle360Frame, Vehicle360MarkerPosition } from '../../types';
import { ImageCoordinateStage } from './ImageCoordinateStage';
import { interpolateMarkerPositions } from '../../utils/interpolation';

interface MarkerTrackingEditorProps {
  markerId: string;
  markerType: 'poi' | 'damage';
  initialFrame: number;
  initialX: number;
  initialY: number;
  existingPositions?: Vehicle360MarkerPosition[];
  frames: Vehicle360Frame[];
  onSave: (positions: { frameNumber: number; posX: number; posY: number; visible: boolean; isKeyframe: boolean }[]) => Promise<void>;
  onCancel: () => void;
}

export function MarkerTrackingEditor({ markerId, initialFrame, initialX, initialY, existingPositions, frames, onSave, onCancel }: MarkerTrackingEditorProps) {
  const [currentFrame, setCurrentFrame] = useState(initialFrame);
  const [positions, setPositions] = useState<Vehicle360MarkerPosition[]>([]);
  const [saving, setSaving] = useState(false);
  
  const totalFrames = frames.length;

  useEffect(() => {
    if (existingPositions && existingPositions.length > 0) {
      setPositions(existingPositions);
    } else {
      setPositions([{
        id: 'initial',
        frameNumber: initialFrame,
        posX: initialX,
        posY: initialY,
        visible: true,
        isKeyframe: true
      }]);
    }
  }, [existingPositions, initialFrame, initialX, initialY]);

  const currentPos = positions.find(p => p.frameNumber === currentFrame);
  
  const handleStageClick = (x: number, y: number) => {
    setPositions(prev => {
      const filtered = prev.filter(p => p.frameNumber !== currentFrame);
      return [...filtered, {
        id: `new-${Date.now()}`,
        frameNumber: currentFrame,
        posX: x,
        posY: y,
        visible: true,
        isKeyframe: true
      }].sort((a, b) => a.frameNumber - b.frameNumber);
    });
  };

  const toggleVisibility = () => {
    setPositions(prev => {
      const existing = prev.find(p => p.frameNumber === currentFrame);
      const filtered = prev.filter(p => p.frameNumber !== currentFrame);
      return [...filtered, {
        id: existing ? existing.id : `new-${Date.now()}`,
        frameNumber: currentFrame,
        posX: existing ? existing.posX : 50,
        posY: existing ? existing.posY : 50,
        visible: existing ? !existing.visible : false,
        isKeyframe: true
      }].sort((a, b) => a.frameNumber - b.frameNumber);
    });
  };
  
  const removeKeyframe = () => {
    setPositions(prev => prev.filter(p => p.frameNumber !== currentFrame));
  };

  const handleInterpolate = () => {
    const keyframes = positions.filter(p => p.isKeyframe);
    if (keyframes.length < 2) {
      alert("Adicione pelo menos 2 frames-chave para interpolar.");
      return;
    }
    const result = interpolateMarkerPositions(keyframes, totalFrames);
    setPositions(result);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(positions);
    } finally {
      setSaving(false);
    }
  };
  
  const markers = currentPos && currentPos.visible ? [{
    id: 'tracker',
    x: currentPos.posX,
    y: currentPos.posY,
    content: <div className="w-6 h-6 rounded-full border-2 border-white shadow-lg bg-indigo-500/80 animate-pulse flex items-center justify-center text-xs text-white font-bold">{currentPos.isKeyframe ? 'K' : ''}</div>
  }] : [];

  return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-300 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-gray-900">Rastreamento no Giro 360°</h4>
          <p className="text-sm text-gray-600">Posicione o marcador sobre a mesma peça em diferentes ângulos.</p>
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-900"><X size={24} /></button>
      </div>

      <div className="flex gap-2 justify-center mb-2">
        <button onClick={() => setCurrentFrame(prev => (prev > 0 ? prev - 1 : totalFrames - 1))} className="p-2 rounded-full hover:bg-gray-200">
          <ChevronLeft size={20} />
        </button>
        <span className="font-mono flex items-center px-4 bg-white border border-gray-200 rounded-lg">
          Frame {currentFrame + 1} / {totalFrames}
        </span>
        <button onClick={() => setCurrentFrame(prev => (prev < totalFrames - 1 ? prev + 1 : 0))} className="p-2 rounded-full hover:bg-gray-200">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-300 shadow-inner">
        <ImageCoordinateStage
          imageUrl={frames[currentFrame]?.imageUrl}
          markers={markers}
          className="cursor-crosshair"
          onCoordinateClick={({x, y}) => handleStageClick(x, y)}
        />
        {!currentPos?.visible && currentPos?.isKeyframe && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <span className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium">Marcador Oculto neste frame</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin px-2">
        {frames.map((frame, idx) => {
          const pos = positions.find(p => p.frameNumber === idx);
          const isKey = pos?.isKeyframe;
          const isVis = pos?.visible;
          return (
            <div 
              key={idx}
              onClick={() => setCurrentFrame(idx)}
              className={`
                flex-shrink-0 w-8 h-10 rounded cursor-pointer border flex flex-col items-center justify-center text-xs font-mono
                ${idx === currentFrame ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                ${isKey && isVis ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : ''}
                ${isKey && !isVis ? 'bg-gray-200 border-gray-400 text-gray-500' : ''}
                ${!isKey && isVis ? 'bg-green-50 border-green-200 text-green-700' : ''}
                ${!isKey && !isVis && pos ? 'bg-gray-100 border-gray-200 text-gray-400' : ''}
                ${!pos ? 'bg-white border-gray-200 text-gray-400' : ''}
              `}
              title={`Frame ${idx + 1}`}
            >
              {idx + 1}
              {isKey && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />}
              {!isKey && isVis && <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1" />}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
        <div className="flex gap-2">
          {currentPos?.isKeyframe ? (
            <>
              <button onClick={toggleVisibility} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                {currentPos.visible ? <EyeOff size={16} /> : <Eye size={16} />} {currentPos.visible ? 'Ocultar' : 'Mostrar'}
              </button>
              <button onClick={removeKeyframe} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md">
                <XCircle size={16} /> Remover
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-500 px-2 py-1.5">Clique na imagem para adicionar um frame-chave.</span>
          )}
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleInterpolate}
            className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200"
          >
            Interpolar Posições
          </button>
          <button 
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
