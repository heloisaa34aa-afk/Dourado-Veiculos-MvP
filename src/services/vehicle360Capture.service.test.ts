import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, invoke, uploadToSignedUrl } = vi.hoisted(() => ({
  getSession: vi.fn(),
  invoke: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession },
    functions: { invoke },
    storage: { from: () => ({ uploadToSignedUrl }) },
  },
}));

import { vehicle360CaptureService } from './vehicle360Capture.service';

describe('vehicle360CaptureService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires a real Supabase session to create a QR code', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await expect(vehicle360CaptureService.createSession({
      projectId: 'p', vehicleId: 'v', viewType: 'exterior', targetFrameCount: 24, captureMode: 'replace', expiresInHours: 2,
    })).rejects.toThrow(/conta administrativa real/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('invokes the anonymous mobile action through the Supabase SDK', async () => {
    invoke.mockResolvedValue({ data: { session: { id: 's' }, frames: [] }, error: null });
    await vehicle360CaptureService.getSession('token');
    expect(invoke).toHaveBeenCalledWith('vehicle-360-capture', {
      body: { action: 'getSession', token: 'token' },
    });
  });

  it('uploads the processed JPEG using the signed token with upsert', async () => {
    uploadToSignedUrl.mockResolvedValue({ data: { path: 'path' }, error: null });
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' });
    await vehicle360CaptureService.uploadSignedFrame('path', 'signed-token', blob);
    expect(uploadToSignedUrl).toHaveBeenCalledWith('path', 'signed-token', blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  });
});
