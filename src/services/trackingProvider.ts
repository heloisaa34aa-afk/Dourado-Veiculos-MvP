import { Vehicle360MarkerPosition } from '../types';

export interface TrackingRequest {
  frames: string[];
  initialFrame: number;
  initialX: number;
  initialY: number;
  projectId: string;
  markerId: string;
  markerType: 'poi' | 'damage';
}

export type TrackingJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TrackingEvaluation {
  medianNormalizedError: number;
  p90NormalizedError: number;
  visibilityPrecision: number;
  visibilityRecall: number;
  visibilityF1: number;
  trackedFramePercentage: number;
  qualityScore: number;
  processingTimeMs: number;
  accepted: boolean;
  rejectionReasons: string[];
}

export interface TrackingResult {
  jobId?: string;
  status?: TrackingJobStatus;
  positions?: Vehicle360MarkerPosition[];
  evaluation?: TrackingEvaluation;
  error?: string;
}

export interface MarkerTrackingProvider {
  track(request: TrackingRequest): Promise<TrackingResult>;
}

export const trackingProvider: MarkerTrackingProvider = {
  async track(request: TrackingRequest): Promise<TrackingResult> {
    const endpoint = import.meta.env.VITE_TRACKING_ENDPOINT;
    if (!endpoint) {
      throw new Error("Rastreamento automático indisponível (VITE_TRACKING_ENDPOINT não configurado)");
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
      
      const response = await fetch(`${endpoint}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Serviço de rastreamento não encontrado (Erro 404). Verifique a URL do Modal.");
        }
        if (response.status === 503) {
          throw new Error("Serviço de rastreamento temporariamente indisponível (Erro 503).");
        }
        
        let errorMsg = response.statusText;
        try {
          const errData = await response.json();
          if (errData.detail) errorMsg = errData.detail;
        } catch (e) {}
        
        throw new Error(`Falha no rastreamento: ${errorMsg}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error("Timeout: O servidor demorou muito para responder (pode estar iniciando o cold start, tente novamente).");
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
         throw new Error("Erro de conexão ou CORS. Verifique se o serviço está no ar e se as origens permitidas estão configuradas.");
      }
      throw error;
    }
  }
}
