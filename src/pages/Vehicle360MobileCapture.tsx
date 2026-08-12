import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Check, X, Loader2, UploadCloud, ChevronRight, AlertCircle, RefreshCcw } from 'lucide-react';

export default function Vehicle360MobileCapture() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<any>(null);
  const [frames, setFrames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSession();
  }, [token]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || (import.meta.env.VITE_SUPABASE_URL + '/functions/v1');
      if (!endpoint) throw new Error('Servidor não configurado');
      
      const res = await fetch(`${endpoint}/vehicle-360-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSession', token })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar sessão');
      
      setSession(data.session);
      setFrames(data.frames || []);
      
      // Determine current step based on first unconfirmed slot or current_step
      const confirmedCount = data.frames ? data.frames.filter((f: any) => f.status === 'confirmed').length : 0;
      setCurrentStep(Math.min(confirmedCount, data.session.target_frame_count - 1));
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCapturedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedImage(null);
    setPreviewUrl(null);
  };

  const handleConfirm = async () => {
    if (!capturedImage || !session) return;
    
    try {
      setIsUploading(true);
      
      const endpoint = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || (import.meta.env.VITE_SUPABASE_URL + '/functions/v1');
      
      // 1. Get Signed URL
      const prepRes = await fetch(`${endpoint}/vehicle-360-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepareUpload', token, slotNumber: currentStep })
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok) throw new Error(prepData.error || 'Falha ao preparar upload');
      
      // 2. Upload to Storage
      const uploadRes = await fetch(prepData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': capturedImage.type
        },
        body: capturedImage
      });
      if (!uploadRes.ok) throw new Error('Falha no upload da imagem');
      
      // 3. Confirm Frame
      const img = new Image();
      img.src = previewUrl!;
      await new Promise(r => img.onload = r);
      
      const confRes = await fetch(`${endpoint}/vehicle-360-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'confirmFrame', 
          token, 
          slotNumber: currentStep,
          storagePath: prepData.storagePath,
          fileData: { size: capturedImage.size, width: img.width, height: img.height }
        })
      });
      const confData = await confRes.json();
      if (!confRes.ok) throw new Error(confData.error || 'Falha ao confirmar foto');
      
      // Move to next step or refresh
      handleRetake();
      await fetchSession();
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setIsFinalizing(true);
      const endpoint = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || (import.meta.env.VITE_SUPABASE_URL + '/functions/v1');
      const res = await fetch(`${endpoint}/vehicle-360-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalizeSession', token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao finalizar');
      
      await fetchSession();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-950 flex-col">
        <Loader2 className="animate-spin text-indigo-500 w-12 h-12 mb-4" />
        <span className="text-white font-medium">Carregando Sessão...</span>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-950 p-6 flex-col text-center">
        <AlertCircle className="text-red-500 w-16 h-16 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Erro de Sessão</h1>
        <p className="text-gray-400 mb-8">{error || 'Sessão inválida ou expirada.'}</p>
        <button onClick={fetchSession} className="px-6 py-3 bg-gray-800 text-white rounded-xl flex items-center gap-2">
           <RefreshCcw size={18} /> Tentar novamente
        </button>
      </div>
    );
  }

  const confirmedFrames = frames.filter(f => f.status === 'confirmed').length;
  const isComplete = confirmedFrames >= session.target_frame_count;

  if (session.status === 'completed' || session.status === 'finalizing') {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-950 p-6 flex-col text-center">
        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
          <Check size={40} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Captura Finalizada</h1>
        <p className="text-gray-400">As imagens já estão disponíveis no sistema.</p>
        <p className="text-gray-500 text-sm mt-8">Você pode fechar esta página.</p>
      </div>
    );
  }

  if (isComplete && !previewUrl) {
    return (
      <div className="flex h-[100dvh] flex-col bg-gray-950 text-white">
        <div className="p-6 pt-12 text-center">
          <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
            <UploadCloud size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Todas as fotos capturadas!</h1>
          <p className="text-gray-400 mb-8">Envie as fotos para processamento.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4">
          <div className="grid grid-cols-4 gap-2">
            {frames.map((f, i) => (
              <div key={i} className="aspect-square bg-gray-800 rounded overflow-hidden">
                <img src={f.image_url} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 pb-8 bg-gray-900 border-t border-gray-800 shrink-0">
           <button 
             onClick={handleFinalize}
             disabled={isFinalizing}
             className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-2xl flex justify-center items-center gap-2 shadow-lg disabled:opacity-50"
           >
             {isFinalizing ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />}
             Finalizar e Processar
           </button>
        </div>
      </div>
    );
  }

  // Camera angle guide calculation (very basic MVP guide)
  const angleDegrees = (currentStep / session.target_frame_count) * 360;

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-950 text-white relative">
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center pointer-events-none">
        <div>
          <h2 className="font-bold shadow-black drop-shadow-md text-lg">Foto {currentStep + 1} de {session.target_frame_count}</h2>
          <p className="text-xs text-gray-300 font-medium drop-shadow-md">Posição: {Math.round(angleDegrees)}°</p>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
             {/* Simple Guide UI */}
             <div className="w-64 h-64 border-2 border-dashed border-white/30 rounded-3xl flex items-center justify-center relative">
                <div className="absolute top-4 text-white/50 font-bold text-xl">{currentStep === 0 ? "FRENTE" : ""}</div>
                <Camera size={48} className="text-white/20" />
                
                {/* Angle indicator */}
                <div className="absolute w-full h-full animate-[spin_20s_linear_infinite]" style={{ transform: `rotate(${angleDegrees}deg)` }}>
                  <div className="w-3 h-3 bg-indigo-500 rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2 shadow-[0_0_15px_rgba(99,102,241,1)]" />
                </div>
             </div>
             <p className="mt-8 text-gray-400 font-medium text-center px-8">Mova-se ligeiramente ao redor do veículo para capturar este ângulo.</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 pb-12 bg-gray-900 border-t border-gray-800 z-20 shrink-0">
        {previewUrl ? (
          <div className="flex gap-4">
             <button 
               onClick={handleRetake} 
               disabled={isUploading}
               className="flex-1 py-4 bg-gray-800 text-white font-bold rounded-2xl flex justify-center items-center gap-2 disabled:opacity-50"
             >
               <X size={24} /> Refazer
             </button>
             <button 
               onClick={handleConfirm} 
               disabled={isUploading}
               className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg"
             >
               {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />}
               {isUploading ? 'Enviando...' : 'Confirmar Foto'}
             </button>
          </div>
        ) : (
          <button 
            onClick={handleCaptureClick} 
            className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-indigo-900/50"
          >
            <Camera size={24} /> Tirar Foto
          </button>
        )}
      </div>
    </div>
  );
}
