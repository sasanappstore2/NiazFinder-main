/**
 * Publish-need service — the business logic extracted out of
 * `src/app/api/need-intake/publish/route.ts` (previously ~386 inline lines).
 *
 * Responsibilities:
 *  - validate draft, sanitize title, map draft → ServiceRequest
 *  - idempotency: dedupe double-submits via (userId, idempotencyKey)
 *  - create the row + async-queue (or sync fallback)
 *  - fire telemetry/migration events safely (logged, never swallowed)
 *
 * Returns a `{ status, body, headers? }` envelope so the route serializes it
 * verbatim — response shapes are byte-compatible with the previous handler
 * (plus an additive `deduped` flag on dedupe). Unexpected errors throw and are
 * formatted by the route via `formatNeedIntakePublishError`, exactly as before.
 *
 * Dependencies are injected (`deps`) so the idempotency self-test can run with a
 * fake db + queue and no real infra.
 */
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { createSlug } from '@/lib/auth';
import { mapDraftToCreateRequest } from '@/lib/need-intake/map-to-request';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveCategoryIds } from '@/lib/need-intake/resolve-category';
import { normalizeCategoryPair } from '@/config/categories';
import type { NeedDraft, ListingPreview } from '@/contracts/need-intake';
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
import { assertPublishDatabaseReady } from '@/lib/need-intake/publish-error-message';
import { isIntakeQueueSyncFallbackEnabled } from '@/lib/need-intake/intake-queue-policy';
import {
  completeSyncPublish,
  syncPublishUserMessage,
} from '@/lib/need-intake/publish-sync-fallback';
import { publishIntakeAiTask, rabbitMQEnabled } from '@/lib/queue/rabbitmq-client';
import { captureTrainingExampleAsync } from '@/intake/training/captureTrainingExample';
import { intakeLog, safeFireAndForget } from '@/intake/server/logger';
import {
  createOrDedupe,
  isPrismaUniqueViolation,
  type DedupeOutcome,
} from '@/intake/server/idempotency';

export interface PublishNeedInput {
  draft: NeedDraft;
  listingPreview?: ListingPreview;
  sessionId?: string;
  linkToBusinessProfile?: boolean;
  /** From the `Idempotency-Key` header; falls back to sessionId in the route. */
  idempotencyKey?: string;
  userId: string;
}

export interface PublishNeedDeps {
  db: typeof db;
  rabbitMQEnabled: () => boolean;
  publishIntakeAiTask: typeof publishIntakeAiTask;
  recordMigrationEvent: typeof recordIntakeMigrationEvent;
  captureTraining: (draft: NeedDraft, serviceRequestId: string, sessionId?: string) => void;
  /** Injected so the idempotency self-test can run without a real category table. */
  resolveCategoryIds: typeof resolveCategoryIds;
}

export interface PublishNeedResult {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export function defaultPublishDeps(): PublishNeedDeps {
  return {
    db,
    rabbitMQEnabled,
    publishIntakeAiTask,
    recordMigrationEvent: recordIntakeMigrationEvent,
    captureTraining: enqueueTrainingCapture,
    resolveCategoryIds,
  };
}

function enqueueTrainingCapture(
  draft: NeedDraft,
  serviceRequestId: string,
  sessionId?: string,
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

function dedupeBody(row: {
  id: string;
  slug: string;
  title: string;
  status: string;
  moderationStatus: string;
}): PublishNeedResult {
  return {
    status: 200,
    body: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      moderationStatus: row.moderationStatus,
      autoApproved: row.moderationStatus === 'APPROVED',
      deduped: true,
      message: syncPublishUserMessage(row.moderationStatus === 'APPROVED'),
    },
  };
}

export async function publishNeedService(
  input: PublishNeedInput,
  deps: PublishNeedDeps = defaultPublishDeps(),
): Promise<PublishNeedResult> {
  const { draft, userId } = input;
  const listingPreview = input.listingPreview ?? draft?.listingPreview;
  const idempotencyKey = input.idempotencyKey?.trim() || undefined;

  await assertPublishDatabaseReady(() => deps.db.$queryRaw`SELECT 1`);

  // ── Idempotency: return the prior listing for a repeated submit ──
  if (idempotencyKey) {
    const existing = await deps.db.serviceRequest.findFirst({
      where: { userId, idempotencyKey },
    });
    if (existing) {
      intakeLog('publish.deduped', { serviceRequestId: existing.id, idempotencyKey });
      return dedupeBody(existing);
    }
  }

  const validation = validateNeedDraftForPublish(draft);
  if (!validation.success) {
    return { status: 422, body: { success: false, errors: validation.errors } };
  }

  if (listingPreview) {
    const previewTitle = truncateListingTitle(
      String(listingPreview.title ?? '').trim() || 'ثبت نیاز',
    );
    const titleReject = rejectListingTitleReason(previewTitle, { sourceText: draft.sourceText });
    if (titleReject) {
      return {
        status: 422,
        body: {
          success: false,
          errors: [
            {
              path: 'listingPreview.title',
              message:
                'عنوان آگهی خیلی کلی است. لطفاً موضوع نیاز (مثلاً نوع خودرو یا خدمات) را در عنوان بیاورید.',
            },
          ],
        },
      };
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
  safeFireAndForget('migration.canonical_diff', () =>
    deps.recordMigrationEvent('CanonicalDiffDetected', {
      equal: legacyCompare.equal,
      diffs: legacyCompare.diffs,
      templateId: draft.templateId,
      templateVersion: draft.templateVersion,
      rootSlug: serviceRequestV2.rootSlug,
    }),
  );

  const normalized = normalizeCategoryPair(
    entities.categorySlug ?? draft.parsedIntent.categorySlug,
    entities.subcategorySlug ?? draft.parsedIntent.subcategorySlug,
  );
  const { categoryId, subcategoryId } = await deps.resolveCategoryIds(
    normalized.categorySlug,
    normalized.subcategorySlug,
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
  const existingSlug = await deps.db.serviceRequest.findUnique({ where: { slug } });
  if (existingSlug) slug = `${slug}-${Date.now()}`;

  let businessProfileId: string | null = null;
  if (input.linkToBusinessProfile === true) {
    const bizProfile = await deps.db.businessProfile.findUnique({ where: { userId } });
    if (bizProfile) businessProfileId = bizProfile.id;
  }

  const autoApprove = shouldAutoApproveNeed(mapped.source);
  mapped.aiExtractedData = { ...mapped.aiExtractedData, autoApprove };

  const useAsyncQueue = deps.rabbitMQEnabled();
  if (!useAsyncQueue && !isIntakeQueueSyncFallbackEnabled()) {
    return {
      status: 503,
      body: { error: 'سرویس صف پیام در دسترس نیست', code: 'queue_unavailable' },
    };
  }

  const finalStatus = autoApprove ? 'OPEN' : 'PENDING_REVIEW';
  const finalModerationStatus = autoApprove ? 'APPROVED' : 'PENDING';

  const serviceRequest = await createServiceRequest(deps, {
    mapped,
    slug,
    serviceRequestV2,
    userId,
    businessProfileId,
    status: useAsyncQueue ? 'PENDING_AI_REVIEW' : finalStatus,
    moderationStatus: useAsyncQueue ? 'PENDING' : finalModerationStatus,
    idempotencyKey,
  });

  // A racing double-submit can win the unique race → return the row it created.
  if (serviceRequest.deduped) {
    intakeLog('publish.deduped_race', { serviceRequestId: serviceRequest.row.id, idempotencyKey });
    return dedupeBody(serviceRequest.row);
  }
  const row = serviceRequest.row;

  if (!useAsyncQueue) {
    completeSyncPublish(row.id, { autoApprove, sessionId: input.sessionId });
    safeFireAndForget('migration.published_sync', () =>
      deps.recordMigrationEvent('NeedDraftPublished', {
        requestId: row.id,
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
      }),
    );
    safeFireAndForget('training.capture_sync', () =>
      deps.captureTraining(draft, row.id, input.sessionId),
    );
    return {
      status: 200,
      body: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        moderationStatus: row.moderationStatus,
        autoApproved: autoApprove,
        syncFallback: true,
        message: syncPublishUserMessage(autoApprove),
      },
    };
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
    await deps.publishIntakeAiTask(
      {
        jobId,
        serviceRequestId: row.id,
        text: sourceText,
        citySlug: typeof entities.citySlug === 'string' ? entities.citySlug : citySlugFromIntent,
        cityName: typeof entities.city === 'string' ? entities.city : mapped.city ?? undefined,
        userId,
      },
      { messageId: jobId, correlationId: row.id },
    );
  } catch (queueError) {
    intakeLog.error('publish.queue_failed', { serviceRequestId: row.id, err: queueError });
    if (isIntakeQueueSyncFallbackEnabled()) {
      const updated = await deps.db.serviceRequest.update({
        where: { id: row.id },
        data: { status: finalStatus, moderationStatus: finalModerationStatus },
      });
      completeSyncPublish(row.id, { autoApprove, sessionId: input.sessionId });
      safeFireAndForget('training.capture_fallback', () =>
        deps.captureTraining(draft, row.id, input.sessionId),
      );
      return {
        status: 200,
        body: {
          id: updated.id,
          slug: updated.slug,
          title: updated.title,
          status: updated.status,
          moderationStatus: updated.moderationStatus,
          autoApproved: autoApprove,
          syncFallback: true,
          message: syncPublishUserMessage(autoApprove),
        },
      };
    }
    // Idempotency-safe: a retry with the same key reuses the existing row instead
    // of orphaning, so deleting here no longer risks a lost-then-duplicated need.
    await deps.db.serviceRequest.delete({ where: { id: row.id } }).catch(() => undefined);
    return {
      status: 503,
      body: { error: 'سرویس صف پیام در دسترس نیست', code: 'queue_publish_failed' },
    };
  }

  safeFireAndForget('migration.published_async', () =>
    deps.recordMigrationEvent('NeedDraftPublished', {
      requestId: row.id,
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
    }),
  );
  if (shadowComparison) {
    safeFireAndForget('migration.shadow_compare', () =>
      deps.recordMigrationEvent('ShadowPublishComparison', {
        requestId: row.id,
        templateId: draft.templateId,
        equal: shadowComparison!.equal,
        diffs: shadowComparison!.diffs,
        canonicalHash: serviceRequestV2.canonicalHash,
      }),
    );
  }
  safeFireAndForget('training.capture_async', () =>
    deps.captureTraining(draft, row.id, input.sessionId),
  );

  return {
    status: 202,
    headers: { Location: `/api/need-intake/publish/status/${row.id}` },
    body: {
      accepted: true,
      jobId,
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      moderationStatus: row.moderationStatus,
      autoApproved: autoApprove,
      message: 'آگهی در صف پردازش هوش مصنوعی قرار گرفت',
    },
  };
}

type CreatedRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  moderationStatus: string;
};

/**
 * Create the ServiceRequest row. On a Prisma P2002 unique violation against the
 * idempotency key (a racing concurrent submit), re-query and signal `deduped`.
 */
function createServiceRequest(
  deps: PublishNeedDeps,
  args: {
    mapped: ReturnType<typeof mapDraftToCreateRequest>;
    slug: string;
    serviceRequestV2: unknown;
    userId: string;
    businessProfileId: string | null;
    status: 'PENDING_AI_REVIEW' | 'OPEN' | 'PENDING_REVIEW';
    moderationStatus: 'PENDING' | 'APPROVED';
    idempotencyKey?: string;
  },
): Promise<DedupeOutcome<CreatedRow>> {
  const { mapped, slug, serviceRequestV2, userId, businessProfileId, idempotencyKey } = args;
  return createOrDedupe<CreatedRow>(idempotencyKey, {
    findExisting: (key) => deps.db.serviceRequest.findFirst({ where: { userId, idempotencyKey: key } }),
    isUniqueViolation: isPrismaUniqueViolation,
    create: () =>
      deps.db.serviceRequest.create({
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
          dynamicAnswers: JSON.stringify({ ...mapped.dynamicAnswers, serviceRequestV2 }),
          aiExtractedData: JSON.stringify(mapped.aiExtractedData),
          source: mapped.source,
          userId,
          businessProfileId,
          status: args.status,
          moderationStatus: args.moderationStatus,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      }),
  });
}
