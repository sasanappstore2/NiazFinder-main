import { NextResponse } from 'next/server';
import { loadFilingDetailById } from '@/lib/filing/load-filing-browse';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const detail = await loadFilingDetailById(id);
  if (!detail) {
    return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
  }

  return NextResponse.json(detail);
}
