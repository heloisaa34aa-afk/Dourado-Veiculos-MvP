import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Camera, Check, Loader2, RefreshCcw, RotateCcw, Trash2, UploadCloud, X } from 'lucide-react';
import { vehicle360CaptureService } from '../services/vehicle360Capture.service';
import type { CaptureFrameDto, CaptureSessionDto } from '../services/vehicle360Capture.service';
import {
  findFirstMissingSlot,
  getCaptureInstruction,
  processVehicleCaptureImage,
} from '../utils/vehicle360Capture';

interface ProcessedCapture {
  blob: Blob;
  width: number;
  height: number;
}

export default function Vehicle360MobileCapture() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<CaptureSessionDto | null>(null);
  const [frames, setFrames] = useState<CaptureFrameDto[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [capture, setCapture] = useState<ProcessedCapture | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearPreview = useCallback(() => {
    setPreviewUrl(previous => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setCapture(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const loadSession = useCallback(async () => {
    if (!token) {
      setError('O link de captura não possui um token válido.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await vehicle360CaptureService.getSession(token);
      const loadedFrames = data.frames ?? [];
      setSession(data.session);
      setFrames(loadedFrames);
      const firstMissing = findFirstMissingSlot(loadedFrames, data.session.target_frame_count);
      setCurrentStep(Math.min(firstMissing, Math.max(data.session.target_frame_count - 1, 0)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a sessão.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const confirmedBySlot = useMemo(
    () => new Map(frames.filter(frame => frame.status === 'confirmed').map(frame => [frame.slot_number, frame])),
    [frames],
  );
  const firstMissing = session ? findFirstMissingSlot(frames, session.target_frame_count) : 0;
  const isComplete = Boolean(session && firstMissing === session.target_frame_count);
  const instruction = session
    ? getCaptureInstruction(session.view_type, currentStep, session.target_frame_count)
    : null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      setError(null);
      const processed = await processVehicleCaptureImage(file);
      clearPreview();
      setCapture(processed);
      setPreviewUrl(URL.createObjectURL(processed.blob));
    } catch (caught) {
      clearPreview();
      setError(caught instanceof Error ? caught.message : 'Não foi possível processar a foto.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!capture || !token || !session) return;
    try {
      setBusy(true);
      setError(null);
      const prepared = await vehicle360CaptureService.prepareUpload(token, currentStep);
      await vehicle360CaptureService.uploadSignedFrame(prepared.storagePath, prepared.uploadToken, capture.blob);
      await vehicle360CaptureService.confirmFrame(token, currentStep, prepared.storagePath, {
        size: capture.blob.size,
        width: capture.width,
        height: capture.height,
      });
      clearPreview();
      await loadSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar a foto.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFrame = async (slotNumber: number) => {
    if (!token || !window.confirm(`Excluir a foto ${slotNumber + 1}?`)) return;
    try {
      setBusy(true);
      setError(null);
      await vehicle360CaptureService.rejectFrame(token, slotNumber);
      clearPreview();
      await loadSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível excluir a foto.');
    } finally {
      setBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (!token || !isComplete) return;
    try {
      setBusy(true);
      setError(null);
      await vehicle360CaptureService.finalizeSession(token);
      await loadSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível finalizar a captura.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <FullScreenMessage icon={<Loader2 className="h-12 w-12 animate-spin text-indigo-500" />} title="Carregando captura 360..." />;
  }

  if (error && !session) {
    return (
      <FullScreenMessage
        icon={<AlertCircle className="h-14 w-14 text-red-500" />}
        title="Não foi possível abrir a sessão"
        description={error}
        action={<button onClick={() => void loadSession()} className="rounded-xl bg-gray-800 px-6 py-3 font-semibold"><RefreshCcw className="mr-2 inline h-4 w-4" />Tentar novamente</button>}
      />
    );
  }

  if (!session) return null;

  if (session.status === 'completed') {
    return <FullScreenMessage icon={<Check className="h-14 w-14 text-green-500" />} title="Captura finalizada" description="As imagens já foram enviadas ao projeto 360. Você pode fechar esta página." />;
  }

  if (session.status === 'finalizing') {
    return <FullScreenMessage icon={<Loader2 className="h-12 w-12 animate-spin text-indigo-500" />} title="Finalizando a captura" description="Aguarde enquanto organizamos as imagens." />;
  }

  if (isComplete && !previewUrl) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-950 text-white">
        <div className="shrink-0 px-5 pb-4 pt-8 text-center">
          <UploadCloud className="mx-auto mb-3 h-12 w-12 text-indigo-400" />
          <h1 className="text-2xl font-bold">Revise antes de finalizar</h1>
          <p className="mt-1 text-sm text-gray-400">Toque em uma foto para refazê-la ou excluí-la.</p>
        </div>
        {error && <InlineError message={error} />}
        <div className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto px-4 pb-4 sm:grid-cols-4">
          {Array.from({ length: session.target_frame_count }, (_, slot) => {
            const frame = confirmedBySlot.get(slot);
            return (
              <button key={slot} onClick={() => setCurrentStep(slot)} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
                {frame && <img src={frame.image_url} alt={`Foto ${slot + 1}`} className="h-full w-full object-cover" />}
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-xs">{slot + 1}</span>
                <span className="absolute inset-x-1 bottom-1 rounded bg-black/75 py-1 text-xs opacity-0 transition group-hover:opacity-100">Refazer</span>
              </button>
            );
          })}
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-gray-800 bg-gray-900 p-4 pb-7">
          <button onClick={() => void handleDeleteFrame(currentStep)} disabled={busy} className="rounded-2xl bg-gray-800 py-4 font-bold disabled:opacity-50"><Trash2 className="mr-2 inline h-5 w-5" />Excluir foto {currentStep + 1}</button>
          <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="rounded-2xl bg-indigo-600 py-4 font-bold disabled:opacity-50"><RotateCcw className="mr-2 inline h-5 w-5" />Refazer foto</button>
          <button onClick={() => void handleFinalize()} disabled={busy} className="col-span-2 rounded-2xl bg-green-600 py-4 font-bold disabled:opacity-50">{busy ? <Loader2 className="mr-2 inline h-5 w-5 animate-spin" /> : <Check className="mr-2 inline h-5 w-5" />}Finalizar e enviar ao projeto</button>
        </div>
        <CaptureInput inputRef={fileInputRef} onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-950 text-white">
      <CaptureInput inputRef={fileInputRef} onChange={handleFileChange} />
      <header className="shrink-0 border-b border-gray-800 bg-gray-900 px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">Foto {currentStep + 1} de {session.target_frame_count}</p>
            <h1 className="text-lg font-bold">{instruction?.title}</h1>
            <p className="mt-1 text-xs text-gray-400">{instruction?.description}</p>
          </div>
          {typeof instruction?.angleDegrees === 'number' && <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-sm font-bold text-indigo-300">{instruction.angleDegrees}°</span>}
        </div>
      </header>

      {error && <InlineError message={error} />}

      <main className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
        {previewUrl ? (
          <img src={previewUrl} alt="Pré-visualização" className="h-full w-full object-contain" />
        ) : (
          <div className="px-8 text-center">
            <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-3xl border-2 border-dashed border-white/25">
              {busy ? <Loader2 className="h-14 w-14 animate-spin text-indigo-400" /> : <Camera className="h-14 w-14 text-white/30" />}
            </div>
            <p className="mt-6 text-sm text-gray-400">Use o guia acima e mantenha o celular na mesma altura.</p>
          </div>
        )}
      </main>

      <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-gray-800 bg-gray-900 px-3 py-2">
        {Array.from({ length: session.target_frame_count }, (_, slot) => {
          const frame = confirmedBySlot.get(slot);
          return (
            <button key={slot} onClick={() => { clearPreview(); setCurrentStep(slot); }} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${slot === currentStep ? 'border-indigo-500' : 'border-gray-700'}`}>
              {frame ? <img src={frame.image_url} alt={`Foto ${slot + 1}`} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center bg-gray-800 text-xs text-gray-400">{slot + 1}</span>}
              {frame && <Check className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-green-500 p-0.5" />}
            </button>
          );
        })}
      </div>

      <footer className="shrink-0 border-t border-gray-800 bg-gray-900 p-4 pb-7">
        {previewUrl ? (
          <div className="grid grid-cols-3 gap-3">
            <button onClick={clearPreview} disabled={busy} className="rounded-2xl bg-gray-800 py-4 font-bold disabled:opacity-50"><X className="mr-1 inline h-5 w-5" />Cancelar</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="rounded-2xl bg-gray-800 py-4 font-bold disabled:opacity-50"><RotateCcw className="mr-1 inline h-5 w-5" />Refazer</button>
            <button onClick={() => void handleConfirm()} disabled={busy} className="rounded-2xl bg-indigo-600 py-4 font-bold disabled:opacity-50">{busy ? <Loader2 className="inline h-5 w-5 animate-spin" /> : <><Check className="mr-1 inline h-5 w-5" />Confirmar</>}</button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="w-full rounded-2xl bg-indigo-600 py-4 font-bold shadow-lg disabled:opacity-50"><Camera className="mr-2 inline h-5 w-5" />Tirar foto</button>
        )}
      </footer>
    </div>
  );
}

function CaptureInput({ inputRef, onChange }: { inputRef: React.RefObject<HTMLInputElement | null>; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onChange} className="hidden" />;
}

function InlineError({ message }: { message: string }) {
  return <div role="alert" className="shrink-0 border-y border-red-900/50 bg-red-950/70 px-4 py-2 text-center text-sm text-red-200">{message}</div>;
}

function FullScreenMessage({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center bg-gray-950 p-6 text-center text-white">
      <div className="mb-5">{icon}</div>
      <h1 className="text-2xl font-bold">{title}</h1>
      {description && <p className="mt-2 max-w-sm text-gray-400">{description}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}
