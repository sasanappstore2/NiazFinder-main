import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function parseAiMeta(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const row = await db.serviceRequest.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      moderationStatus: true,
      userId: true,
      updatedAt: true,
      aiExtractedData: true,
    },
  });

  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });
  }

  const ready = row.status !== 'PENDING_AI_REVIEW';
  const autoApproved = row.status === 'OPEN' && row.moderationStatus === 'APPROVED';
  const aiMeta = parseAiMeta(row.aiExtractedData);
  const aiProcessingFailed =
    ready && typeof aiMeta?.error === 'string' && row.status === 'PENDING_REVIEW';

  return NextResponse.json({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    moderationStatus: row.moderationStatus,
    ready,
    autoApproved,
    aiProcessingFailed,
    updatedAt: row.updatedAt.toISOString(),
    message: ready
      ? autoApproved
        ? 'نیاز شما تأیید و منتشر شد'
        : aiProcessingFailed
          ? 'نیاز ثبت شد؛ پردازش هوشمند ناموفق بود و در صف بازبینی قرار گرفت'
          : 'نیاز ثبت شد و در صف بازبینی قرار گرفت'
      : 'در حال پردازش هوشمند…',
  });
}
