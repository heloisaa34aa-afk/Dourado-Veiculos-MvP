import { describe, expect, it } from 'vitest';
import {
  MAX_CAPTURE_BYTES,
  expectedStoragePath,
  isJpegBytes,
  validateCreateSessionInput,
  validateSlot,
  validateStoredJpegMetadata,
} from './validation';

describe('vehicle-360-capture Edge validation', () => {
  const sessionId = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts only slots inside the session range', () => {
    expect(validateSlot(0, 24)).toBe(0);
    expect(() => validateSlot(-1, 24)).toThrow('INVALID_SLOT');
    expect(() => validateSlot(24, 24)).toThrow('INVALID_SLOT');
    expect(() => validateSlot(1.5, 24)).toThrow('INVALID_SLOT');
  });

  it('creates one exact path for each session and slot', () => {
    expect(expectedStoragePath(sessionId, 3)).toBe(`360-capture/${sessionId}/3-capture.jpg`);
  });

  it('rejects a stored file larger than 5 MB', () => {
    expect(() => validateStoredJpegMetadata({ size: MAX_CAPTURE_BYTES + 1, mimetype: 'image/jpeg' }))
      .toThrow('FILE_TOO_LARGE');
  });

  it('rejects a stored file with a non-JPEG MIME type', () => {
    expect(() => validateStoredJpegMetadata({ size: 1000, mimetype: 'image/png' }))
      .toThrow('INVALID_FILE_TYPE');
  });

  it('checks JPEG start and end bytes', () => {
    expect(isJpegBytes(new Uint8Array([0xff, 0xd8, 0xff, 0x01, 0xff, 0xd9]))).toBe(true);
    expect(isJpegBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });

  it('validates project ids, view type, mode, count and expiration', () => {
    const valid = {
      projectId: sessionId,
      vehicleId: '123e4567-e89b-42d3-a456-426614174000',
      viewType: 'exterior',
      captureMode: 'replace',
      targetFrameCount: 24,
      expiresInHours: 2,
    };
    expect(validateCreateSessionInput(valid)).toMatchObject(valid);
    expect(() => validateCreateSessionInput({ ...valid, targetFrameCount: 97 })).toThrow('INVALID_FRAME_COUNT');
    expect(() => validateCreateSessionInput({ ...valid, viewType: 'invalid' })).toThrow('INVALID_VIEW_TYPE');
  });
});
