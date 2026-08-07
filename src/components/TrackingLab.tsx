import React, { useState, useEffect, useCallback } from 'react';
import { useVehicle360 } from '../hooks/useVehicle360';
import { vehicle360Service } from '../services/vehicle360.service';
import { Car, Vehicle360Hotspot, Vehicle360DamageMarker, Vehicle360MarkerPosition } from '../types';
import { ImageCoordinateStage } from './360/ImageCoordinateStage';
import { Play, Focus, Search, Activity, CheckCircle2, AlertTriangle, ArrowRight, Save, LayoutDashboard, RefreshCw, Loader2, MousePointer2, ChevronRight, ChevronLeft } from 'lucide-react';
import { TrackingEvaluation, trackingProvider } from '../services/trackingProvider';

interface TrackingLabProps {
  cars: Car[];
}

export function TrackingLab({ cars }: TrackingLabProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  if (cars.length === 0) {
    return <div className="p-8 text-center text-gray-500">Nenhum veículo cadastrado.</div>;
  }

  if (selectedVehicleId) {
    const car = cars.find(c => c.id === selectedVehicleId);
    return <TrackingLabWorkspace vehicleId={selectedVehicleId} car={car!} onBack={() => setSelectedVehicleId('')} />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto mt-8">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Tracking Lab MVP</h2>
            <p className="text-slate-500">Validação e otimização do modelo de rastreamento (BootsTAPIR).</p>
          </div>
        </div>
        
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <label className="block text-sm font-bold text-slate-700 mb-2">Selecione uma Sequência (Veículo)</label>
          <select 
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full rounded-xl border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 mb-4"
          >
            <option value="">-- Escolha um veículo --</option>
            {cars.map(car => (
              <option key={car.id} value={car.id}>{car.brand} {car.model} ({car.plateEnd})</option>
            ))}
          </select>
          <div className="text-sm text-slate-500 flex items-start gap-2">
            <Search size={16} className="mt-0.5 shrink-0" />
            <p>O Tracking Lab permite definir posições de referência manual (ground truth) e comparar com as predições do modelo de rastreamento para gerar métricas de MVP.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackingLabWorkspace({ vehicleId, car, onBack }: { vehicleId: string, car: Car, onBack: () => void }) {
  const { 
    project, loading, currentFrame, setCurrentFrame, totalFrames,
    handlePointerDown, handlePointerMove, handlePointerUp,
    hotspots, damageMarkers
  } = useVehicle360(vehicleId, 'admin');

  const [mode, setMode] = useState<'select_marker' | 'ground_truth' | 'running' | 'results'>('select_marker');
  const [selectedMarker, setSelectedMarker] = useState<{id: string, type: 'poi'|'damage'} | null>(null);
  
  const [groundTruth, setGroundTruth] = useState<Record<number, {x: number, y: number, visible: boolean}>>({});
  const [predictions, setPredictions] = useState<Vehicle360MarkerPosition[]>([]);
  const [evaluation, setEvaluation] = useState<TrackingEvaluation | null>(null);
  const [initialFrame, setInitialFrame] = useState(0);

  // Clear state when vehicle or selected marker changes
  useEffect(() => {
    setGroundTruth({});
    setPredictions([]);
    setEvaluation(null);
    setInitialFrame(0);
    // mode is handled separately or we can just leave it if it's already 'select_marker' when changing car
  }, [vehicleId, selectedMarker?.id]);

  if (loading || !project) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-indigo-500 w-12 h-12" /></div>;
  }

  if (mode === 'select_marker') {
    return (
      <div className="max-w-5xl mx-auto mt-8 space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-medium px-4 py-2 flex items-center gap-2">
            <ChevronLeft size={20} /> Voltar
          </button>
          <div className="font-bold text-slate-900">{car.brand} {car.model}</div>
          <div className="w-24"></div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="text-lg font-bold text-slate-900 mb-6">1. Selecione um Marcador para Teste</h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {hotspots.map(h => (
               <div key={h.id} 
                    onClick={() => { setSelectedMarker({id: h.id, type: 'poi'}); setInitialFrame(h.positions?.[0]?.frameNumber || 0); setMode('ground_truth'); }}
                    className="border border-slate-200 p-4 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-colors flex items-start gap-3">
                 <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><Search size={20} /></div>
                 <div>
                   <div className="font-bold text-slate-900">{h.title} (POI)</div>
                   <div className="text-xs text-slate-500 mt-1">{h.positions?.length || 0} posições salvas</div>
                 </div>
               </div>
             ))}
             {damageMarkers.map(d => (
               <div key={d.id} 
                    onClick={() => { setSelectedMarker({id: d.id, type: 'damage'}); setInitialFrame(d.positions?.[0]?.frameNumber || 0); setMode('ground_truth'); }}
                    className="border border-slate-200 p-4 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-colors flex items-start gap-3">
                 <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0"><AlertTriangle size={20} /></div>
                 <div>
                   <div className="font-bold text-slate-900">{d.title} (Avaria)</div>
                   <div className="text-xs text-slate-500 mt-1">{d.positions?.length || 0} posições salvas</div>
                 </div>
               </div>
             ))}
           </div>
           
           {hotspots.length === 0 && damageMarkers.length === 0 && (
             <div className="p-8 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
               Nenhum marcador encontrado neste veículo. Adicione no Estúdio 360 primeiro.
             </div>
           )}
        </div>
      </div>
    );
  }

  const handleStageClick = (x: number, y: number) => {
    if (mode === 'ground_truth') {
      setGroundTruth(prev => ({
        ...prev,
        [currentFrame]: { x, y, visible: true }
      }));
    }
  };

  const toggleVisibility = () => {
    if (groundTruth[currentFrame]) {
      setGroundTruth(prev => ({
        ...prev,
        [currentFrame]: { ...prev[currentFrame], visible: !prev[currentFrame].visible }
      }));
    } else {
      setGroundTruth(prev => ({
        ...prev,
        [currentFrame]: { x: 50, y: 50, visible: false }
      }));
    }
  };

  const getStageMarkers = () => {
    const markers = [];
    
    if (groundTruth[currentFrame] && groundTruth[currentFrame].visible) {
      markers.push({
        id: 'gt',
        x: groundTruth[currentFrame].x,
        y: groundTruth[currentFrame].y,
        content: <div className="w-4 h-4 rounded-full border-2 border-white bg-green-500 shadow-md"></div>
      });
    }

    if (mode === 'results') {
      const pred = predictions.find(p => p.frameNumber === currentFrame);
      if (pred && pred.visible) {
        markers.push({
          id: 'pred',
          x: pred.posX,
          y: pred.posY,
          content: <div className="w-4 h-4 rounded-full border-2 border-white bg-indigo-500 shadow-md"></div>
        });
      }
    }

    return markers;
  };

  const calculateMetrics = (preds: Vehicle360MarkerPosition[]) => {
    const gtFrames = Object.keys(groundTruth).map(Number);
    if (gtFrames.length === 0) return null;

    let errors = [];
    let tp = 0, fp = 0, fn = 0, tn = 0;

    for (const frame of gtFrames) {
      const gt = groundTruth[frame];
      const pred = preds.find(p => p.frameNumber === frame);
      
      const pVis = pred ? pred.visible : false;
      
      if (gt.visible && pVis && pred) {
        tp++;
        // Calculate euclidean distance assuming 100x100 space
        const dist = Math.sqrt(Math.pow(gt.x - pred.posX, 2) + Math.pow(gt.y - pred.posY, 2));
        errors.push(dist);
      } else if (gt.visible && !pVis) {
        fn++;
      } else if (!gt.visible && pVis) {
        fp++;
      } else if (!gt.visible && !pVis) {
        tn++;
      }
    }

    errors.sort((a, b) => a - b);
    const medianError = errors.length > 0 ? errors[Math.floor(errors.length / 2)] : 0;
    const p90Error = errors.length > 0 ? errors[Math.floor(errors.length * 0.9)] : 0;
    
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    
    const maxAllowedError = 3.0; // 3% of image
    const qualityScore = (f1 * 0.5) + (Math.max(0, 1 - (medianError / maxAllowedError)) * 0.5);
    
    const accepted = medianError < maxAllowedError && f1 > 0.8;
    const reasons = [];
    if (medianError >= maxAllowedError) reasons.push(`Erro mediano (${medianError.toFixed(1)}%) muito alto (limite: ${maxAllowedError}%)`);
    if (f1 <= 0.8) reasons.push(`F1 de visibilidade (${(f1*100).toFixed(1)}%) muito baixo (mínimo: 80%)`);

    return {
      medianNormalizedError: medianError,
      p90NormalizedError: p90Error,
      visibilityPrecision: precision,
      visibilityRecall: recall,
      visibilityF1: f1,
      trackedFramePercentage: (tp + tn) / gtFrames.length,
      qualityScore,
      processingTimeMs: 0,
      accepted,
      rejectionReasons: reasons
    };
  };

  const runEvaluation = async () => {
    if (!selectedMarker) return;
    const gtFrames = Object.keys(groundTruth).map(Number);
    if (gtFrames.length < 5) {
      alert("Defina o Ground Truth em pelo menos 5 frames para uma avaliação significativa.");
      return;
    }

    if (!groundTruth[initialFrame]) {
      alert("O frame inicial selecionado não possui Ground Truth definido.");
      return;
    }

    setMode('running');
    
    const start = Date.now();
    try {
      const result = await trackingProvider.track({
        frames: project!.frames!.map(f => f.imageUrl),
        initialFrame: initialFrame,
        initialX: groundTruth[initialFrame].x,
        initialY: groundTruth[initialFrame].y,
        projectId: project!.id,
        markerId: selectedMarker.id,
        markerType: selectedMarker.type
      });
      
      const elapsed = Date.now() - start;
      const preds = result.positions || [];
      
      setPredictions(preds);
      const metrics = calculateMetrics(preds);
      if (metrics) {
        metrics.processingTimeMs = elapsed;
        setEvaluation(metrics);
      }
      setMode('results');
    } catch (err: any) {
      alert("Erro na avaliação: " + err.message);
      setMode('ground_truth');
    }
  };

  const currentFrameData = project.frames?.[currentFrame];

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col bg-slate-50">
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0">
         <div className="flex items-center gap-4">
           <button onClick={() => setMode('select_marker')} className="text-slate-500 hover:text-slate-800">
             <ChevronLeft size={20} />
           </button>
           <h1 className="font-bold text-slate-900 flex items-center gap-2">
             <Activity className="text-indigo-600" size={20} /> Tracking Lab
           </h1>
         </div>
         <div className="flex gap-2">
           {mode === 'ground_truth' && (
             <button onClick={runEvaluation} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center gap-2">
               <Play size={16} /> Rodar TAPIR
             </button>
           )}
           {mode === 'results' && (
             <button onClick={() => setMode('ground_truth')} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-300 flex items-center gap-2">
               <RefreshCw size={16} /> Ajustar Ground Truth
             </button>
           )}
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Viewport */}
        <div className="flex-1 bg-slate-950 flex flex-col relative">
          <div className="flex-1 relative">
            {currentFrameData && (
              <ImageCoordinateStage
                imageUrl={currentFrameData.imageUrl}
                markers={getStageMarkers()}
                className="cursor-crosshair"
                onCoordinateClick={({x, y}) => handleStageClick(x, y)}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            )}
            
            {/* Overlay indicators */}
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="bg-black/50 text-white px-3 py-1 rounded backdrop-blur text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div> Ground Truth
              </div>
              {mode === 'results' && (
                <div className="bg-black/50 text-white px-3 py-1 rounded backdrop-blur text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div> Predição
                </div>
              )}
            </div>
            
            {mode === 'running' && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-4" />
                <div className="text-white font-bold text-xl">Rastreando com TAPIR...</div>
                <div className="text-indigo-200 mt-2">Processando {totalFrames} frames no backend</div>
              </div>
            )}
          </div>
          
          {/* Timeline */}
          <div className="h-24 bg-slate-900 border-t border-slate-800 flex overflow-x-auto p-2 gap-1 scrollbar-thin">
            {project.frames?.map((f, i) => {
               const hasGt = groundTruth[i];
               const hasPred = predictions.find(p => p.frameNumber === i);
               
               let borderClass = "border-slate-800";
               if (i === currentFrame) borderClass = "border-white scale-105 z-10";
               else if (mode === 'results' && hasGt && hasPred) {
                 // Color code error roughly
                 const gt = groundTruth[i];
                 const dist = gt.visible && hasPred.visible ? Math.sqrt(Math.pow(gt.x - hasPred.posX, 2) + Math.pow(gt.y - hasPred.posY, 2)) : (gt.visible === hasPred.visible ? 0 : 10);
                 borderClass = dist < 2 ? "border-green-500" : (dist < 5 ? "border-amber-500" : "border-red-500");
               }
               
               return (
                 <button key={f.id} onClick={() => setCurrentFrame(i)} className={`relative h-full aspect-video shrink-0 border-2 transition-all ${borderClass} rounded overflow-hidden`}>
                   <img src={f.imageUrl} className="w-full h-full object-cover opacity-75" />
                   {hasGt && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 shadow"></div>}
                   {i === initialFrame && <div className="absolute top-1 left-1 text-[8px] bg-indigo-600 text-white px-1 rounded uppercase font-bold">Init</div>}
                 </button>
               );
            })}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
           {mode === 'ground_truth' ? (
             <div className="p-6">
               <h3 className="font-bold text-slate-900 mb-4 text-lg">Definir Ground Truth</h3>
               <p className="text-sm text-slate-600 mb-6">Navegue pelos frames e clique na imagem para marcar a posição exata (real) da peça.</p>
               
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                 <div className="font-bold text-slate-900 mb-2">Frame Atual: {currentFrame + 1}</div>
                 <div className="space-y-3">
                   <button onClick={() => setInitialFrame(currentFrame)} className={`w-full py-2 text-sm font-bold rounded-lg border ${initialFrame === currentFrame ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                     Usar como Frame Inicial (Init)
                   </button>
                   <button onClick={toggleVisibility} className={`w-full py-2 text-sm font-bold rounded-lg border ${groundTruth[currentFrame]?.visible ? 'bg-slate-200 border-slate-300 text-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                     {groundTruth[currentFrame]?.visible ? 'Ocultar Peça neste Frame' : 'Marcar Peça Invisível'}
                   </button>
                 </div>
               </div>
               
               <div className="flex items-center gap-2 text-sm text-slate-600">
                 <div className="font-bold text-slate-900">{Object.keys(groundTruth).length}</div> frames com anotação
               </div>
             </div>
           ) : mode === 'results' && evaluation ? (
             <div className="p-6 flex flex-col h-full overflow-y-auto">
               <h3 className="font-bold text-slate-900 mb-4 text-lg">Resultados MVP</h3>
               
               <div className={`p-4 rounded-xl border mb-6 ${evaluation.accepted ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                 <div className="flex items-center gap-2 mb-2">
                   {evaluation.accepted ? <CheckCircle2 size={24} className="text-green-600" /> : <AlertTriangle size={24} className="text-red-600" />}
                   <div className="font-extrabold text-lg">{evaluation.accepted ? 'Critérios Atendidos' : 'Falhou no MVP'}</div>
                 </div>
                 {!evaluation.accepted && (
                   <ul className="text-sm mt-2 list-disc pl-5 space-y-1 text-red-800">
                     {evaluation.rejectionReasons.map((r, i) => <li key={i}>{r}</li>)}
                   </ul>
                 )}
               </div>

               <div className="space-y-4">
                 <div className="border border-slate-200 rounded-xl p-4">
                   <div className="text-xs font-bold text-slate-500 uppercase mb-3">Erro Espacial</div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <div className="text-2xl font-bold text-slate-900">{evaluation.medianNormalizedError.toFixed(2)}%</div>
                       <div className="text-xs text-slate-500">Erro Mediano</div>
                     </div>
                     <div>
                       <div className="text-2xl font-bold text-slate-900">{evaluation.p90NormalizedError.toFixed(2)}%</div>
                       <div className="text-xs text-slate-500">P90 (Pior caso)</div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="border border-slate-200 rounded-xl p-4">
                   <div className="text-xs font-bold text-slate-500 uppercase mb-3">Oclusão (Visibilidade)</div>
                   <div className="grid grid-cols-3 gap-2">
                     <div>
                       <div className="text-xl font-bold text-slate-900">{(evaluation.visibilityPrecision * 100).toFixed(0)}%</div>
                       <div className="text-xs text-slate-500">Precision</div>
                     </div>
                     <div>
                       <div className="text-xl font-bold text-slate-900">{(evaluation.visibilityRecall * 100).toFixed(0)}%</div>
                       <div className="text-xs text-slate-500">Recall</div>
                     </div>
                     <div>
                       <div className="text-xl font-bold text-indigo-600">{(evaluation.visibilityF1 * 100).toFixed(0)}%</div>
                       <div className="text-xs text-indigo-500 font-bold">F1 Score</div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="border border-slate-200 rounded-xl p-4">
                   <div className="text-xs font-bold text-slate-500 uppercase mb-1">Performance</div>
                   <div className="text-slate-900 font-medium">{evaluation.processingTimeMs} ms</div>
                   <div className="text-xs text-slate-500 mt-1">Tempo total para {totalFrames} frames</div>
                 </div>
               </div>
             </div>
           ) : null}
        </div>
      </div>
    </div>
  );
}
