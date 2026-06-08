import 'server-only';

import type { NeedDraft } from '@/contracts/need-intake';
import { buildBaselineListingCopy } from '@/lib/need-intake/baseline-listing-copy';
import {
  buildListingCopyContext,
  buildListingCopySystemPrompt,
  buildListingCopyUserPrompt,
} from '@/lib/need-intake/listing-copy-prompt';
import { generateListingTitle, type ListingTitleSource } from '@/lib/need-intake/generate-listing-title';
import {
  finalizeListingTitle,
} from '@/lib/need-intake/listing-title-sanitize';
import { mergeListingTitleWithAi } from '@/lib/need-intake/resolve-listing-title';
import {
  aiDescriptionConflictsSource,
  pickListingTitleWithDealGuard,
} from '@/lib/need-intake/listing-copy-guards';
import {
  generateListingCopyViaQwen,
  isNeedIntakeLlmEnabled,
} from '@/lib/need-intake/qwen-intake-client';

export interface GeneratedListingCopy {
  title: string;
  description: string;
  titleSource: ListingTitleSource;
  descriptionSource: 'qwen' | 'template';
}

function parseListingCopyJson(raw: string): { title?: string; description?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as { title?: string; description?: string };
  } catch {
    return null;
  }
}

function isCopyAiEnabled(): boolean {
  if (process.env.NEED_INTAKE_COPY_AI_ENABLED === 'false') return false;
  if (process.env.NEED_INTAKE_COPY_AI_ENABLED === 'true') return true;
  return isNeedIntakeLlmEnabled();
}

/** Full copy: deterministic baseline → optional MLX JSON {title, description}. */
export async function generateListingCopy(draft: NeedDraft): Promise<GeneratedListingCopy> {
  const baseline = buildBaselineListingCopy(draft);
  const ctx = buildListingCopyContext(draft);

  if (!isCopyAiEnabled()) {
    const titleResult = await generateListingTitle(draft);
    return {
      title: titleResult.title,
      description: baseline.description,
      titleSource: titleResult.source,
      descriptionSource: 'template',
    };
  }

  try {
    const qwen = await generateListingCopyViaQwen(ctx);
    if (qwen?.title || qwen?.description) {
      const mergedTitle = qwen.title
        ? mergeListingTitleWithAi(draft, qwen.title)
        : baseline.title;
      const safeTitle = pickListingTitleWithDealGuard(
        baseline.title,
        mergedTitle,
        ctx.sourceSummary
      );
      let description =
        qwen.description?.trim().length >= 40
          ? qwen.description.trim()
          : baseline.description;
      if (aiDescriptionConflictsSource(description, ctx.sourceSummary, ctx.dealTypeFa)) {
        description = baseline.description;
      }
      const usedAiTitle = safeTitle !== baseline.title;
      const usedAiDesc = description !== baseline.description;
      return {
        title: finalizeListingTitle(safeTitle, { sourceText: ctx.sourceSummary }),
        description,
        titleSource: usedAiTitle ? 'qwen' : 'template',
        descriptionSource: usedAiDesc ? 'qwen' : 'template',
      };
    }
  } catch {
    // fall through
  }

  const titleResult = await generateListingTitle(draft);
  return {
    title: titleResult.title,
    description: baseline.description,
    titleSource: titleResult.source,
    descriptionSource: 'template',
  };
}

export {
  buildListingCopyContext,
  buildListingCopySystemPrompt,
  buildListingCopyUserPrompt,
  parseListingCopyJson,
};
