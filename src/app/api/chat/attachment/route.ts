import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  extFromChatMime,
  isAllowedChatAttachment,
  normalizeChatMime,
} from '@/lib/chat/attachment-mime';
import { bufferMatchesDeclaredMime, isDangerousUploadMime } from '@/lib/security/file-magic';
import { chatObjectKey, isMinioConfigured, uploadChatObject } from '@/lib/storage/minio';
import { isOptimizableImageMime, optimizeUploadBuffer } from '@/lib/image/optimize-upload';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_VOICE_BYTES = 2 * 1024 * 1024;

function isImageAttachment(mime: string): boolean {
  const m = normalizeChatMime(mime);
  return (
    m === 'image/jpeg' ||
    m === 'image/png' ||
    m === 'image/webp' ||
    m === 'image/gif'
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'لطفاً ابتدا وارد شوید' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const durationMsRaw = formData.get('durationMs');
    const durationMs =
      typeof durationMsRaw === 'string' ? parseInt(durationMsRaw, 10) : undefined;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'فایلی ارسال نشده است' }, { status: 400 });
    }

    const isVoice = file.type.startsWith('audio/') || file.name.endsWith('.webm');
    const maxBytes = isVoice ? MAX_VOICE_BYTES : MAX_BYTES;

    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: isVoice ? 'حجم پیام صوتی حداکثر ۲ مگابایت است' : 'حجم فایل حداکثر ۸ مگابایت است' },
        { status: 400 }
      );
    }

    const mime = normalizeChatMime(file.type || '');
    if (isDangerousUploadMime(mime)) {
      return NextResponse.json({ error: 'نوع فایل مجاز نیست' }, { status: 400 });
    }
    if (!isAllowedChatAttachment(file.type || '', file.name)) {
      return NextResponse.json(
        { error: 'فقط تصویر، PDF یا فایل صوتی کوتاه مجاز است' },
        { status: 400 }
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    if (!bufferMatchesDeclaredMime(inputBuffer, mime)) {
      return NextResponse.json(
        { error: 'محتوای فایل با نوع اعلام‌شده مطابقت ندارد' },
        { status: 400 }
      );
    }

    let inferredExt =
      path.extname(file.name).replace(/[^\w.-]/g, '').slice(0, 12) ||
      extFromChatMime(mime) ||
      '.bin';

    let outputMime = mime;
    let outputBuffer: Buffer = inputBuffer;
    let bytesBefore = inputBuffer.length;
    let bytesAfter = inputBuffer.length;
    let optimized = false;

    if (isImageAttachment(mime) && isOptimizableImageMime(mime)) {
      const result = await optimizeUploadBuffer(inputBuffer, 'chat', mime);
      outputBuffer = Buffer.from(result.buffer);
      outputMime = result.mime;
      inferredExt = result.extension;
      bytesBefore = result.bytesBefore;
      bytesAfter = result.bytesAfter;
      optimized = result.optimized;
    }

    if (isMinioConfigured()) {
      const key = chatObjectKey(user.id, inferredExt);
      const url = await uploadChatObject(key, outputBuffer, outputMime);
      return NextResponse.json({
        url,
        key,
        mime: outputMime,
        size: outputBuffer.length,
        bytesBefore,
        bytesAfter,
        optimized,
        durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
      });
    }

    const baseName = `${randomUUID()}${inferredExt}`;
    const absDir = path.join(process.cwd(), 'public', 'uploads', 'chat', user.id);
    await mkdir(absDir, { recursive: true });
    await writeFile(path.join(absDir, baseName), outputBuffer);

    const publicUrl = `/uploads/chat/${user.id}/${baseName}`;
    return NextResponse.json({
      url: publicUrl,
      mime: outputMime,
      size: outputBuffer.length,
      bytesBefore,
      bytesAfter,
      optimized,
      durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
    });
  } catch (e) {
    console.error('Chat attachment POST error:', e);
    return NextResponse.json({ error: 'خطا در ذخیره فایل' }, { status: 500 });
  }
}
