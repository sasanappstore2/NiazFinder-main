import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const province = request.nextUrl.searchParams.get('province');
    if (!province || !/^[a-z0-9-]+$/.test(province)) {
      return NextResponse.json({ error: 'province required' }, { status: 400 });
    }

    const file = path.join(process.cwd(), 'src/data/geo/provinces', `${province}-cities-hex.json`);
    if (!fs.existsSync(file)) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geo layout error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
