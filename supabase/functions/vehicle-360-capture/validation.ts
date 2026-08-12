export const CAPTURE_BUCKET = 'vehicles';
export const MAX_CAPTURE_BYTES = 5 * 1024 * 1024;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateSlot(slotNumber: unknown, targetFrameCount: number): number {
  if (!Number.isInteger(slotNumber) || Number(slotNumber) < 0 || Number(slotNumber) >= targetFrameCount) {
    throw new Error('INVALID_SLOT');
  }
  return Number(slotNumber);
}

export function expectedStoragePath(sessionId: string, slotNumber: number) {
  return `360-capture/${sessionId}/${slotNumber}-capture.jpg`;
}

export function validateStoredJpegMetadata(metadata: { size?: unknown; mimetype?: unknown } | null | undefined) {
  const size = Number(metadata?.size);
  const mimetype = String(metadata?.mimetype ?? '').toLowerCase();
  if (!Number.isFinite(size) || size <= 0) throw new Error('INVALID_FILE_SIZE');
  if (size > MAX_CAPTURE_BYTES) throw new Error('FILE_TOO_LARGE');
  if (mimetype !== 'image/jpeg') throw new Error('INVALID_FILE_TYPE');
  return { size, mimetype };
}

export function isJpegBytes(bytes: Uint8Array) {
  return bytes.length >= 4
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff
    && bytes[bytes.length - 2] === 0xff
    && bytes[bytes.length - 1] === 0xd9;
}

export function validateCreateSessionInput(params: Record<string, unknown>) {
  if (!isUuid(params.projectId) || !isUuid(params.vehicleId)) throw new Error('INVALID_UUID');
  if (params.viewType !== 'exterior' && params.viewType !== 'interior') throw new Error('INVALID_VIEW_TYPE');
  if (params.captureMode !== 'replace' && params.captureMode !== 'append') throw new Error('INVALID_CAPTURE_MODE');
  if (![0.5, 1, 2, 8].includes(Number(params.expiresInHours))) throw new Error('INVALID_EXPIRATION');

  const target = Number(params.targetFrameCount);
  if (!Number.isInteger(target)) throw new Error('INVALID_FRAME_COUNT');
  const validTarget = params.viewType === 'exterior'
    ? target >= 24 && target <= 96
    : target >= 8 && target <= 48;
  if (!validTarget) throw new Error('INVALID_FRAME_COUNT');

  return {
    projectId: params.projectId,
    vehicleId: params.vehicleId,
    viewType: params.viewType,
    captureMode: params.captureMode,
    targetFrameCount: target,
    expiresInHours: Number(params.expiresInHours),
  } as const;
}
