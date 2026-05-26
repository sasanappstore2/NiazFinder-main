import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, createSlug } from '@/lib/auth';
import { mapDraftToCreateRequest } from '@/lib/need-intake/map-to-request';
import { enrichListingWithLlm } from '@/lib/need-intake/llm-parse-intent';
import { resolveCategoryIds } from '@/lib/need-intake/resolve-category';
import { normalizeCategoryPair } from '@/config/categories';
import type { NeedDraft } from '@/contracts/need-intake';
import { scheduleNeedLeadOutreach } from '@/lib/need-leads/schedule';

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
      const enriched = await enrichListingWithLlm(
        draft.parsedIntent,
        draft.answers,
        mapped.title,
        mapped.description
      );
      if (enriched) {
        mapped.title = enriched.title;
        mapped.description = enriched.description;
        mapped.aiExtractedData = {
          ...mapped.aiExtractedData,
          listingEnriched: true,
        };
      }
    } else {
      mapped.aiExtractedData = {
        ...mapped.aiExtractedData,
        listingEnriched: true,
        fromPreview: true,
      };
    }

    let slug = createSlug(mapped.title);
    const existingSlug = await db.serviceRequest.findUnique({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now()}`;

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
      },
    });

    scheduleNeedLeadOutreach(serviceRequest.id);

    return NextResponse.json({
      id: serviceRequest.id,
      slug: serviceRequest.slug,
      title: serviceRequest.title,
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
