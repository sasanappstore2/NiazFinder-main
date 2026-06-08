import type { NeedDraft } from '@/contracts/need-intake';
import {
  buildListingTitleContext,
} from '@/lib/need-intake/listing-title-prompt';
import {
  finalizeListingTitle,
  isAcceptableListingTitle,
  type TitleQualityContext,
} from '@/lib/need-intake/listing-title-sanitize';
import {
  mergeListingTitleWithAi,
  resolveDeterministicListingTitle,
} from '@/lib/need-intake/resolve-listing-title';
import {
  generateTitleViaQwen,
  isNeedIntakeLlmEnabled,
} from '@/lib/need-intake/qwen-intake-client';

export type ListingTitleSource = 'qwen' | 'template';

export interface GenerateListingTitleResult {
  title: string;
  source: ListingTitleSource;
  latencyMs: number;
  rejectedReason?: string;
}

function isTitleAiEnabled(): boolean {
  if (process.env.NEED_INTAKE_TITLE_AI_ENABLED === 'false') return false;
  if (process.env.NEED_INTAKE_TITLE_AI_ENABLED === 'true') return true;
  return isNeedIntakeLlmEnabled();
}

function logTitleResult(meta: {
  source: ListingTitleSource;
  latencyMs: number;
  titleLength: number;
  rejectedReason?: string;
}) {
  if (process.env.NODE_ENV === 'test') return;
  console.info('[listing-title]', meta);
}

function titleContext(draft: NeedDraft): TitleQualityContext {
  const ctx = buildListingTitleContext(draft);
  return { sourceText: draft.sourceText ?? ctx.sourceSummary };
}

/**
 * Generate a marketplace title: deterministic base → optional Qwen overlay.
 * AI never replaces a valid structured title with a worse copy.
 */
export async function generateListingTitle(
  draft: NeedDraft,
  _templateFallback?: string
): Promise<GenerateListingTitleResult> {
  const started = performance.now();
  const qualityCtx = titleContext(draft);
  const deterministic = resolveDeterministicListingTitle(draft).title;

  if (!isTitleAiEnabled()) {
    const result: GenerateListingTitleResult = {
      title: deterministic,
      source: 'template',
      latencyMs: Math.round(performance.now() - started),
    };
    logTitleResult({
      source: result.source,
      latencyMs: result.latencyMs,
      titleLength: result.title.length,
    });
    return result;
  }

  let rejectedReason: string | undefined;

  try {
    const ctx = buildListingTitleContext(draft);
    const qwenResult = await generateTitleViaQwen(ctx, {
      fallbackTitle: deterministic,
      sourceText: qualityCtx.sourceText,
    });
    if (qwenResult?.title) {
      const merged = mergeListingTitleWithAi(draft, qwenResult.title);
      const usedAi = merged !== deterministic && isAcceptableListingTitle(
        finalizeListingTitle(qwenResult.title, qualityCtx),
        qualityCtx
      );
      const result: GenerateListingTitleResult = {
        title: merged,
        source: usedAi ? 'qwen' : 'template',
        latencyMs: Math.round(performance.now() - started),
        rejectedReason: usedAi ? undefined : 'qwen_not_better_than_deterministic',
      };
      logTitleResult({
        source: result.source,
        latencyMs: result.latencyMs,
        titleLength: result.title.length,
        rejectedReason: result.rejectedReason,
      });
      return result;
    }
    rejectedReason = 'qwen_empty_or_rejected';
  } catch {
    rejectedReason = 'qwen_error';
  }

  const result: GenerateListingTitleResult = {
    title: deterministic,
    source: 'template',
    latencyMs: Math.round(performance.now() - started),
    rejectedReason,
  };
  logTitleResult({
    source: result.source,
    latencyMs: result.latencyMs,
    titleLength: result.title.length,
    rejectedReason: result.rejectedReason,
  });
  return result;
}
