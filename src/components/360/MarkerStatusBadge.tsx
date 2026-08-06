import React from 'react';
import { Vehicle360MarkerPosition } from '../../types';

export function MarkerStatusBadge({ positions, totalFrames }: { positions?: Vehicle360MarkerPosition[], totalFrames: number }) {
  if (!positions || positions.length <= 1) {
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Não rastreado</span>;
  }
  if (positions.length < totalFrames) {
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Parcial ({positions.length}/{totalFrames})</span>;
  }
  
  const visiblePos = positions.filter(p => p.visible).sort((a, b) => a.frameNumber - b.frameNumber);
  if (visiblePos.length === 0) {
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">Rastreado (Oculto)</span>;
  }
  
  const first = visiblePos[0].frameNumber + 1;
  const last = visiblePos[visiblePos.length - 1].frameNumber + 1;
  
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700" title={`Visível: Frame ${first} ao ${last}`}>
      Rastreado
    </span>
  );
}
