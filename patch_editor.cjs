const fs = require('fs');
let content = fs.readFileSync('src/components/360/MarkerTrackingEditor.tsx', 'utf8');

const importWorker = `import { ImageCoordinateStage } from './ImageCoordinateStage';
import { interpolateMarkerPositions } from '../../utils/interpolation';
import TrackingWorker from '../../workers/tracking.worker?worker';`;

content = content.replace(
  "import { ImageCoordinateStage } from './ImageCoordinateStage';\nimport { interpolateMarkerPositions } from '../../utils/interpolation';",
  importWorker
);

const stateCode = `  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [trackProgress, setTrackProgress] = useState('');
  const [pendingResults, setPendingResults] = useState<Vehicle360MarkerPosition[] | null>(null);`;

content = content.replace("  const [saving, setSaving] = useState(false);", stateCode);

const workerLogic = `  const handleAutoTrack = () => {
    if (!currentPos || !currentPos.visible) {
      alert("Selecione um frame onde o marcador esteja visível e posicionado corretamente.");
      return;
    }
    
    setTracking(true);
    setTrackProgress('Iniciando rastreamento...');
    
    const worker = new TrackingWorker();
    
    worker.onmessage = (e) => {
      const { type, message, results, error } = e.data;
      if (type === 'progress') {
        setTrackProgress(message);
      } else if (type === 'done') {
        setPendingResults(results);
        setTracking(false);
        worker.terminate();
      } else if (type === 'error') {
        alert("Erro no rastreamento: " + error);
        setTracking(false);
        worker.terminate();
      }
    };
    
    worker.postMessage({
      frames: frames.map(f => f.imageUrl),
      initialFrame: currentFrame,
      initialX: currentPos.posX,
      initialY: currentPos.posY
    });
  };
  
  const acceptResults = () => {
    if (pendingResults) {
      setPositions(pendingResults);
      setPendingResults(null);
    }
  };
  
  const discardResults = () => {
    setPendingResults(null);
  };`;

content = content.replace(
  "  const handleInterpolate = () => {",
  workerLogic + "\n\n  const handleInterpolate = () => {"
);

const renderLogic = `      <div className="flex flex-wrap gap-2 justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
        {tracking ? (
          <div className="w-full flex items-center gap-3 text-indigo-700">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">{trackProgress}</span>
          </div>
        ) : pendingResults ? (
          <div className="w-full flex items-center justify-between">
            <span className="text-sm font-medium text-amber-700">Prévia do rastreamento automático concluída.</span>
            <div className="flex gap-2">
              <button onClick={acceptResults} className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">Aceitar resultado</button>
              <button onClick={discardResults} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Descartar</button>
            </div>
          </div>
        ) : (
          <>
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
                onClick={handleAutoTrack}
                className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200"
              >
                Rastrear automaticamente
              </button>
              <button 
                onClick={handleInterpolate}
                className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200"
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
          </>
        )}
      </div>`;

content = content.replace(/      <div className="flex flex-wrap gap-2 justify-between items-center bg-white p-3 rounded-lg border border-gray-200">[\s\S]*?<\/div>\n    <\/div>/, renderLogic + '\n    </div>');

content = content.replace(
  `        {frames.map((frame, idx) => {
          const pos = positions.find(p => p.frameNumber === idx);`,
  `        {frames.map((frame, idx) => {
          const pos = (pendingResults || positions).find(p => p.frameNumber === idx);`
);

content = content.replace(
  `  const markers = currentPos && currentPos.visible ? [{`,
  `  const activePositions = pendingResults || positions;
  const currentActivePos = activePositions.find(p => p.frameNumber === currentFrame);
  const markers = currentActivePos && currentActivePos.visible ? [{
    id: 'tracker',
    x: currentActivePos.posX,
    y: currentActivePos.posY,
    content: <div className="w-6 h-6 rounded-full border-2 border-white shadow-lg bg-indigo-500/80 animate-pulse flex items-center justify-center text-xs text-white font-bold">{currentActivePos.isKeyframe ? 'K' : ''}</div>
  }] : [];`
);

content = content.replace(
  `  const markers = currentPos && currentPos.visible ? [{\n    id: 'tracker',\n    x: currentPos.posX,\n    y: currentPos.posY,\n    content: <div className="w-6 h-6 rounded-full border-2 border-white shadow-lg bg-indigo-500/80 animate-pulse flex items-center justify-center text-xs text-white font-bold">{currentPos.isKeyframe ? 'K' : ''}</div>\n  }] : [];`,
  ``
);

fs.writeFileSync('src/components/360/MarkerTrackingEditor.tsx', content);
