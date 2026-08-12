import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { X, Copy, QrCode, ExternalLink, Loader2, Play, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { vehicle360CaptureService } from '../../services/vehicle360Capture.service';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ModalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MobileCaptureModal Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          <p className="font-bold">Erro no componente de captura.</p>
          <p className="text-sm">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface MobileCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  vehicleId: string;
  viewType: 'exterior' | 'interior';
  existingFramesCount: number;
}

export function MobileCaptureModal(props: MobileCaptureModalProps) {
  return (
    <ModalErrorBoundary>
      <MobileCaptureModalContent {...props} />
    </ModalErrorBoundary>
  );
}

function MobileCaptureModalContent({
  isOpen, onClose, projectId, vehicleId, viewType, existingFramesCount
}: MobileCaptureModalProps) {
  const [targetFrameCount, setTargetFrameCount] = useState<number>(viewType === 'exterior' ? 36 : 12);
  const [captureMode, setCaptureMode] = useState<'replace' | 'append'>('replace');
  const [expiresInHours, setExpiresInHours] = useState<number>(2);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ sessionId: string, token: string } | null>(null);
  
  // Realtime progress
  const [progress, setProgress] = useState<{ confirmed: number, currentStep: number, status: string }>({
    confirmed: 0, currentStep: 0, status: 'active'
  });

  useEffect(() => {
    if (!isOpen) {
      setSession(null);
      setProgress({ confirmed: 0, currentStep: 0, status: 'active' });
    }
  }, [isOpen]);

  // Poll for progress updates
  useEffect(() => {
    if (!session?.token) return;
    
    let interval = setInterval(async () => {
      try {
        const data = await vehicle360CaptureService.getSession(session.token);
        
        if (data.session) {
          const confirmedCount = data.frames ? data.frames.filter((f: any) => f.status === 'confirmed').length : 0;
          setProgress({
            confirmed: confirmedCount,
            currentStep: data.session.current_step,
            status: data.session.status
          });
        }
      } catch (err) {
        console.error("Error polling session:", err);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [session]);

  if (!isOpen) return null;

  const handleCreateSession = async () => {
    if (existingFramesCount > 0 && captureMode === 'replace') {
      if (!window.confirm('Atenção: Substituir apagará as fotos anteriores. Deseja continuar?')) return;
    }

    try {
      setIsCreating(true);
      setError(null);
      
      const data = await vehicle360CaptureService.createSession({
        projectId,
        vehicleId,
        viewType,
        targetFrameCount,
        captureMode,
        expiresInHours
      });
      
      setSession({
        sessionId: data.sessionId,
        token: data.token
      });
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao gerar sessão de captura');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelSession = async () => {
    if (!session) return;
    if (!window.confirm('Cancelar esta sessão invalidará o QR Code e o progresso em andamento. Continuar?')) return;
    
    try {
      await vehicle360CaptureService.cancelSession(session.sessionId);
      setSession(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar sessão');
    }
  };

  const captureUrl = session?.token ? `${window.location.origin}/captura-360/${session.token}` : '';
  const safeTargetFrameCount = targetFrameCount || 1; // Prevent division by zero

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <QrCode className="text-indigo-600" /> 
            Capturar com celular
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!session ? (
            <div className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Projeto</label>
                <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 font-medium">
                  {viewType === 'exterior' ? '360° Externo' : '360° Interno'} (Somente leitura)
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quantidade de Fotos</label>
                <select 
                  value={targetFrameCount}
                  onChange={e => setTargetFrameCount(Number(e.target.value))}
                  className="w-full rounded-xl border-gray-300 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {viewType === 'exterior' ? (
                    <>
                      <option value={24}>24 imagens</option>
                      <option value={36}>36 imagens (Recomendado)</option>
                      <option value={48}>48 imagens</option>
                      <option value={72}>72 imagens</option>
                      <option value={96}>96 imagens</option>
                    </>
                  ) : (
                    <>
                      <option value={8}>8 imagens</option>
                      <option value={12}>12 imagens (Recomendado)</option>
                      <option value={16}>16 imagens</option>
                      <option value={24}>24 imagens</option>
                      <option value={48}>48 imagens</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Modo de Destino</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setCaptureMode('replace')}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border text-center transition-colors ${captureMode === 'replace' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Substituir sequência
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCaptureMode('append')}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border text-center transition-colors ${captureMode === 'append' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Adicionar ao final
                  </button>
                </div>
                {existingFramesCount > 0 && captureMode === 'replace' && (
                   <p className="text-xs text-amber-600 mt-2 font-medium flex gap-1">
                     <AlertTriangle size={14}/> Atenção: as {existingFramesCount} fotos atuais serão excluídas.
                   </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Validade da Sessão</label>
                <select 
                  value={expiresInHours}
                  onChange={e => setExpiresInHours(Number(e.target.value))}
                  className="w-full rounded-xl border-gray-300 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value={0.5}>30 minutos</option>
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas (Padrão)</option>
                  <option value={8}>8 horas</option>
                </select>
              </div>
              
              <button
                onClick={handleCreateSession}
                disabled={isCreating}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isCreating ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
                Gerar QR Code de Captura
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                {captureUrl ? (
                  <QRCodeSVG value={captureUrl} size={220} level="H" />
                ) : (
                  <div className="w-[220px] h-[220px] flex items-center justify-center text-gray-400">Aguardando a criação da sessão...</div>
                )}
              </div>
              
              <div className="w-full flex flex-col gap-2">
                <div className="flex gap-2 w-full">
                  <input type="text" readOnly value={captureUrl} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 focus:outline-none" />
                  <button onClick={() => navigator.clipboard.writeText(captureUrl)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Copy size={16} /> Copiar
                  </button>
                </div>
                <a href={captureUrl} target="_blank" rel="noopener noreferrer" className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  <ExternalLink size={16} /> Abrir neste dispositivo
                </a>
              </div>
              
              <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-gray-700">Progresso da Captura</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${progress.status === 'active' ? 'bg-blue-100 text-blue-700' : progress.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {progress.status === 'active' ? 'Em andamento' : progress.status}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(progress.confirmed / safeTargetFrameCount) * 100}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{progress.confirmed} de {targetFrameCount} fotos</span>
                  <span>Passo {progress.currentStep}</span>
                </div>
              </div>
              
              <div className="w-full pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                <span className="text-gray-500">Válido até {new Date(Date.now() + expiresInHours * 3600000).toLocaleTimeString()}</span>
                <button onClick={handleCancelSession} className="text-red-600 font-medium hover:text-red-800">
                  Cancelar Sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
