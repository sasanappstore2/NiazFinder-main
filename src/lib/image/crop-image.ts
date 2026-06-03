import type { Area } from 'react-easy-crop';

export type CropOutputSize = { width: number; height: number };

export type CropMediaSize = {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

export type CropPlacement = {
  crop: { x: number; y: number };
  zoom: number;
  mediaSize: CropMediaSize;
  cropAreaSize: { width: number; height: number };
};

export const BUSINESS_CROP_OUTPUT: Record<'logo' | 'cover', CropOutputSize> = {
  logo: { width: 512, height: 512 },
  cover: { width: 1600, height: 800 },
};

export const BUSINESS_CROP_ASPECT: Record<'logo' | 'cover', number> = {
  logo: 1,
  cover: 2,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('Image load failed')));
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = src;
  });
}

function rgbHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function quantizeChannel(v: number): number {
  return Math.round(v / 12) * 12;
}

function colorKey(r: number, g: number, b: number): string {
  return `${quantizeChannel(r)},${quantizeChannel(g)},${quantizeChannel(b)}`;
}

function parseKey(key: string): { r: number; g: number; b: number } {
  const [r, g, b] = key.split(',').map(Number);
  return { r: r!, g: g!, b: b! };
}

/**
 * Dominant border/corner color — works well for logos on solid backgrounds.
 */
export async function detectImageBackgroundColor(src: string): Promise<string> {
  const image = await loadImage(src);
  const size = 56;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#ffffff';

  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map<string, number>();

  const sample = (x: number, y: number, weight = 1) => {
    const i = (y * size + x) * 4;
    const a = data[i + 3]!;
    if (a < 128) return;
    const key = colorKey(data[i]!, data[i + 1]!, data[i + 2]!);
    buckets.set(key, (buckets.get(key) ?? 0) + weight);
  };

  const margin = 4;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < margin; y++) sample(x, y, 2);
    for (let y = size - margin; y < size; y++) sample(x, y, 2);
  }
  for (let y = margin; y < size - margin; y++) {
    for (let x = 0; x < margin; x++) sample(x, y, 2);
    for (let x = size - margin; x < size; x++) sample(x, y, 2);
  }

  const corners: [number, number][] = [
    [2, 2],
    [size - 3, 2],
    [2, size - 3],
    [size - 3, size - 3],
  ];
  for (const [x, y] of corners) sample(x, y, 4);

  let bestKey = '255,255,255';
  let best = 0;
  for (const [key, count] of buckets) {
    if (count > best) {
      best = count;
      bestKey = key;
    }
  }

  const { r, g, b } = parseKey(bestKey);
  return rgbHex(r, g, b);
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Crop failed'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Export full crop frame: simulated background + image placed like react-easy-crop preview.
 * crop.x/y are offsets from center (library convention).
 */
export async function cropImageWithSimulatedBackground(
  imageSrc: string,
  placement: CropPlacement,
  output: CropOutputSize,
  backgroundColor: string,
  quality = 0.9
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const { crop, zoom, mediaSize, cropAreaSize } = placement;
  const { width: cropW, height: cropH } = cropAreaSize;
  if (cropW <= 0 || cropH <= 0) {
    throw new Error('Crop area not ready');
  }

  const mediaDisplayW = mediaSize.width * zoom;
  const mediaDisplayH = mediaSize.height * zoom;
  const mediaLeft = (cropW - mediaDisplayW) / 2 + crop.x;
  const mediaTop = (cropH - mediaDisplayH) / 2 + crop.y;

  const scaleX = output.width / cropW;
  const scaleY = output.height / cropH;

  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    0,
    0,
    mediaSize.naturalWidth,
    mediaSize.naturalHeight,
    mediaLeft * scaleX,
    mediaTop * scaleY,
    mediaDisplayW * scaleX,
    mediaDisplayH * scaleY
  );

  return canvasToJpegBlob(canvas, quality);
}

/** Legacy tight crop (no letterbox simulation). */
export async function cropImageToBlob(
  imageSrc: string,
  crop: Area,
  output: CropOutputSize,
  quality = 0.9
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    output.width,
    output.height
  );

  return canvasToJpegBlob(canvas, quality);
}
