import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import {
  isOptimizableImageMime,
  optimizeUploadBuffer,
  type ImageUploadPreset,
} from '@/lib/image/optimize-upload';
import { bufferMatchesDeclaredMime } from '@/lib/security/file-magic';
import { validateImportUrl } from './validate-url';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function importRemoteImage(
  imageUrl: string,
  profileId: string,
  kind: ImageUploadPreset = 'product'
): Promise<string | null> {
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }

  const validated = await validateImportUrl(trimmed);
  if (!validated.ok) return null;

  const pinned = await validateImportUrl(validated.url);
  if (!pinned.ok) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    const res = await fetch(pinned.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NiazFinder-SiteImport/1.0' },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const finalUrl = res.url || validated.url;
    const finalCheck = await validateImportUrl(finalUrl);
    if (!finalCheck.ok) return null;

    const mime = (res.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase();
    if (!ALLOWED_MIME.has(mime)) return null;

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > MAX_BYTES) return null;

    let inputBuffer = Buffer.from(arrayBuf);
    if (!bufferMatchesDeclaredMime(inputBuffer, mime)) return null;

    let outputBuffer: Buffer = inputBuffer;
    let ext =
      mime === 'image/png'
        ? '.png'
        : mime === 'image/gif'
          ? '.gif'
          : mime === 'image/webp'
            ? '.webp'
            : '.jpg';

    if (isOptimizableImageMime(mime)) {
      const result = await optimizeUploadBuffer(inputBuffer, kind, mime);
      outputBuffer = Buffer.from(result.buffer);
      ext = result.extension;
    }

    const baseName = `import-${randomUUID()}${ext}`;
    const relDir = path.join('uploads', 'business', profileId);
    const absDir = path.join(process.cwd(), 'public', relDir);
    await mkdir(absDir, { recursive: true });
    await writeFile(path.join(absDir, baseName), outputBuffer);

    return `/${relDir.replace(/\\/g, '/')}/${baseName}`;
  } catch {
    return null;
  }
}
