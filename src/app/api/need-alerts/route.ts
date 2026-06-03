import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { buildNeedBrowseAlertFingerprint } from '@/lib/need-alerts/fingerprint';
import type { BrowseFilters } from '@/lib/filters/parser';
import type { NeedBrowseAlertPayload } from '@/lib/need-alerts/types';

function needBrowseAlerts() {
  const model = db.needBrowseAlert;
  if (!model) {
    throw new Error(
      'NeedBrowseAlert model unavailable — run `npx prisma generate` and restart the dev server'
    );
  }
  return model;
}

function parsePayload(body: unknown): NeedBrowseAlertPayload | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const browsePath = typeof b.browsePath === 'string' ? b.browsePath.trim() : '';
  const label = typeof b.label === 'string' ? b.label.trim() : '';
  if (!browsePath || !label) return null;

  const categorySlug =
    typeof b.categorySlug === 'string' ? b.categorySlug.trim() || null : null;
  const citySlugs = Array.isArray(b.citySlugs)
    ? b.citySlugs.filter((s): s is string => typeof s === 'string')
    : [];
  const searchQuery =
    typeof b.searchQuery === 'string' ? b.searchQuery.trim() || null : null;
  const filters =
    b.filters && typeof b.filters === 'object'
      ? (b.filters as Partial<BrowseFilters>)
      : {};

  return { browsePath, categorySlug, citySlugs, filters, searchQuery, label };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get('fingerprint')?.trim();

    if (fingerprint) {
      const alert = await needBrowseAlerts().findUnique({
        where: {
          userId_fingerprint: { userId: user.id, fingerprint },
        },
      });
      return NextResponse.json({
        subscribed: Boolean(alert?.active),
        alertId: alert?.id ?? null,
      });
    }

    const alerts = await needBrowseAlerts().findMany({
      where: { userId: user.id, active: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      data: alerts.map((a) => ({
        id: a.id,
        label: a.label,
        browsePath: a.browsePath,
        categorySlug: a.categorySlug,
        fingerprint: a.fingerprint,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/need-alerts error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const payload = parsePayload(await request.json());
    if (!payload) {
      return NextResponse.json({ error: 'داده نامعتبر' }, { status: 400 });
    }

    const fingerprint = buildNeedBrowseAlertFingerprint(payload);

    const alert = await needBrowseAlerts().upsert({
      where: {
        userId_fingerprint: { userId: user.id, fingerprint },
      },
      create: {
        userId: user.id,
        label: payload.label,
        browsePath: payload.browsePath,
        categorySlug: payload.categorySlug,
        citySlugs: JSON.stringify(payload.citySlugs),
        filtersJson: JSON.stringify(payload.filters ?? {}),
        searchQuery: payload.searchQuery,
        fingerprint,
        active: true,
      },
      update: {
        label: payload.label,
        browsePath: payload.browsePath,
        categorySlug: payload.categorySlug,
        citySlugs: JSON.stringify(payload.citySlugs),
        filtersJson: JSON.stringify(payload.filters ?? {}),
        searchQuery: payload.searchQuery,
        active: true,
      },
    });

    return NextResponse.json({
      subscribed: true,
      alertId: alert.id,
      fingerprint,
      message: 'اعلان این صفحه فعال شد',
    });
  } catch (error) {
    console.error('POST /api/need-alerts error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fingerprint = new URL(request.url).searchParams.get('fingerprint')?.trim();
    if (!fingerprint) {
      return NextResponse.json({ error: 'fingerprint الزامی است' }, { status: 400 });
    }

    await needBrowseAlerts().updateMany({
      where: { userId: user.id, fingerprint },
      data: { active: false },
    });

    return NextResponse.json({
      subscribed: false,
      message: 'اعلان این صفحه غیرفعال شد',
    });
  } catch (error) {
    console.error('DELETE /api/need-alerts error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
