export const MAX_CAPTURE_DIMENSION = 2560;
export const MAX_CAPTURE_FILE_SIZE = 5 * 1024 * 1024;

export interface CaptureFrameLike {
  slot_number: number;
  status: string;
}

export interface CaptureInstruction {
  title: string;
  description: string;
  angleDegrees?: number;
}

const SUPPORTED_INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function findFirstMissingSlot(frames: CaptureFrameLike[], targetCount: number): number {
  for (let slot = 0; slot < targetCount; slot += 1) {
    const confirmed = frames.some(
      frame => frame.slot_number === slot && frame.status === 'confirmed',
    );
    if (!confirmed) return slot;
  }
  return targetCount;
}

export function calculateCaptureDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxDimension = MAX_CAPTURE_DIMENSION,
) {
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Dimensões inválidas para a imagem.');
  }

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export function validateCaptureInputType(file: Pick<File, 'type' | 'name'>) {
  const normalizedType = file.type.toLowerCase();
  const normalizedName = file.name.toLowerCase();
  if (normalizedType === 'image/heic' || normalizedType === 'image/heif' || /\.(heic|heif)$/.test(normalizedName)) {
    throw new Error('Este navegador não consegue processar HEIC/HEIF. Configure a câmera para JPEG ou escolha outra foto.');
  }
  if (!SUPPORTED_INPUT_TYPES.has(normalizedType)) {
    throw new Error('Formato não suportado. Use uma imagem JPEG, PNG ou WebP.');
  }
}

export function getCaptureInstruction(
  viewType: 'exterior' | 'interior',
  slotNumber: number,
  targetFrameCount: number,
): CaptureInstruction {
  if (viewType === 'interior') {
    const interiorSteps: Array<[string, string]> = [
      ['Painel completo', 'Fotografe o painel centralizado a partir dos bancos dianteiros.'],
      ['Volante e instrumentos', 'Enquadre volante, painel de instrumentos e comandos.'],
      ['Central multimídia', 'Registre a central multimídia e os comandos do ar-condicionado.'],
      ['Console central', 'Mostre câmbio, porta-copos e acabamento do console.'],
      ['Banco dianteiro esquerdo', 'Fotografe o banco do motorista e o acabamento lateral.'],
      ['Banco dianteiro direito', 'Fotografe o banco do passageiro e o acabamento lateral.'],
      ['Bancos traseiros', 'Mostre o conjunto dos bancos traseiros e o espaço interno.'],
      ['Portas e detalhes', 'Registre portas, forros e detalhes relevantes do interior.'],
    ];
    const index = Math.floor((slotNumber * interiorSteps.length) / Math.max(targetFrameCount, 1)) % interiorSteps.length;
    const [title, description] = interiorSteps[index];
    return { title, description };
  }

  const angleDegrees = Math.round((slotNumber / Math.max(targetFrameCount, 1)) * 360);
  const normalized = ((angleDegrees % 360) + 360) % 360;
  let title = 'Lateral do veículo';
  if (normalized < 23 || normalized >= 338) title = 'Frente do veículo';
  else if (normalized < 68) title = 'Diagonal dianteira direita';
  else if (normalized < 113) title = 'Lateral direita';
  else if (normalized < 158) title = 'Diagonal traseira direita';
  else if (normalized < 203) title = 'Traseira do veículo';
  else if (normalized < 248) title = 'Diagonal traseira esquerda';
  else if (normalized < 293) title = 'Lateral esquerda';
  else title = 'Diagonal dianteira esquerda';

  return {
    title,
    description: `Mantenha a mesma distância e altura. Posicione-se aproximadamente em ${angleDegrees}° do ponto inicial.`,
    angleDegrees,
  };
}

async function loadBitmap(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível abrir a imagem selecionada.'));
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export async function processVehicleCaptureImage(file: File) {
  validateCaptureInputType(file);
  const loaded = await loadBitmap(file);
  try {
    const { width, height } = calculateCaptureDimensions(loaded.width, loaded.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não disponibilizou o processamento de imagem.');
    context.drawImage(loaded.source, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        result => result ? resolve(result) : reject(new Error('Não foi possível gerar a imagem JPEG.')),
        'image/jpeg',
        0.88,
      );
    });

    if (blob.size > MAX_CAPTURE_FILE_SIZE) {
      throw new Error('A imagem processada ultrapassou 5 MB. Tente outra foto.');
    }
    return { blob, width, height };
  } finally {
    loaded.close();
  }
}
