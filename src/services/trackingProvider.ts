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
    
    const response = await fetch(`${endpoint}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API de rastreamento: ${response.statusText}`);
    }
    
    return await response.json();
  }
}
