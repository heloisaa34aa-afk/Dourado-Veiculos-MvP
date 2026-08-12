import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  calculateCaptureDimensions,
  findFirstMissingSlot,
  getCaptureInstruction,
  processVehicleCaptureImage,
  validateCaptureInputType,
} from './vehicle360Capture';

describe('vehicle 360 mobile capture utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('finds a gap in the middle instead of using the confirmed count', () => {
    expect(findFirstMissingSlot([
      { slot_number: 0, status: 'confirmed' },
      { slot_number: 2, status: 'confirmed' },
    ], 4)).toBe(1);
  });

  it('returns target count when every slot is confirmed', () => {
    expect(findFirstMissingSlot([
      { slot_number: 0, status: 'confirmed' },
      { slot_number: 1, status: 'confirmed' },
    ], 2)).toBe(2);
  });

  it('keeps the longest processed side at 2560 pixels', () => {
    expect(calculateCaptureDimensions(4032, 3024)).toEqual({ width: 2560, height: 1920 });
    expect(calculateCaptureDimensions(1000, 2000)).toEqual({ width: 1000, height: 2000 });
  });

  it('uses circular exterior instructions', () => {
    expect(getCaptureInstruction('exterior', 0, 24)).toMatchObject({ title: 'Frente do veículo', angleDegrees: 0 });
    expect(getCaptureInstruction('exterior', 12, 24)).toMatchObject({ title: 'Traseira do veículo', angleDegrees: 180 });
  });

  it('uses a dedicated interior guide without an exterior angle', () => {
    const instruction = getCaptureInstruction('interior', 0, 8);
    expect(instruction.title).toBe('Painel completo');
    expect(instruction.angleDegrees).toBeUndefined();
  });

  it('rejects HEIC with a useful message', () => {
    expect(() => validateCaptureInputType({ type: 'image/heic', name: 'photo.heic' } as File))
      .toThrow(/HEIC\/HEIF/);
  });

  it('processes through canvas as a bounded JPEG', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }));
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: BlobCallback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })));
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') {
        return { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob } as unknown as HTMLCanvasElement;
      }
      return originalCreate(tagName);
    }) as typeof document.createElement);

    const result = await processVehicleCaptureImage(new File(['raw'], 'photo.jpg', { type: 'image/jpeg' }));
    expect(result).toMatchObject({ width: 2560, height: 1920 });
    expect(result.blob.type).toBe('image/jpeg');
    expect(drawImage).toHaveBeenCalled();
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.88);
    expect(close).toHaveBeenCalled();
  });
});
