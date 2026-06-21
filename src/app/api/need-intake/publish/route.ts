import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, createSlug } from '@/lib/auth';
import { mapDraftToCreateRequest } from '@/lib/need-intake/map-to-request';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveCategoryIds } from '@/lib/need-intake/resolve-category';
import { normalizeCategoryPair } from '@/config/categories';
import type { NeedDraft } from '@/contracts/need-intake';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { toServiceRequestV2 } from '@/intake/projections/serviceRequestV2';
import { compareLegacyAndCanonical } from '@/intake/legacy/compareLegacyAndCanonical';
import { recordIntakeMigrationEvent } from '@/intake/migration/events';
import { getIntakeMigrationFeatureFlags } from '@/intake/migration/feature-flags';
import { runPublishShadowMode } from '@/intake/migration/shadow-publish';
import {
  rejectListingTitleReason,
  truncateListingTitle,
} from '@/lib/need-intake/listing-title-sanitize';
import { shouldAutoApproveNeed } from '@/lib/need-intake/auto-approve-policy';
import {
  assertPublishDatabaseReady,
  formatNeedIntakePublishError,
} from '@/lib/need-intake/publish-error-message';
import { isIntakeQueueSyncFallbackEnabled } from '@/lib/need-intake/intake-queue-policy';
import {
  completeSyncPublish,
  syncPublishUserMessage,
} from '@/lib/need-intake/publish-sync-fallback';
import { publishRequestSchema } from '@/lib/queue/schemas/intake-publish';
import { publishIntakeAiTask, rabbitMQEnabled } from '@/lib/queue/rabbitmq-client';
import { captureTrainingExampleAsync } from '@/intake/training/captureTrainingExample';

function enqueueTrainingCapture(
  draft: NeedDraft,
  serviceRequestId: string,
  sessionId?: string
): void {
  captureTrainingExampleAsync({
    draft: {
      templateId: draft.templateId,
      templateVersion: draft.templateVersion,
      sourceText: draft.sourceText,
      entities: draft.entities,
      analysisSnapshot: draft.analysisSnapshot,
      intakeTrace: draft.intakeTrace,
      fieldMeta: draft.fieldMeta,
      parsedIntent: draft.parsedIntent as unknown as Record<string, unknown>,
      listingPreview: draft.listingPreview,
      completionScore: draft.completionScore,
      matchabilityScore: draft.matchabilityScore,
      leadPhone: draft.leadPhone,
    },
    serviceRequestId,
    sessionId,
  });
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

    const rawBody = await request.json();
    const parsed = publishRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'پیش‌نویس نامعتبر' }, { status: 400 });
    }

    const body = parsed.data;
    const draft = body.draft as unknown as NeedDraft;
    const listingPreview = body.listingPreview ?? draft?.listingPreview;

    await assertPublishDatabaseReady(() => db.$queryRaw`SELECT 1`);

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
        description: listingPreview.description ?? draft.listingPreview?.description ?? '',
        titleSource:
          listingPreview.titleSource === 'qwen' || listingPreview.titleSource === 'template'
            ? listingPreview.titleSource
            : draft.listingPreview?.titleSource,
      };
    }

    const entities = recordToEntities(draft.entities);
    const serviceRequestV2 = toServiceRequestV2(draft);
    const legacyCompare = compareLegacyAndCanonical(draft);
    void recordIntakeMigrationEvent('CanonicalDiffDetected', {
      equal: legacyCompare.equal,
      diffs: legacyCompare.diffs,
      templateId: draft.templateId,
      templateVersion: draft.templateVersion,
      rootSlug: serviceRequestV2.rootSlug,
    });

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
    mapped.aiExtractedData = {
      ...mapped.aiExtractedData,
      autoApprove,
    };

    const useAsyncQueue = rabbitMQEnabled();
    if (!useAsyncQueue && !isIntakeQueueSyncFallbackEnabled()) {
      return NextResponse.json(
        { error: 'سرویس صف پیام در دسترس نیست', code: 'queue_unavailable' },
        { status: 503 }
      );
    }

    const finalStatus = autoApprove ? 'OPEN' : 'PENDING_REVIEW';
    const finalModerationStatus = autoApprove ? 'APPROVED' : 'PENDING';

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
        deliveryTime: mapped.deliveryTime ?? null,
        deliveryUnit: mapped.deliveryUnit ?? 'day',
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
        status: useAsyncQueue ? 'PENDING_AI_REVIEW' : finalStatus,
        moderationStatus: useAsyncQueue ? 'PENDING' : finalModerationStatus,
      },
    });

    if (!useAsyncQueue) {
      completeSyncPublish(serviceRequest.id, {
        autoApprove,
        sessionId: body.sessionId,
      });

      void recordIntakeMigrationEvent('NeedDraftPublished', {
        requestId: serviceRequest.id,
        templateId: draft.templateId,
        templateVersion: draft.templateVersion,
        rootSlug: serviceRequestV2.rootSlug,
        canonicalHash: serviceRequestV2.canonicalHash,
        completionScore: draft.completionScore,
        matchabilityScore: draft.matchabilityScore,
        legacyEqual: legacyCompare.equal,
        shadowEqual: shadowComparison?.equal ?? null,
        asyncAi: false,
        syncFallback: true,
      });

      enqueueTrainingCapture(draft, serviceRequest.id, body.sessionId);

      return NextResponse.json({
        id: serviceRequest.id,
        slug: serviceRequest.slug,
        title: serviceRequest.title,
        status: serviceRequest.status,
        moderationStatus: serviceRequest.moderationStatus,
        autoApproved: autoApprove,
        syncFallback: true,
        message: syncPublishUserMessage(autoApprove),
      });
    }

    const jobId = randomUUID();
    const sourceText =
      String(draft.sourceText ?? '').trim() ||
      String(listingPreview?.description ?? mapped.description ?? '').trim();

    const citySlugFromIntent =
      draft.parsedIntent && typeof draft.parsedIntent === 'object'
        ? (draft.parsedIntent as { citySlug?: string }).citySlug
        : undefined;

    try {
      await publishIntakeAiTask(
        {
          jobId,
          serviceRequestId: serviceRequest.id,
          text: sourceText,
          citySlug:
            typeof entities.citySlug === 'string' ? entities.citySlug : citySlugFromIntent,
          cityName:
            typeof entities.city === 'string' ? entities.city : mapped.city ?? undefined,
          userId: user.id,
        },
        { messageId: jobId, correlationId: serviceRequest.id }
      );
    } catch (queueError) {
      console.error('[publish] rabbitmq publish failed', queueError);
      if (isIntakeQueueSyncFallbackEnabled()) {
        const updated = await db.serviceRequest.update({
          where: { id: serviceRequest.id },
          data: {
            status: finalStatus,
            moderationStatus: finalModerationStatus,
          },
        });
        completeSyncPublish(serviceRequest.id, {
          autoApprove,
          sessionId: body.sessionId,
        });
        enqueueTrainingCapture(draft, serviceRequest.id, body.sessionId);
        return NextResponse.json({
          id: updated.id,
          slug: updated.slug,
          title: updated.title,
          status: updated.status,
          moderationStatus: updated.moderationStatus,
          autoApproved: autoApprove,
          syncFallback: true,
          message: syncPublishUserMessage(autoApprove),
        });
      }
      await db.serviceRequest.delete({ where: { id: serviceRequest.id } }).catch(() => undefined);
      return NextResponse.json(
        { error: 'سرویس صف پیام در دسترس نیست', code: 'queue_publish_failed' },
        { status: 503 }
      );
    }

    void recordIntakeMigrationEvent('NeedDraftPublished', {
      requestId: serviceRequest.id,
      templateId: draft.templateId,
      templateVersion: draft.templateVersion,
      rootSlug: serviceRequestV2.rootSlug,
      canonicalHash: serviceRequestV2.canonicalHash,
      completionScore: draft.completionScore,
      matchabilityScore: draft.matchabilityScore,
      legacyEqual: legacyCompare.equal,
      shadowEqual: shadowComparison?.equal ?? null,
      asyncAi: true,
      jobId,
    });

    if (shadowComparison) {
      void recordIntakeMigrationEvent('ShadowPublishComparison', {
        requestId: serviceRequest.id,
        templateId: draft.templateId,
        equal: shadowComparison.equal,
        diffs: shadowComparison.diffs,
        canonicalHash: serviceRequestV2.canonicalHash,
      });
    }

    enqueueTrainingCapture(draft, serviceRequest.id, body.sessionId);

    return NextResponse.json(
      {
        accepted: true,
        jobId,
        id: serviceRequest.id,
        slug: serviceRequest.slug,
        title: serviceRequest.title,
        status: serviceRequest.status,
        moderationStatus: serviceRequest.moderationStatus,
        autoApproved: autoApprove,
        message: 'آگهی در صف پردازش هوش مصنوعی قرار گرفت',
      },
      {
        status: 202,
        headers: {
          Location: `/api/need-intake/publish/status/${serviceRequest.id}`,
        },
      }
    );
  } catch (error) {
    console.error('need-intake publish error:', error);
    const formatted = formatNeedIntakePublishError(error);
    if (formatted.status === 422 && formatted.code?.startsWith('category')) {
      return NextResponse.json(
        { success: false, errors: [{ path: 'categorySlug', message: formatted.message }] },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: formatted.message, code: formatted.code },
      { status: formatted.status }
    );
  }
}
