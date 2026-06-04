import type { NeedDraft } from '@/contracts/need-intake';
import {
  buildListingTitleContext,
} from '@/lib/need-intake/listing-title-prompt';
import {
  isAcceptableListingTitle,
  normalizeListingTitle,
  truncateListingTitle,
} from '@/lib/need-intake/listing-title-sanitize';
import { buildHeuristicListingTitle } from '@/lib/need-intake/vertical-title';
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

function finalizeTemplateTitle(
  draft: NeedDraft,
  templateFallback: string,
  qualityCtx: { sourceText?: string }
): string {
  const normalizedFallback = truncateListingTitle(
    normalizeListingTitle(templateFallback) || 'ثبت نیاز'
  );

  if (isAcceptableListingTitle(normalizedFallback, qualityCtx)) {
    return normalizedFallback;
  }

  const heuristic = buildHeuristicListingTitle(draft);
  if (isAcceptableListingTitle(heuristic, qualityCtx)) {
    return heuristic;
  }

  return truncateListingTitle(heuristic || normalizedFallback);
}

/**
 * Generate a marketplace title: Qwen (intake-mlx) → vertical heuristic → template.
 */
export async function generateListingTitle(
  draft: NeedDraft,
  templateFallback: string
): Promise<GenerateListingTitleResult> {
  const started = performance.now();
  const ctx = buildListingTitleContext(draft);
  const qualityCtx = { sourceText: draft.sourceText ?? ctx.sourceSummary };
  const heuristicFallback = buildHeuristicListingTitle(draft);
  const fallback = finalizeTemplateTitle(draft, templateFallback, qualityCtx);

  if (!isTitleAiEnabled()) {
    const result: GenerateListingTitleResult = {
      title: fallback,
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
    const qwenResult = await generateTitleViaQwen(ctx, {
      fallbackTitle: heuristicFallback,
      sourceText: qualityCtx.sourceText,
    });
    if (qwenResult?.title) {
      const result: GenerateListingTitleResult = {
        title: qwenResult.title,
        source: 'qwen',
        latencyMs: Math.round(performance.now() - started),
      };
      logTitleResult({
        source: result.source,
        latencyMs: result.latencyMs,
        titleLength: result.title.length,
      });
      return result;
    }
    rejectedReason = 'qwen_empty_or_rejected';
  } catch {
    rejectedReason = 'qwen_error';
  }

  const result: GenerateListingTitleResult = {
    title: fallback,
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
