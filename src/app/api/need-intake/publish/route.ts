import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, createSlug } from '@/lib/auth';
import { mapDraftToCreateRequest } from '@/lib/need-intake/map-to-request';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveCategoryIds, CategoryResolveError } from '@/lib/need-intake/resolve-category';
import { normalizeCategoryPair } from '@/config/categories';
import type { NeedDraft } from '@/contracts/need-intake';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { toServiceRequestV2 } from '@/intake/projections/serviceRequestV2';
import { compareLegacyAndCanonical } from '@/intake/legacy/compareLegacyAndCanonical';
import { recordIntakeMigrationEvent } from '@/intake/migration/events';
import { getIntakeMigrationFeatureFlags } from '@/intake/migration/feature-flags';
import { runPublishShadowMode } from '@/intake/migration/shadow-publish';
import { enqueueIntakeHeavyJob } from '@/lib/need-intake/enqueue-heavy';
import { enqueueRequestModerationJob } from '@/lib/request-moderation/enqueue';
import { captureTrainingExampleAsync } from '@/intake/training/trainingCapture';
import {
  rejectListingTitleReason,
  truncateListingTitle,
} from '@/lib/need-intake/listing-title-sanitize';
import { shouldAutoApproveNeed } from '@/lib/need-intake/auto-approve-policy';

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

    if (!draft?.entities || !draft?.needType) {
      return NextResponse.json({ error: 'پیش‌نویس نامعتبر' }, { status: 400 });
    }

    const validation = validateNeedDraftForPublish(draft);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 422 }
      );
    }

    if (listingPreview) {
      const previewTitle = truncateListingTitle(
        String(listingPreview.title ?? '').trim() || 'ثبت نیاز'
      );
      const titleReject = rejectListingTitleReason(previewTitle, {
        sourceText: draft.sourceText,
      });
      if (titleReject) {
        return NextResponse.json(
          {
            success: false,
            errors: [
              {
                path: 'listingPreview.title',
                message:
                  'عنوان آگهی خیلی کلی است. لطفاً موضوع نیاز (مثلاً نوع خودرو یا خدمات) را در عنوان بیاورید.',
              },
            ],
          },
          { status: 422 }
        );
      }
      draft.listingPreview = {
        ...listingPreview,
        title: previewTitle,
      };
    }
    const entities = recordToEntities(draft.entities);
    const serviceRequestV2 = toServiceRequestV2(draft);
    const legacyCompare = compareLegacyAndCanonical(draft);
    void recordIntakeMigrationEvent('CanonicalDiffDetected', {
      equal: legacyCompare.equal,
      diffs: legacyCompare.diffs,
      needType: draft.needType,
      schemaVersion: draft.schemaVersion,
    });
    if (!legacyCompare.equal) {
      console.info('[LEGACY_CANONICAL_DIFF]', {
        needType: draft.needType,
        diffs: legacyCompare.diffs,
      });
    }

    const normalized = normalizeCategoryPair(
      entities.categorySlug ?? draft.parsedIntent.categorySlug,
      entities.subcategorySlug ?? draft.parsedIntent.subcategorySlug
    );
    const { categoryId, subcategoryId } = await resolveCategoryIds(
      normalized.categorySlug,
      normalized.subcategorySlug
    );
    const mapped = mapDraftToCreateRequest(draft, categoryId, subcategoryId);

    const flags = getIntakeMigrationFeatureFlags();
    let shadowComparison: ReturnType<typeof runPublishShadowMode> | null = null;
    if (flags.shadowPublishEnabled) {
      shadowComparison = runPublishShadowMode(draft, categoryId, subcategoryId);
    }

    if (!listingPreview) {
      const composed = composeListingFromDraft(draft);
      mapped.title = composed.title;
      mapped.description = composed.description;
      mapped.aiExtractedData = {
        ...mapped.aiExtractedData,
        listingEnriched: true,
        engine: 'internal',
        serviceRequestV2,
      };
    } else {
      mapped.aiExtractedData = {
        ...mapped.aiExtractedData,
        listingEnriched: true,
        fromPreview: true,
        engine: 'internal',
        titleSource: draft.listingPreview?.titleSource,
        serviceRequestV2,
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

    const autoApprove = shouldAutoApproveNeed(mapped.source);

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
        lat: mapped.lat ?? null,
        lng: mapped.lng ?? null,
        address:
          typeof mapped.dynamicAnswers?.address === 'string'
            ? mapped.dynamicAnswers.address
            : typeof mapped.dynamicAnswers?.location === 'string'
              ? mapped.dynamicAnswers.location
              : null,
        categoryId: mapped.categoryId,
        subcategoryId: mapped.subcategoryId ?? null,
        priority: mapped.priority,
        tags: JSON.stringify(mapped.tags),
        intentType: mapped.intentType,
        dynamicAnswers: JSON.stringify({
          ...mapped.dynamicAnswers,
          serviceRequestV2,
        }),
        aiExtractedData: JSON.stringify(mapped.aiExtractedData),
        source: mapped.source,
        userId: user.id,
        businessProfileId,
        status: autoApprove ? 'OPEN' : 'PENDING_REVIEW',
        moderationStatus: autoApprove ? 'APPROVED' : 'PENDING',
        ...(autoApprove
          ? { reviewedAt: new Date(), reviewedByUserId: user.id }
          : {}),
      },
    });

    const sessionId =
      typeof body.sessionId === 'string' ? body.sessionId : undefined;
    void enqueueIntakeHeavyJob(serviceRequest.id, sessionId);
    if (!autoApprove) {
      void enqueueRequestModerationJob(serviceRequest.id);
    }

    captureTrainingExampleAsync({
      draft,
      serviceRequestId: serviceRequest.id,
      intakeTrace: draft.intakeTrace ?? null,
    });

    void recordIntakeMigrationEvent('NeedDraftPublished', {
      requestId: serviceRequest.id,
      needType: draft.needType,
      schemaVersion: draft.schemaVersion,
      canonicalHash: serviceRequestV2.canonicalHash,
      completionScore: draft.completionScore,
      matchabilityScore: draft.matchabilityScore,
      legacyEqual: legacyCompare.equal,
      shadowEqual: shadowComparison?.equal ?? null,
    });

    if (shadowComparison) {
      void recordIntakeMigrationEvent('ShadowPublishComparison', {
        requestId: serviceRequest.id,
        needType: draft.needType,
        equal: shadowComparison.equal,
        diffs: shadowComparison.diffs,
        canonicalHash: serviceRequestV2.canonicalHash,
      });
      if (!shadowComparison.equal) {
        console.info('[SHADOW_PUBLISH_DIFF]', {
          requestId: serviceRequest.id,
          needType: draft.needType,
          diffs: shadowComparison.diffs,
        });
      }
    }

    return NextResponse.json({
      id: serviceRequest.id,
      slug: serviceRequest.slug,
      title: serviceRequest.title,
      status: serviceRequest.status,
      moderationStatus: serviceRequest.moderationStatus,
      autoApproved: autoApprove,
      message: autoApprove
        ? 'آگهی منتشر شد و در جستجو قابل مشاهده است'
        : 'آگهی ثبت شد و پس از تأیید در جستجو نمایش داده می‌شود',
    });
  } catch (error) {
    console.error('need-intake publish error:', error);
    if (error instanceof CategoryResolveError) {
      return NextResponse.json(
        {
          success: false,
          errors: [{ path: 'categorySlug', message: error.message }],
        },
        { status: 422 }
      );
    }
    const message = error instanceof Error ? error.message : 'خطای سرور';
    return NextResponse.json(
      { error: message.includes('No active category') ? 'دسته‌بندی در سیستم یافت نشد' : 'خطای سرور' },
      { status: 500 }
    );
  }
}
