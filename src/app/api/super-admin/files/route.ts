import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { scanPublicUploads } from '@/lib/admin/scan-uploads';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'ops:files:read');
    if (!authz.ok) return authz.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 500);

    let files = await scanPublicUploads();
    if (q) {
      files = files.filter(
        (f) =>
          f.relativePath.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
      );
    }

    const total = files.length;
    files = files.slice(0, limit);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    return NextResponse.json({
      files,
      meta: {
        scanned: total,
        returned: files.length,
        totalSize,
        root: '/uploads',
      },
    });
  } catch (error) {
    console.error('Super admin files GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
