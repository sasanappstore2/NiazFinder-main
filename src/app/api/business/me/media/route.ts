import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';

export const runtime = 'nodejs';

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const MAX_COVER_BYTES = 6 * 1024 * 1024;
const MAX_PRODUCT_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function extForMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.jpg';
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBusinessAccess(request);
    if ('error' in auth) return auth.error;

    const profile = await loadMyBusinessProfile(auth.user);
    const formData = await request.formData();
    const file = formData.get('file');
    const kind = String(formData.get('kind') ?? 'logo');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'فایلی ارسال نشده است' }, { status: 400 });
    }

    if (kind !== 'logo' && kind !== 'cover' && kind !== 'product') {
      return NextResponse.json({ error: 'نوع تصویر نامعتبر است' }, { status: 400 });
    }

    const maxBytes =
      kind === 'logo' ? MAX_LOGO_BYTES : kind === 'cover' ? MAX_COVER_BYTES : MAX_PRODUCT_BYTES;
    if (file.size > maxBytes) {
      const msg =
        kind === 'logo'
          ? 'حداکثر حجم لوگو ۴ مگابایت'
          : kind === 'cover'
            ? 'حداکثر حجم کاور ۶ مگابایت'
            : 'حداکثر حجم تصویر محصول ۵ مگابایت';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { error: 'فقط تصویر JPG، PNG، WebP یا GIF مجاز است' },
        { status: 400 }
      );
    }

    const ext = extForMime(mime);
    const baseName = `${kind}-${randomUUID()}${ext}`;
    const relDir = path.join('uploads', 'business', profile.id);
    const absDir = path.join(process.cwd(), 'public', relDir);
    await mkdir(absDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(absDir, baseName), buffer);

    const publicUrl = `/${relDir.replace(/\\/g, '/')}/${baseName}`;
    return NextResponse.json({ url: publicUrl, kind });
  } catch (e) {
    console.error('Business media POST error:', e);
    return NextResponse.json({ error: 'خطا در ذخیره تصویر' }, { status: 500 });
  }
}
