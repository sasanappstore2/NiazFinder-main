import sharp from 'sharp';

export type ImageUploadPreset = 'product' | 'logo' | 'cover' | 'chat' | 'general';

export type OptimizeUploadResult = {
  buffer: Buffer;
  mime: string;
  extension: string;
  bytesBefore: number;
  bytesAfter: number;
  optimized: boolean;
};

type PresetConfig = {
  maxWidth?: number;
  maxHeight?: number;
  maxSide?: number;
  quality: number;
};

const PRESETS: Record<ImageUploadPreset, PresetConfig> = {
  product: {
    maxSide: 1920,
    quality: Number(process.env.IMAGE_OPTIMIZE_QUALITY_PRODUCT) || 86,
  },
  logo: {
    maxSide: 512,
    quality: Number(process.env.IMAGE_OPTIMIZE_QUALITY_LOGO) || 90,
  },
  cover: {
    maxWidth: 1600,
    maxHeight: 900,
    quality: Number(process.env.IMAGE_OPTIMIZE_QUALITY_COVER) || 85,
  },
  chat: {
    maxSide: 1600,
    quality: Number(process.env.IMAGE_OPTIMIZE_QUALITY_CHAT) || 82,
  },
  general: {
    maxSide: 1920,
    quality: Number(process.env.IMAGE_OPTIMIZE_QUALITY_GENERAL) || 85,
  },
};

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

/** Skip re-encoding tiny WebP files that are already small. */
function shouldSkipWebP(input: Buffer, mime: string): boolean {
  if (mime !== 'image/webp') return false;
  return input.length < 120 * 1024;
}

export async function optimizeUploadBuffer(
  input: Buffer,
  preset: ImageUploadPreset,
  mimeHint = 'image/jpeg'
): Promise<OptimizeUploadResult> {
  const bytesBefore = input.length;
  const mime = (mimeHint || 'image/jpeg').split(';')[0].trim().toLowerCase();

  if (!isImageMime(mime)) {
    return {
      buffer: input,
      mime,
      extension: mime === 'application/pdf' ? '.pdf' : '',
      bytesBefore,
      bytesAfter: bytesBefore,
      optimized: false,
    };
  }

  if (mime === 'image/gif') {
    const meta = await sharp(input, { animated: true }).metadata();
    if ((meta.pages ?? 1) > 1) {
      return {
        buffer: input,
        mime: 'image/gif',
        extension: '.gif',
        bytesBefore,
        bytesAfter: bytesBefore,
        optimized: false,
      };
    }
  }

  if (shouldSkipWebP(input, mime)) {
    return {
      buffer: input,
      mime: 'image/webp',
      extension: '.webp',
      bytesBefore,
      bytesAfter: bytesBefore,
      optimized: false,
    };
  }

  const cfg = PRESETS[preset];
  let pipeline = sharp(input, { animated: false }).rotate();

  if (cfg.maxWidth && cfg.maxHeight) {
    pipeline = pipeline.resize(cfg.maxWidth, cfg.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  } else if (cfg.maxSide) {
    pipeline = pipeline.resize(cfg.maxSide, cfg.maxSide, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const buffer = await pipeline
    .webp({
      quality: cfg.quality,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();

  return {
    buffer,
    mime: 'image/webp',
    extension: '.webp',
    bytesBefore,
    bytesAfter: buffer.length,
    optimized: true,
  };
}

export function isOptimizableImageMime(mime: string): boolean {
  const m = mime.split(';')[0].trim().toLowerCase();
  return (
    m === 'image/jpeg' ||
    m === 'image/png' ||
    m === 'image/webp' ||
    m === 'image/gif'
  );
}
