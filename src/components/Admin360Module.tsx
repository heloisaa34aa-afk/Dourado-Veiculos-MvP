import React, { useState, useEffect, useRef } from 'react';
import { useVehicle360 } from '../hooks/useVehicle360';
import { vehicle360Service } from '../services/vehicle360.service';
import { ImageCoordinateStage } from './360/ImageCoordinateStage';
import { FrameUploader } from './360/FrameUploader';
import { Trash2, CheckCircle2, ChevronLeft, ChevronRight, Plus, AlertTriangle, AlertCircle, X, Info, Edit2, Move } from 'lucide-react';
import { Car, Vehicle360Hotspot, Vehicle360DamageMarker } from '../types';
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
    publishProject, unpublishProject, deleteProject, hotspots, damageMarkers,
    createHotspot, updateHotspot, repositionHotspot, deleteHotspot, 
    createDamageMarker, updateDamageMarker, repositionDamageMarker, deleteDamageMarker,
    error: hookError, frames
  } = useVehicle360(vehicleId, 'admin');

  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'frames' | 'pontos' | 'avarias' | 'publicacao'>('frames');
  
  const [addingPoi, setAddingPoi] = useState(false);
  const [addingDamage, setAddingDamage] = useState(false);
  const [editingPoi, setEditingPoi] = useState<Vehicle360Hotspot | null>(null);
  const [editingDamage, setEditingDamage] = useState<Vehicle360DamageMarker | null>(null);
  const [repositioningId, setRepositioningId] = useState<string | null>(null);
  
  const [poiForm, setPoiForm] = useState({ title: '', description: '', file: null as File | null, posX: 0, posY: 0 });
  const [damageForm, setDamageForm] = useState({ title: '', description: '', category: 'Outro', files: [] as File[], posX: 0, posY: 0 });
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = hookError?.message || localError;

  const currentFrameData = project?.frames?.[currentFrame];

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando módulo 360...</div>;

  if (!project) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Visão 360° não configurada</h3>
        <p className="text-gray-500 mb-6">Este veículo ainda não possui um projeto 360°.</p>
        <button
          onClick={async () => {
             setIsCreating(true);
             try {
                await vehicle360Service.createProject(vehicleId);
                await reload();
             } catch(err) { setLocalError('Erro ao criar projeto'); }
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

  // Markers shown exactly on current frame
  const stageMarkers = [
    ...hotspots.filter(h => h.frameNumber === currentFrame).map(h => ({ 
      id: h.id, 
      x: h.posX, 
      y: h.posY, 
      content: <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg ${repositioningId === h.id ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500/80 hover:scale-110 transition-transform cursor-pointer'}`}><Info size={16} /></div> 
    })),
    ...damageMarkers.filter(d => d.frameNumber === currentFrame).map(d => ({ 
      id: d.id, 
      x: d.posX, 
      y: d.posY, 
      content: <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg ${repositioningId === d.id ? 'bg-yellow-500 animate-pulse' : 'bg-red-500/80 hover:scale-110 transition-transform cursor-pointer'}`}><AlertTriangle size={16} /></div>
    }))
  ];

  const handleStageClick = async (x: number, y: number) => {
    if (addingPoi) {
      setPoiForm(prev => ({ ...prev, posX: x, posY: y }));
    } else if (addingDamage) {
      setDamageForm(prev => ({ ...prev, posX: x, posY: y }));
    } else if (repositioningId) {
      const isPoi = hotspots.find(h => h.id === repositioningId);
      if (isPoi) {
        await repositionHotspot(repositioningId, x, y);
      } else {
        await repositionDamageMarker(repositioningId, x, y);
      }
      setRepositioningId(null);
    }
  };

  const submitPoi = async () => {
    if (!poiForm.title) {
      setLocalError("Título é obrigatório.");
      return;
    }
    try {
      setLocalError(null);
      if (editingPoi) {
        await updateHotspot(editingPoi.id, { title: poiForm.title, description: poiForm.description });
        setEditingPoi(null);
      } else {
        if (!poiForm.file) throw new Error("Foto é obrigatória para novo POI.");
        await createHotspot({
          title: poiForm.title,
          description: poiForm.description,
          frameNumber: currentFrame,
          posX: poiForm.posX,
          posY: poiForm.posY,
          active: true
        }, poiForm.file);
      }
      setAddingPoi(false);
      setPoiForm({ title: '', description: '', file: null, posX: 0, posY: 0 });
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const submitDamage = async () => {
    if (!damageForm.title) {
      setLocalError("Título é obrigatório.");
      return;
    }
    try {
      setLocalError(null);
      if (editingDamage) {
        await updateDamageMarker(editingDamage.id, { 
          title: damageForm.title, 
          description: damageForm.description,
          category: damageForm.category
        });
        setEditingDamage(null);
      } else {
        if (damageForm.files.length === 0) throw new Error("Foto é obrigatória para nova avaria.");
        await createDamageMarker({
          title: damageForm.title,
          description: damageForm.description,
          category: damageForm.category,
          frameNumber: currentFrame,
          posX: damageForm.posX,
          posY: damageForm.posY,
        }, damageForm.files);
      }
      setAddingDamage(false);
      setDamageForm({ title: '', description: '', category: 'Outro', files: [], posX: 0, posY: 0 });
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const publishChecklist = project.frames ? validation360.checklist360(project, project.frames) : { valid: false, errors: ['Nenhum frame'] };

  const startEditPoi = (h: Vehicle360Hotspot) => {
    setEditingPoi(h);
    setAddingPoi(true);
    setAddingDamage(false);
    setPoiForm({ title: h.title, description: h.description || '', file: null, posX: h.posX, posY: h.posY });
    setCurrentFrame(h.frameNumber);
  };

  const startEditDamage = (d: Vehicle360DamageMarker) => {
    setEditingDamage(d);
    setAddingDamage(true);
    setAddingPoi(false);
    setDamageForm({ title: d.title, description: d.description || '', category: d.category, files: [], posX: d.posX, posY: d.posY });
    setCurrentFrame(d.frameNumber);
  };

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
            Status: <span className={`font-semibold uppercase ${project.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>{project.status}</span> | 
            Frames: {totalFrames}
          </p>
        </div>
        <div className="flex gap-2">
          {project.status === 'completed' && (
            <button 
              onClick={unpublishProject}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 border border-yellow-200"
            >
              Despublicar
            </button>
          )}
          <button 
            onClick={() => { if(window.confirm('Excluir projeto e todos os arquivos?')) deleteProject(); }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            <Trash2 size={16} /> Excluir Projeto
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
          <button onClick={() => setActiveTab('frames')} className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'frames' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Frames</button>
          <button onClick={() => setActiveTab('pontos')} className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'pontos' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Pontos de Interesse ({hotspots.length})</button>
          <button onClick={() => setActiveTab('avarias')} className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'avarias' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Avarias ({damageMarkers.length})</button>
          <button onClick={() => setActiveTab('publicacao')} className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === 'publicacao' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Publicação</button>
        </div>

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
                  markers={[
                    ...stageMarkers, 
                    ...(addingPoi || addingDamage ? [{ id: 'temp', x: addingPoi ? poiForm.posX : damageForm.posX, y: addingPoi ? poiForm.posY : damageForm.posY, content: <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-md animate-pulse" /> }] : [])
                  ]}
                  onCoordinateClick={({x, y}) => handleStageClick(x, y)}
                  className={repositioningId || addingPoi || addingDamage ? "cursor-crosshair" : "cursor-ew-resize"}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
                {repositioningId && (
                  <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                     <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium animate-pulse">
                        Clique na imagem para definir a nova posição do marcador
                     </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Thumbnail Strip */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {frames.map((frame, idx) => (
                <div 
                  key={frame.id} 
                  onClick={() => setCurrentFrame(idx)}
                  className={`flex-shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${idx === currentFrame ? 'border-indigo-600 scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={frame.imageUrl} alt={`Frame ${idx+1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            {activeTab === 'frames' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Gerenciar Frames</h4>
                <FrameUploader onUpload={uploadFrames} uploading={uploading} progress={uploadProgress} />
              </div>
            )}

            {activeTab === 'pontos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                  <span className="text-gray-700">Selecione o frame acima e clique no botão para adicionar um novo ponto.</span>
                  <button 
                    onClick={() => { setAddingPoi(true); setAddingDamage(false); setEditingPoi(null); setPoiForm({ title: '', description: '', file: null, posX: 50, posY: 50 }); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    <Plus size={16} /> Novo POI
                  </button>
                </div>
                
                {addingPoi && (
                   <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                     <div className="flex justify-between items-center">
                       <h5 className="font-medium text-blue-900">{editingPoi ? 'Editar POI' : `Novo Ponto de Interesse (Frame ${currentFrame + 1})`}</h5>
                       <button onClick={() => setAddingPoi(false)} className="text-gray-500"><X size={20}/></button>
                     </div>
                     {!editingPoi && <p className="text-xs text-blue-700">Clique na imagem 360° para ajustar a posição do marcador.</p>}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" placeholder="Título" value={poiForm.title} onChange={e => setPoiForm(p=>({...p, title: e.target.value}))} className="rounded-md border-gray-300" />
                        <input type="text" placeholder="Descrição" value={poiForm.description} onChange={e => setPoiForm(p=>({...p, description: e.target.value}))} className="rounded-md border-gray-300" />
                     </div>
                     {!editingPoi && <input type="file" accept="image/jpeg, image/png, image/webp" onChange={e => setPoiForm(p=>({...p, file: e.target.files?.[0] || null}))} className="text-sm" />}
                     <button onClick={submitPoi} disabled={uploading} className="w-full py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 font-medium">Salvar POI</button>
                   </div>
                )}

                <div className="space-y-2">
                  {hotspots.map(h => (
                    <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-gray-200 gap-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentFrame(h.frameNumber)}>
                        <img src={h.imageUrl} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" />
                        <div>
                          <div className="font-semibold text-gray-900">{h.title} <span className="text-xs font-normal text-gray-500 ml-2">Frame {h.frameNumber + 1}</span></div>
                          <div className="text-sm text-gray-500">{h.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentFrame(h.frameNumber)} className="p-2 text-gray-600 hover:bg-gray-100 rounded" title="Localizar"><Info size={16}/></button>
                        <button onClick={() => setRepositioningId(h.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="Reposicionar"><Move size={16}/></button>
                        <button onClick={() => startEditPoi(h)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit2 size={16}/></button>
                        <button onClick={() => { if(window.confirm('Excluir este ponto?')) deleteHotspot(h); }} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Excluir"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {hotspots.length === 0 && !addingPoi && <div className="text-center p-8 text-gray-500 border border-dashed rounded-lg">Nenhum ponto de interesse cadastrado.</div>}
                </div>
              </div>
            )}

            {activeTab === 'avarias' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                  <span className="text-gray-700">Selecione o frame acima e clique no botão para adicionar uma avaria.</span>
                  <button 
                    onClick={() => { setAddingDamage(true); setAddingPoi(false); setEditingDamage(null); setDamageForm({ title: '', description: '', category: 'Outro', files: [], posX: 50, posY: 50 }); }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    <Plus size={16} /> Nova Avaria
                  </button>
                </div>
                
                {addingDamage && (
                   <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-4">
                     <div className="flex justify-between items-center">
                       <h5 className="font-medium text-red-900">{editingDamage ? 'Editar Avaria' : `Nova Avaria (Frame ${currentFrame + 1})`}</h5>
                       <button onClick={() => setAddingDamage(false)} className="text-gray-500"><X size={20}/></button>
                     </div>
                     {!editingDamage && <p className="text-xs text-red-700">Clique na imagem 360° para ajustar a posição do marcador.</p>}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" placeholder="Título" value={damageForm.title} onChange={e => setDamageForm(p=>({...p, title: e.target.value}))} className="rounded-md border-gray-300" />
                        <select value={damageForm.category} onChange={e => setDamageForm(p=>({...p, category: e.target.value}))} className="rounded-md border-gray-300">
                           <option>Risco</option><option>Amassado</option><option>Pintura</option><option>Outro</option>
                        </select>
                        <input type="text" placeholder="Descrição" value={damageForm.description} onChange={e => setDamageForm(p=>({...p, description: e.target.value}))} className="rounded-md border-gray-300 sm:col-span-2" />
                     </div>
                     {!editingDamage && <input type="file" multiple accept="image/jpeg, image/png, image/webp" onChange={e => setDamageForm(p=>({...p, files: Array.from(e.target.files || [])}))} className="text-sm" />}
                     <button onClick={submitDamage} disabled={uploading} className="w-full py-2 bg-red-600 text-white rounded-md disabled:opacity-50 font-medium">Salvar Avaria</button>
                   </div>
                )}

                <div className="space-y-2">
                  {damageMarkers.map(d => (
                    <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-gray-200 gap-4 hover:border-red-300 transition-colors">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentFrame(d.frameNumber)}>
                        {d.images?.[0] && <img src={d.images[0].imageUrl} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" />}
                        <div>
                          <div className="font-semibold text-gray-900">{d.title} <span className="text-xs font-normal text-gray-500 ml-2">Frame {d.frameNumber + 1}</span></div>
                          <div className="text-sm text-gray-500">[{d.category}] {d.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentFrame(d.frameNumber)} className="p-2 text-gray-600 hover:bg-gray-100 rounded" title="Localizar"><Info size={16}/></button>
                        <button onClick={() => setRepositioningId(d.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="Reposicionar"><Move size={16}/></button>
                        <button onClick={() => startEditDamage(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit2 size={16}/></button>
                        <button onClick={() => { if(window.confirm('Excluir esta avaria?')) deleteDamageMarker(d); }} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Excluir"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {damageMarkers.length === 0 && !addingDamage && <div className="text-center p-8 text-gray-500 border border-dashed rounded-lg">Nenhuma avaria cadastrada.</div>}
                </div>
              </div>
            )}

            {activeTab === 'publicacao' && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">Status de Publicação</h4>
                {!publishChecklist.valid ? (
                   <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800 mb-4">
                     <h5 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Pendências para publicação:</h5>
                     <ul className="list-disc pl-5 space-y-1">
                       {publishChecklist.errors.map((e, i) => <li key={i}>{e}</li>)}
                     </ul>
                   </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-sm text-green-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={18} /> O projeto está pronto para publicação.
                  </div>
                )}
                
                <div className="flex gap-4">
                  <button 
                    onClick={publishProject}
                    className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition-colors"
                    disabled={!publishChecklist.valid || project.status === 'completed' || uploading}
                  >
                    <CheckCircle2 size={20} /> {project.status === 'completed' ? 'Projeto Publicado' : 'Publicar 360°'}
                  </button>
                  {project.status === 'completed' && (
                    <button 
                      onClick={unpublishProject}
                      className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                    >
                      Despublicar
                    </button>
                  )}
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
