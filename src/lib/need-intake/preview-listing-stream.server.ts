import 'server-only';

import type { NeedDraft } from '@/contracts/need-intake';
import { buildBaselineListingCopy } from '@/lib/need-intake/baseline-listing-copy';
import { generateListingCopy } from '@/lib/need-intake/generate-listing-copy';
import { buildListingCopyContext } from '@/lib/need-intake/listing-copy-prompt';
import { finalizeListingTitle } from '@/lib/need-intake/listing-title-sanitize';
import type { ListingCopyStreamEvent } from '@/lib/need-intake/listing-copy-stream-types';

export type { ListingCopyStreamEvent };

function chunkText(text: string, size = 12): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    parts.push(text.slice(i, i + size));
  }
  return parts;
}

/** Server-side SSE sequence: baseline → AI copy with description deltas. */
export async function* streamListingCopyEvents(
  draft: NeedDraft
): AsyncGenerator<ListingCopyStreamEvent> {
  const baseline = buildBaselineListingCopy(draft);
  yield {
    type: 'baseline',
    title: baseline.title,
    description: baseline.description,
  };

  try {
    const copy = await generateListingCopy(draft);
    const ctx = buildListingCopyContext(draft);
    const title = finalizeListingTitle(copy.title, { sourceText: ctx.sourceSummary });

    yield {
      type: 'title',
      title,
      titleSource: copy.titleSource,
    };

    const desc = copy.description;
    if (copy.descriptionSource === 'qwen' && desc.length > 0) {
      for (const chunk of chunkText(desc, 16)) {
        yield { type: 'description_delta', text: chunk };
      }
    }

    yield {
      type: 'done',
      title,
      description: desc,
      titleSource: copy.titleSource,
      descriptionSource: copy.descriptionSource,
    };
  } catch (e) {
    yield {
      type: 'error',
      message: e instanceof Error ? e.message : 'خطا در تولید آگهی',
    };
    yield {
      type: 'done',
      title: baseline.title,
      description: baseline.description,
      titleSource: 'template',
      descriptionSource: 'template',
    };
  }
}
