import { supabase } from '../lib/supabase';

export interface CreateSessionParams {
  projectId: string;
  vehicleId: string;
  viewType: 'exterior' | 'interior';
  targetFrameCount: number;
  captureMode: 'replace' | 'append';
  expiresInHours: number;
}

export const vehicle360CaptureService = {
  async createSession(params: CreateSessionParams) {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) {
      throw new Error('É necessário entrar com uma conta administrativa real para gerar o QR Code.');
    }
    
    const { data, error } = await supabase.functions.invoke('vehicle-360-capture', {
      body: { action: 'createSession', ...params }
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async cancelSession(sessionId: string) {
    const { data, error } = await supabase.functions.invoke('vehicle-360-capture', {
      body: { action: 'cancelSession', sessionId }
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getSession(token: string) {
    const { data, error } = await supabase.functions.invoke('vehicle-360-capture', {
      body: { action: 'getSession', token }
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async prepareUpload(token: string, slotNumber: number) {
    const { data, error } = await supabase.functions.invoke('vehicle-360-capture', {
      body: { action: 'prepareUpload', token, slotNumber }
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async confirmFrame(token: string, slotNumber: number, storagePath: string, fileData: { size: number, width: number, height: number }) {
    const { data, error } = await supabase.functions.invoke('vehicle-360-capture', {
      body: { action: 'confirmFrame', token, slotNumber, storagePath, fileData }
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async rejectFrame(token: string, slotNumber: number) {
    const { data, error } = await supabase.functions.invoke('vehicle-360-capture', {
      body: { action: 'rejectFrame', token, slotNumber }
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async finalizeSession(token: string) {
    const { data, error } = await supabase.functions.invoke('vehicle-360-capture', {
      body: { action: 'finalizeSession', token }
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }
};
