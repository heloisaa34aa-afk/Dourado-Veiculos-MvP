import React, { useState } from 'react';
import { useVehicle360 } from '../hooks/useVehicle360';
import { ImageCoordinateStage } from './360/ImageCoordinateStage';
import { FrameUploader } from './360/FrameUploader';
import { Trash2, CheckCircle2, ChevronLeft, ChevronRight, Plus, AlertTriangle, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { Car } from '../types';
import { validation360 } from '../utils/validation360';

interface Admin360ModuleProps {
  cars: Car[];
}

export function Admin360Module({ cars }: Admin360ModuleProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  if (cars.length === 0) {
    return <div className="p-8 text-center text-gray-500">Nenhum veículo cadastrado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Veículo</label>
        <select 
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          className="w-full sm:w-96 rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
        >
          <option value="">-- Selecione --</option>
          {cars.map(car => (
            <option key={car.id} value={car.id}>{car.brand} {car.model} ({car.plateEnd})</option>
          ))}
        </select>
      </div>

      {selectedVehicleId && <Vehicle360Editor vehicleId={selectedVehicleId} />}
    </div>
  );
}

function Vehicle360Editor({ vehicleId }: { vehicleId: string }) {
  const { 
    project, loading, reload, currentFrame, setCurrentFrame, totalFrames,
    handlePointerDown, handlePointerMove, handlePointerUp,
    nextFrame, prevFrame, uploadFrames, uploading, uploadProgress,
    publishProject, deleteProject, hotspots, damageMarkers,
    createHotspot, deleteHotspot, createDamageMarker, deleteDamageMarker,
    error: hookError
  } = useVehicle360(vehicleId, 'admin');

  const [isCreating, setIsCreating] = useState(false);
  const [addingPoi, setAddingPoi] = useState(false);
  const [addingDamage, setAddingDamage] = useState(false);
  const [poiForm, setPoiForm] = useState({ title: '', description: '', file: null as File | null, posX: 0, posY: 0 });
  const [damageForm, setDamageForm] = useState({ title: '', description: '', category: 'Outro', files: [] as File[], posX: 0, posY: 0 });
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = hookError?.message || localError;

  const handleCreateProject = async () => {
    try {
      setIsCreating(true);
      setLocalError(null);
      // createProject doesn't exist on hook directly, wait, I forgot to export it from hook. 
      // Actually we have it in vehicle360.service.ts
      // Let's use vehicle360Service directly here if not in hook
    } catch (err: any) {
      setLocalError('Erro ao criar projeto 360: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando módulo 360...</div>;

  if (!project) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Visão 360° não configurada</h3>
        <p className="text-gray-500 mb-6">Este veículo ainda não possui um projeto 360°.</p>
        <button
          onClick={async () => {
             setIsCreating(true);
             const { vehicle360Service } = await import('../services/vehicle360.service');
             try {
                await vehicle360Service.createProject(vehicleId);
                await reload();
             } catch(err) { setLocalError('Error creating project'); }
             setIsCreating(false);
          }}
          disabled={isCreating}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isCreating ? 'Criando...' : 'Criar Projeto 360°'}
        </button>
        {localError && <p className="text-red-500 mt-2">{localError}</p>}
      </div>
    );
  }

  const currentFrameData = project.frames?.[currentFrame];
  
  // Combine markers for ImageCoordinateStage
  const stageMarkers = [
    ...hotspots.map(h => ({ id: h.id, x: h.posX, y: h.posY, label: h.title, frameNumber: h.frameNumber, type: 'hotspot' as const })),
    ...damageMarkers.map(d => ({ id: d.id, x: d.posX, y: d.posY, label: d.title, frameNumber: d.frameNumber, type: 'damage' as const }))
  ].filter(m => Math.abs(m.frameNumber - currentFrame) <= 2);

  const handleStageClick = (x: number, y: number) => {
    if (addingPoi) {
      setPoiForm(prev => ({ ...prev, posX: x, posY: y }));
    } else if (addingDamage) {
      setDamageForm(prev => ({ ...prev, posX: x, posY: y }));
    }
  };

  const submitPoi = async () => {
    if (!poiForm.title || !poiForm.file) {
      setLocalError("Título e foto são obrigatórios para POI.");
      return;
    }
    try {
      setLocalError(null);
      await createHotspot({
        title: poiForm.title,
        description: poiForm.description,
        frameNumber: currentFrame,
        posX: poiForm.posX,
        posY: poiForm.posY,
        active: true
      }, poiForm.file);
      setAddingPoi(false);
      setPoiForm({ title: '', description: '', file: null, posX: 0, posY: 0 });
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const submitDamage = async () => {
    if (!damageForm.title || damageForm.files.length === 0) {
      setLocalError("Título e pelo menos uma foto são obrigatórios para Avaria.");
      return;
    }
    try {
      setLocalError(null);
      await createDamageMarker({
        title: damageForm.title,
        description: damageForm.description,
        category: damageForm.category,
        frameNumber: currentFrame,
        posX: damageForm.posX,
        posY: damageForm.posY,
      }, damageForm.files);
      setAddingDamage(false);
      setDamageForm({ title: '', description: '', category: 'Outro', files: [], posX: 0, posY: 0 });
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const publishChecklist = project.frames ? validation360.checklist360(project, project.frames) : { valid: false, errors: ['Nenhum frame'] };

  return (
    <div className="space-y-6 relative">
      {displayError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 whitespace-pre-wrap">{displayError}</div>
          <button onClick={() => setLocalError(null)}><X size={18}/></button>
        </div>
      )}

      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Gerenciador 360°</h3>
          <p className="text-sm text-gray-500">
            Status: <span className="font-semibold uppercase">{project.status}</span> | 
            Frames: {totalFrames}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { if(window.confirm('Excluir projeto e todos os arquivos?')) deleteProject(); }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            <Trash2 size={16} /> Excluir Projeto
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <h4 className="font-medium mb-4">Preview e Edição</h4>
        
        {totalFrames === 0 ? (
          <FrameUploader onUpload={uploadFrames} uploading={uploading} progress={uploadProgress} />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 justify-center mb-2">
              <button onClick={prevFrame} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                <ChevronLeft size={20} />
              </button>
              <span className="font-mono flex items-center px-4 bg-gray-100 rounded-lg">
                Frame {currentFrame + 1} / {totalFrames}
              </span>
              <button onClick={nextFrame} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                <ChevronRight size={20} />
              </button>
            </div>
            
            {currentFrameData && (
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <ImageCoordinateStage
                  imageUrl={currentFrameData.imageUrl}
                  markers={[...stageMarkers, ...(addingPoi || addingDamage ? [{ id: 'temp', x: addingPoi ? poiForm.posX : damageForm.posX, y: addingPoi ? poiForm.posY : damageForm.posY, content: <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-md animate-pulse" /> }] : [])]}
                  onCoordinateClick={({x, y}) => handleStageClick(x, y)}
                  className="cursor-crosshair"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
              </div>
            )}
            
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg flex-wrap gap-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => { setAddingPoi(!addingPoi); setAddingDamage(false); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${addingPoi ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                >
                  <Plus size={16} /> {addingPoi ? 'Cancelar POI' : 'Ponto de Interesse'}
                </button>
                <button 
                  onClick={() => { setAddingDamage(!addingDamage); setAddingPoi(false); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${addingDamage ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                >
                  <Plus size={16} /> {addingDamage ? 'Cancelar Avaria' : 'Avaria'}
                </button>
              </div>
              
              <button 
                onClick={publishProject}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                disabled={!publishChecklist.valid || project.status === 'completed' || uploading}
              >
                <CheckCircle2 size={16} /> {project.status === 'completed' ? 'Publicado' : 'Publicar'}
              </button>
            </div>
            
            {!publishChecklist.valid && (
               <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                 <h5 className="font-semibold mb-2">Pendências para publicação:</h5>
                 <ul className="list-disc pl-5 space-y-1">
                   {publishChecklist.errors.map((e, i) => <li key={i}>{e}</li>)}
                 </ul>
               </div>
            )}
            
            {addingPoi && (
               <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                 <h5 className="font-medium text-blue-900">Novo Ponto de Interesse (Frame {currentFrame + 1})</h5>
                 <p className="text-xs text-blue-700">Clique na imagem acima para definir a posição do marcador.</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Título" value={poiForm.title} onChange={e => setPoiForm(p=>({...p, title: e.target.value}))} className="rounded-md border-gray-300" />
                    <input type="text" placeholder="Descrição" value={poiForm.description} onChange={e => setPoiForm(p=>({...p, description: e.target.value}))} className="rounded-md border-gray-300" />
                 </div>
                 <input type="file" accept="image/jpeg, image/png, image/webp" onChange={e => setPoiForm(p=>({...p, file: e.target.files?.[0] || null}))} className="text-sm" />
                 <button onClick={submitPoi} disabled={uploading} className="w-full py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">Salvar POI</button>
               </div>
            )}
            
            {addingDamage && (
               <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-4">
                 <h5 className="font-medium text-red-900">Nova Avaria (Frame {currentFrame + 1})</h5>
                 <p className="text-xs text-red-700">Clique na imagem acima para definir a posição do marcador.</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Título" value={damageForm.title} onChange={e => setDamageForm(p=>({...p, title: e.target.value}))} className="rounded-md border-gray-300" />
                    <select value={damageForm.category} onChange={e => setDamageForm(p=>({...p, category: e.target.value}))} className="rounded-md border-gray-300">
                       <option>Risco</option><option>Amassado</option><option>Pintura</option><option>Outro</option>
                    </select>
                    <input type="text" placeholder="Descrição" value={damageForm.description} onChange={e => setDamageForm(p=>({...p, description: e.target.value}))} className="rounded-md border-gray-300 sm:col-span-2" />
                 </div>
                 <input type="file" multiple accept="image/jpeg, image/png, image/webp" onChange={e => setDamageForm(p=>({...p, files: Array.from(e.target.files || [])}))} className="text-sm" />
                 <button onClick={submitDamage} disabled={uploading} className="w-full py-2 bg-red-600 text-white rounded-md disabled:opacity-50">Salvar Avaria</button>
               </div>
            )}
            
            {/* List existing POIs/Damages to allow deletion */}
            {(hotspots.length > 0 || damageMarkers.length > 0) && (
              <div className="mt-8 border-t pt-4">
                <h5 className="font-medium mb-4">Marcadores Cadastrados</h5>
                <div className="space-y-2">
                  {hotspots.map(h => (
                    <div key={h.id} className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                      <div><span className="font-semibold text-blue-700">[POI]</span> Frame {h.frameNumber + 1}: {h.title}</div>
                      <button onClick={() => { if(window.confirm('Excluir?')) deleteHotspot(h); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  {damageMarkers.map(d => (
                    <div key={d.id} className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                      <div><span className="font-semibold text-red-700">[Avaria]</span> Frame {d.frameNumber + 1}: {d.title}</div>
                      <button onClick={() => { if(window.confirm('Excluir?')) deleteDamageMarker(d); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
