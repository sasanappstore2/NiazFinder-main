/**
 * Headless /post pipeline — mirrors NeedIntakePanel form → draft → title.
 * Uses projectNeedDraftFromForm (not legacyNeedDraftFromParsed).
 */
import type { NeedDraft } from '@/contracts/need-intake';
import {
  projectNeedDraftFromForm,
  recordToEntities,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import { buildListingCopyContext } from '@/lib/need-intake/listing-copy-prompt';
import {
  aiDescriptionConflictsSource,
  pickListingTitleWithDealGuard,
} from '@/lib/need-intake/listing-copy-guards';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import {
  rejectListingTitleReason,
  isAcceptableListingTitle,
} from '@/lib/need-intake/listing-title-sanitize';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';

export interface PostPipelineFormInput {
  needText: string;
  detailsText?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  city?: string;
  neighborhood?: string;
  neighborhoodSlug?: string | null;
  /** Simulates user-locked deal chip */
  userDealType?: string;
}

export interface PostPipelineResult {
  draft: NeedDraft;
  title: string;
  description: string;
  titleRejectReason: string | null;
  publishValid: boolean;
  publishErrors: string[];
  copyContext: ReturnType<typeof buildListingCopyContext>;
}

export function runPostPipeline(
  input: PostPipelineFormInput,
  existingDraft: NeedDraft | null = null
): PostPipelineResult {
  let draft = projectNeedDraftFromForm(existingDraft, {
    needText: input.needText.trim(),
    detailsText: input.detailsText?.trim() ?? '',
    categorySlug: input.categorySlug?.trim() ?? '',
    subcategorySlug: input.subcategorySlug?.trim() ?? '',
    city: input.city?.trim() ?? '',
    neighborhood: input.neighborhood?.trim() ?? '',
    neighborhoodSlug: input.neighborhoodSlug ?? null,
  });

  if (input.userDealType) {
    const tx = mapDealTypeToTransaction(input.userDealType);
    draft = recomputeNeedDraft({
      ...draft,
      answers: {
        ...draft.answers,
        dealType: input.userDealType,
        _userSetDealType: true,
      },
      entities: {
        ...draft.entities,
        ...(tx ? { transactionType: tx } : {}),
      },
    });
  }

  const title = resolveDeterministicListingTitle(draft).title;
  const listing = composeListingFromDraft(draft);
  const copyContext = buildListingCopyContext(draft);
  const titleRejectReason = rejectListingTitleReason(title, { sourceText: draft.sourceText });
  const publish = validateNeedDraftForPublish(draft);

  return {
    draft,
    title,
    description: listing.description,
    titleRejectReason,
    publishValid: publish.success,
    publishErrors: publish.errors.map((e) => `${e.field}: ${e.message}`),
    copyContext,
  };
}

export function assertTitleExpertReadable(
  result: PostPipelineResult,
  opts?: {
    minLength?: number;
    mustInclude?: RegExp[];
    mustNotInclude?: RegExp[];
    skipSanitize?: boolean;
  }
): string | null {
  const minLen = opts?.minLength ?? 10;
  if (result.title.length < minLen) {
    return `title too short: ${result.title}`;
  }
  if (
    !opts?.skipSanitize &&
    !isAcceptableListingTitle(result.title, { sourceText: result.draft.sourceText })
  ) {
    return `title rejected: ${result.titleRejectReason} (${result.title})`;
  }
  for (const re of opts?.mustInclude ?? []) {
    if (!re.test(result.title)) return `title missing ${re}: ${result.title}`;
  }
  for (const re of opts?.mustNotInclude ?? []) {
    if (re.test(result.title)) return `title must not match ${re}: ${result.title}`;
  }
  return null;
}

export function assertAiCopyGuard(
  baselineTitle: string,
  badAiTitle: string,
  sourceText: string,
  dealTypeFa?: string,
  badDesc?: string
): string | null {
  if (pickListingTitleWithDealGuard(baselineTitle, badAiTitle, sourceText) !== baselineTitle) {
    return 'AI title guard failed to reject bad title';
  }
  if (
    badDesc &&
    !aiDescriptionConflictsSource(badDesc, sourceText, dealTypeFa)
  ) {
    return 'AI description guard failed to reject bad description';
  }
  return null;
}

export function draftMoneySnapshot(draft: NeedDraft): {
  dealType?: string;
  rahnAmount?: number;
  monthlyRent?: number;
  budget?: number;
  transactionType?: string;
} {
  const { answers, parsedIntent } = draftToLegacyPayload(draft);
  const entities = recordToEntities(draft.entities);
  return {
    dealType: String(answers.dealType ?? parsedIntent.entities?.dealType ?? ''),
    rahnAmount:
      answers.rahnAmount != null
        ? Number(answers.rahnAmount)
        : parsedIntent.entities?.rahnAmount
          ? Number(parsedIntent.entities.rahnAmount)
          : undefined,
    monthlyRent:
      answers.monthlyRent != null
        ? Number(answers.monthlyRent)
        : parsedIntent.entities?.monthlyRent
          ? Number(parsedIntent.entities.monthlyRent)
          : undefined,
    budget: answers.budget != null ? Number(answers.budget) : parsedIntent.budgetMax,
    transactionType: entities.transactionType ?? undefined,
  };
}
