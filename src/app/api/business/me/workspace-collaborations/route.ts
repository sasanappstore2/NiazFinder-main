import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';
import { parseJsonArray } from '@/lib/business/json-fields';
import type { EcosystemExtension } from '@/lib/business/ecosystem';
import {
  buildCollaborationHeadline,
  createStructuredCollaborationPostSchema,
  isCollaborationPostVisibleToAreas,
  resolveCollaborationScope,
  subjectKindToIntent,
} from '@/lib/business/workspace/collaboration-posts';
import { collaborationMatchesFilingPreferences } from '@/lib/business/workspace/filing-preferences';

export const runtime = 'nodejs';

const POST_TTL_DAYS = 14;

function readServiceAreaState(extensions: string) {
  try {
    const ecosystem = (JSON.parse(extensions || '{}').ecosystem as EcosystemExtension) ?? {};
    return ecosystem.serviceArea ?? { areas: [] };
  } catch {
    return { areas: [] };
  }
}

/** GET — regional collaboration posts visible to the owner's service areas. */
export async function GET(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  const occupationSlugs = parseJsonArray<string>(profile.categorySlugs);
  if (!isRealEstateBusiness(occupationSlugs)) {
    return NextResponse.json({ posts: [], hasServiceArea: false });
  }

  const serviceArea = readServiceAreaState(profile.extensions);
  const areas = serviceArea.areas ?? [];
  const filingPreferences = serviceArea.filingPreferences;
  const since = new Date();
  since.setDate(since.getDate() - POST_TTL_DAYS);

  const rows = await db.regionalCollaborationPost.findMany({
    where: {
      status: 'active',
      createdAt: { gte: since },
    },
    include: {
      author: {
        select: {
          id: true,
          userId: true,
          name: true,
          slug: true,
          phone: true,
          whatsapp: true,
          chatEnabled: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
  });

  const visible = rows.filter(
    (post) =>
      (post.authorProfileId === profile.id ||
        isCollaborationPostVisibleToAreas(post, areas)) &&
      collaborationMatchesFilingPreferences(post, filingPreferences)
  );

  return NextResponse.json({
    posts: visible,
    hasServiceArea: areas.length > 0,
  });
}

/** POST — publish a structured regional collaboration card. */
export async function POST(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  const occupationSlugs = parseJsonArray<string>(profile.categorySlugs);
  if (!isRealEstateBusiness(occupationSlugs)) {
    return NextResponse.json({ error: 'فقط برای مشاوران املاک' }, { status: 403 });
  }

  const authorAreas = readServiceAreaState(profile.extensions).areas ?? [];
  if (!authorAreas.length) {
    return NextResponse.json(
      { error: 'ابتدا محدوده خدمات خود را در پروفایل تنظیم کنید' },
      { status: 400 }
    );
  }

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'بدنه نامعتبر است' }, { status: 400 });
  }

  if ('headline' in raw || 'note' in raw) {
    return NextResponse.json(
      { error: 'عنوان و توضیحات دستی پذیرفته نمی‌شود' },
      { status: 400 }
    );
  }

  const parsed = createStructuredCollaborationPostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'اطلاعات نامعتبر است', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const first = body.targetAreas[0]!;
  const scope = resolveCollaborationScope(body.targetAreas, authorAreas);
  const headline = buildCollaborationHeadline({
    subjectKind: body.subjectKind,
    dealType: body.dealType,
    propertyKind: body.propertyKind,
    areaBand: body.areaBand ?? null,
    budgetBand: body.budgetBand ?? null,
    targetAreas: body.targetAreas,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + POST_TTL_DAYS);

  const post = await db.regionalCollaborationPost.create({
    data: {
      authorProfileId: profile.id,
      intent: subjectKindToIntent(body.subjectKind),
      subjectKind: body.subjectKind,
      dealType: body.dealType,
      propertyKind: body.propertyKind,
      areaBand: body.areaBand ?? null,
      budgetBand: body.budgetBand ?? null,
      targetAreasJson: JSON.stringify(body.targetAreas),
      headline,
      note: null,
      scope,
      city: first.city,
      neighborhood: first.neighborhood,
      neighborhoodId: first.neighborhoodId,
      targetCity: scope === 'CROSS_REGIONAL' ? first.city : null,
      targetNeighborhood:
        scope === 'CROSS_REGIONAL' && body.targetAreas.length === 1
          ? first.neighborhood
          : null,
      expiresAt,
    },
    include: {
      author: {
        select: {
          id: true,
          userId: true,
          name: true,
          slug: true,
          phone: true,
          whatsapp: true,
          chatEnabled: true,
        },
      },
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
