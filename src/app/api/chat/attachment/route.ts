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

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'لطفاً ابتدا وارد شوید' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'فایلی ارسال نشده است' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'حجم فایل حداکثر ۸ مگابایت است' }, { status: 400 });
    }

    const mime = normalizeChatMime(file.type || '');
    if (!isAllowedChatAttachment(file.type || '', file.name)) {
      return NextResponse.json(
        { error: 'فقط تصویر، PDF یا فایل صوتی کوتاه مجاز است' },
        { status: 400 }
      );
    }

    const inferredExt =
      path.extname(file.name).replace(/[^\w.-]/g, '').slice(0, 12) ||
      extFromChatMime(mime) ||
      '.bin';

    const baseName = `${randomUUID()}${inferredExt}`;
    const absDir = path.join(process.cwd(), 'public', 'uploads', 'chat', user.id);
    await mkdir(absDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(absDir, baseName), buffer);

    const publicUrl = `/uploads/chat/${user.id}/${baseName}`;
    return NextResponse.json({ url: publicUrl, mime });
  } catch (e) {
    console.error('Chat attachment POST error:', e);
    return NextResponse.json({ error: 'خطا در ذخیره فایل' }, { status: 500 });
  }
}
