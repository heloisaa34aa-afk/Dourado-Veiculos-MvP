import React from 'react';

interface CapturePositionGuideProps {
  viewType: 'exterior' | 'interior';
  slotNumber: number;
  targetFrameCount: number;
  compact?: boolean;
}

const interiorAreas = [
  'dashboard',
  'steering',
  'multimedia',
  'console',
  'driver-seat',
  'passenger-seat',
  'rear-seats',
  'doors',
] as const;

export function getExteriorCameraPosition(slotNumber: number, targetFrameCount: number) {
  const angleDegrees = (slotNumber / Math.max(targetFrameCount, 1)) * 360;
  const radians = angleDegrees * Math.PI / 180;
  return {
    angleDegrees: Math.round(angleDegrees),
    x: 100 + 78 * Math.sin(radians),
    y: 100 - 78 * Math.cos(radians),
  };
}

export function getInteriorArea(slotNumber: number, targetFrameCount: number) {
  const index = Math.floor((slotNumber * interiorAreas.length) / Math.max(targetFrameCount, 1)) % interiorAreas.length;
  return interiorAreas[index];
}

export function CapturePositionGuide({
  viewType,
  slotNumber,
  targetFrameCount,
  compact = false,
}: CapturePositionGuideProps) {
  if (viewType === 'interior') {
    return <InteriorGuide slotNumber={slotNumber} targetFrameCount={targetFrameCount} compact={compact} />;
  }
  return <ExteriorGuide slotNumber={slotNumber} targetFrameCount={targetFrameCount} compact={compact} />;
}

function ExteriorGuide({ slotNumber, targetFrameCount, compact }: Omit<CapturePositionGuideProps, 'viewType'>) {
  const camera = getExteriorCameraPosition(slotNumber, targetFrameCount);
  const lineEndX = 100 + (camera.x - 100) * 0.48;
  const lineEndY = 100 + (camera.y - 100) * 0.48;

  return (
    <div className={compact ? 'h-full w-full' : 'mx-auto w-full max-w-[330px]'}>
      <svg viewBox="0 0 200 200" role="img" aria-label={`Posição externa da câmera em ${camera.angleDegrees} graus`} className="h-full w-full">
        <defs>
          <linearGradient id={`car-body-${slotNumber}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#64748b" />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>
          <marker id={`arrow-${slotNumber}`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#60a5fa" />
          </marker>
        </defs>

        <circle cx="100" cy="100" r="79" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 5" />
        <text x="100" y="10" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="700">FRENTE</text>
        <text x="100" y="196" textAnchor="middle" fill="#64748b" fontSize="7">TRASEIRA</text>

        <rect x="71" y="47" width="58" height="106" rx="23" fill={`url(#car-body-${slotNumber})`} stroke="#94a3b8" strokeWidth="2" />
        <path d="M80 71 Q100 57 120 71 L117 91 L83 91 Z" fill="#93c5fd" fillOpacity="0.55" />
        <path d="M83 111 L117 111 L120 133 Q100 143 80 133 Z" fill="#0f172a" stroke="#475569" />
        <rect x="66" y="65" width="8" height="25" rx="3" fill="#111827" />
        <rect x="126" y="65" width="8" height="25" rx="3" fill="#111827" />
        <rect x="66" y="112" width="8" height="25" rx="3" fill="#111827" />
        <rect x="126" y="112" width="8" height="25" rx="3" fill="#111827" />
        <path d="M83 52 Q100 43 117 52" fill="none" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />

        <line
          x1={camera.x}
          y1={camera.y}
          x2={lineEndX}
          y2={lineEndY}
          stroke="#60a5fa"
          strokeWidth={compact ? 3 : 2.5}
          markerEnd={`url(#arrow-${slotNumber})`}
        />
        <circle cx={camera.x} cy={camera.y} r={compact ? 10 : 9} fill="#2563eb" stroke="#dbeafe" strokeWidth="3" />
        <circle cx={camera.x} cy={camera.y} r="3" fill="#ffffff" />
        {!compact && (
          <g>
            <rect x={Math.max(4, Math.min(151, camera.x - 20))} y={Math.max(14, Math.min(174, camera.y + 12))} width="45" height="17" rx="8" fill="#172554" stroke="#3b82f6" />
            <text x={Math.max(26.5, Math.min(173.5, camera.x + 2.5))} y={Math.max(26, Math.min(186, camera.y + 24))} textAnchor="middle" fill="#dbeafe" fontSize="8" fontWeight="700">Fique aqui</text>
          </g>
        )}
      </svg>
      {!compact && (
        <div className="-mt-1 text-center">
          <p className="text-sm font-bold text-blue-300">Ponto azul: posição do fotógrafo</p>
          <p className="text-xs text-slate-400">A seta deve apontar para o centro do carro.</p>
        </div>
      )}
    </div>
  );
}

function InteriorGuide({ slotNumber, targetFrameCount, compact }: Omit<CapturePositionGuideProps, 'viewType'>) {
  const activeArea = getInteriorArea(slotNumber, targetFrameCount);
  const active = (area: typeof interiorAreas[number]) => activeArea === area;
  const fill = (area: typeof interiorAreas[number]) => active(area) ? '#2563eb' : '#334155';
  const stroke = (area: typeof interiorAreas[number]) => active(area) ? '#dbeafe' : '#64748b';

  return (
    <div className={compact ? 'h-full w-full' : 'mx-auto w-full max-w-[330px]'}>
      <svg viewBox="0 0 200 200" role="img" aria-label={`Área interna a fotografar: ${activeArea}`} className="h-full w-full">
        <rect x="30" y="25" width="140" height="155" rx="38" fill="#111827" stroke="#64748b" strokeWidth="3" />
        <path d="M45 49 Q100 28 155 49 L149 76 L51 76 Z" fill={fill('dashboard')} stroke={stroke('dashboard')} strokeWidth="2" />
        <circle cx="70" cy="61" r="16" fill={fill('steering')} stroke={stroke('steering')} strokeWidth="3" />
        <circle cx="70" cy="61" r="6" fill="#0f172a" />
        <rect x="91" y="46" width="37" height="23" rx="4" fill={fill('multimedia')} stroke={stroke('multimedia')} strokeWidth="2" />
        <path d="M91 80 L109 80 L119 127 L81 127 Z" fill={fill('console')} stroke={stroke('console')} strokeWidth="2" />
        <rect x="43" y="84" width="39" height="47" rx="13" fill={fill('driver-seat')} stroke={stroke('driver-seat')} strokeWidth="2" />
        <rect x="118" y="84" width="39" height="47" rx="13" fill={fill('passenger-seat')} stroke={stroke('passenger-seat')} strokeWidth="2" />
        <path d="M48 143 Q100 127 152 143 L150 166 Q100 177 50 166 Z" fill={fill('rear-seats')} stroke={stroke('rear-seats')} strokeWidth="2" />
        <path d="M34 72 L43 78 L43 139 L34 145" fill="none" stroke={stroke('doors')} strokeWidth={active('doors') ? 7 : 3} />
        <path d="M166 72 L157 78 L157 139 L166 145" fill="none" stroke={stroke('doors')} strokeWidth={active('doors') ? 7 : 3} />
        <circle cx="100" cy="105" r="68" fill="none" stroke={active('doors') ? '#60a5fa' : 'transparent'} strokeWidth="3" strokeDasharray="5 4" />
      </svg>
      {!compact && (
        <div className="-mt-1 text-center">
          <p className="text-sm font-bold text-blue-300">Área azul: enquadre este detalhe</p>
          <p className="text-xs text-slate-400">Mantenha a imagem reta e com boa iluminação.</p>
        </div>
      )}
    </div>
  );
}
