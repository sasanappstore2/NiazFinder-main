import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, createSlug } from '@/lib/auth';
import { mapDraftToCreateRequest } from '@/lib/need-intake/map-to-request';
import { enrichListingWithLlm } from '@/lib/need-intake/llm-parse-intent';
import { resolveCategoryId } from '@/lib/need-intake/resolve-category';
import type { NeedDraft } from '@/contracts/need-intake';

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

    if (!draft?.parsedIntent) {
      return NextResponse.json({ error: 'پیش‌نویس نامعتبر' }, { status: 400 });
    }

    const categoryId = await resolveCategoryId(draft.parsedIntent.categorySlug);
    const mapped = mapDraftToCreateRequest(draft, categoryId);

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
        categoryId: mapped.categoryId,
        priority: mapped.priority,
        tags: JSON.stringify(mapped.tags),
        intentType: mapped.intentType,
        dynamicAnswers: JSON.stringify(mapped.dynamicAnswers),
        aiExtractedData: JSON.stringify(mapped.aiExtractedData),
        source: mapped.source,
        userId: user.id,
      },
    });

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
