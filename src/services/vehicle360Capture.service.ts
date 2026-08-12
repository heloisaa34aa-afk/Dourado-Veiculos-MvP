import { supabase } from '../lib/supabase';

export interface CreateSessionParams {
  projectId: string;
  vehicleId: string;
  viewType: 'exterior' | 'interior';
  targetFrameCount: number;
  captureMode: 'replace' | 'append';
  expiresInHours: number;
}

export interface CaptureSessionDto {
  id: string;
  project_id: string;
  vehicle_id: string;
  view_type: 'exterior' | 'interior';
  target_frame_count: number;
  capture_mode: 'replace' | 'append';
  status: 'active' | 'finalizing' | 'completed' | 'expired' | 'cancelled';
  current_step: number;
  expires_at: string;
}

export interface CaptureFrameDto {
  slot_number: number;
  image_url: string;
  status: 'confirmed' | 'rejected' | 'uploaded';
  width: number | null;
  height: number | null;
  file_size: number | null;
  captured_at: string | null;
}

async function readableInvokeError(error: unknown) {
  const context = (error as { context?: { json?: () => Promise<unknown> } })?.context;
  if (context?.json) {
    try {
      const body = await context.json() as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // The SDK may already have consumed the response body.
    }
  }
  return error instanceof Error ? error.message : 'Serviço de captura 360 indisponível.';
}

async function invokeCapture<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('vehicle-360-capture', { body });
  if (error) throw new Error(await readableInvokeError(error));
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const vehicle360CaptureService = {
  async createSession(params: CreateSessionParams) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('É necessário entrar com uma conta administrativa real para gerar o QR Code.');
    }
    return invokeCapture<{ sessionId: string; token: string; expiresAt: string }>({
      action: 'createSession',
      ...params,
    });
  },

  cancelSession(sessionId: string) {
    return invokeCapture<{ success: boolean }>({ action: 'cancelSession', sessionId });
  },

  getSession(token: string) {
    return invokeCapture<{ session: CaptureSessionDto; frames: CaptureFrameDto[] }>({
      action: 'getSession',
      token,
    });
  },

  prepareUpload(token: string, slotNumber: number) {
    return invokeCapture<{ storagePath: string; uploadToken: string }>({
      action: 'prepareUpload',
      token,
      slotNumber,
    });
  },

  async uploadSignedFrame(storagePath: string, uploadToken: string, blob: Blob) {
    const { data, error } = await supabase.storage
      .from('vehicles')
      .uploadToSignedUrl(storagePath, uploadToken, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (error) throw new Error(error.message || 'Falha ao enviar a imagem.');
    return data;
  },

  confirmFrame(
    token: string,
    slotNumber: number,
    storagePath: string,
    fileData: { size: number; width: number; height: number },
  ) {
    return invokeCapture<{ success: boolean; frame: CaptureFrameDto; currentStep: number }>({
      action: 'confirmFrame',
      token,
      slotNumber,
      storagePath,
      fileData,
    });
  },

  rejectFrame(token: string, slotNumber: number) {
    return invokeCapture<{ success: boolean; currentStep: number }>({
      action: 'rejectFrame',
      token,
      slotNumber,
    });
  },

  finalizeSession(token: string) {
    return invokeCapture<{ success: boolean }>({ action: 'finalizeSession', token });
  },
};
