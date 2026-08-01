import { readFile, stat } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

function resolveUploadPath(segments: string[]): string | null {
  const normalized = path.normalize(segments.join('/')).replace(/^(\.\.(\/|\\|$))+/, '');
  if (normalized.includes('..') || path.isAbsolute(normalized)) return null;
  const abs = path.join(process.cwd(), 'public', 'uploads', normalized);
  const root = path.join(process.cwd(), 'public', 'uploads');
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  const absPath = resolveUploadPath(segments);
  if (!absPath) {
    return NextResponse.json({ error: 'مسیر نامعتبر' }, { status: 400 });
  }

  try {
    const info = await stat(absPath);
    if (!info.isFile()) {
      return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });
    }
    const data = await readFile(absPath);
    const ext = path.extname(absPath).toLowerCase();
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });
  }
}
