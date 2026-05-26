import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, createSlug } from '@/lib/auth';
import { mapDraftToCreateRequest } from '@/lib/need-intake/map-to-request';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveCategoryIds } from '@/lib/need-intake/resolve-category';
import { normalizeCategoryPair } from '@/config/categories';
import type { NeedDraft } from '@/contracts/need-intake';
import { enqueueIntakeHeavyJob } from '@/lib/need-intake/enqueue-heavy';
import { enqueueRequestModerationJob } from '@/lib/request-moderation/enqueue';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const draft = body.draft as NeedDraft;
    const listingPreview = body.listingPreview ?? draft?.listingPreview;

    if (!draft?.parsedIntent) {
      return NextResponse.json({ error: 'پیش‌نویس نامعتبر' }, { status: 400 });
    }

    if (listingPreview) {
      draft.listingPreview = listingPreview;
    }
    if (draft.leadPhone && !draft.answers._leadPhone) {
      draft.answers = { ...draft.answers, _leadPhone: draft.leadPhone };
    }

    const normalized = normalizeCategoryPair(
      draft.parsedIntent.categorySlug,
      draft.parsedIntent.subcategorySlug
    );
    const { categoryId, subcategoryId } = await resolveCategoryIds(
      normalized.categorySlug,
      normalized.subcategorySlug
    );
    const mapped = mapDraftToCreateRequest(draft, categoryId, subcategoryId);

    if (!listingPreview) {
      const composed = composeListingFromDraft(draft);
      mapped.title = composed.title;
      mapped.description = composed.description;
      mapped.aiExtractedData = {
        ...mapped.aiExtractedData,
        listingEnriched: true,
        engine: 'internal',
      };
    } else {
      mapped.aiExtractedData = {
        ...mapped.aiExtractedData,
        listingEnriched: true,
        fromPreview: true,
        engine: 'internal',
      };
    }

    let slug = createSlug(mapped.title);
    const existingSlug = await db.serviceRequest.findUnique({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now()}`;

    let businessProfileId: string | null = null;
    if (body.linkToBusinessProfile === true) {
      const bizProfile = await db.businessProfile.findUnique({ where: { userId: user.id } });
      if (bizProfile) businessProfileId = bizProfile.id;
    }

    const serviceRequest = await db.serviceRequest.create({
      data: {
        title: mapped.title,
        slug,
        description: mapped.description,
        budgetMin: mapped.budgetMin ?? null,
        budgetMax: mapped.budgetMax ?? null,
        budgetType: mapped.budgetType,
        city: mapped.city ?? null,
        province: mapped.province ?? null,
        address:
          typeof mapped.dynamicAnswers?.address === 'string'
            ? mapped.dynamicAnswers.address
            : typeof draft.answers?.location === 'string'
              ? draft.answers.location
              : null,
        categoryId: mapped.categoryId,
        subcategoryId: mapped.subcategoryId ?? null,
        priority: mapped.priority,
        tags: JSON.stringify(mapped.tags),
        intentType: mapped.intentType,
        dynamicAnswers: JSON.stringify(mapped.dynamicAnswers),
        aiExtractedData: JSON.stringify(mapped.aiExtractedData),
        source: mapped.source,
        userId: user.id,
        businessProfileId,
        status: 'PENDING_REVIEW',
        moderationStatus: 'PENDING',
      },
    });

    const sessionId =
      typeof body.sessionId === 'string' ? body.sessionId : undefined;
    void enqueueIntakeHeavyJob(serviceRequest.id, sessionId);
    void enqueueRequestModerationJob(serviceRequest.id);

    return NextResponse.json({
      id: serviceRequest.id,
      slug: serviceRequest.slug,
      title: serviceRequest.title,
      status: serviceRequest.status,
      moderationStatus: serviceRequest.moderationStatus,
      message: 'آگهی ثبت شد و در صف بازبینی قرار گرفت',
    });
  } catch (error) {
    console.error('need-intake publish error:', error);
    const message =
      error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json(
      { error: message.includes('No active category') ? 'دسته‌بندی در سیستم یافت نشد' : 'خطای سرور' },
      { status: 500 }
    );
  }
}
