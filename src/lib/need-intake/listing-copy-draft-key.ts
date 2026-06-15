import type { NeedDraft } from '@/contracts/need-intake';

/** Stable key for listing-copy debounce — avoids re-streaming on draft object identity changes. */
export function buildListingCopyDraftKey(draft: NeedDraft): string {
  const loc = draft.entities?.location as Record<string, unknown> | undefined;
  return [
    draft.sourceText ?? '',
    draft.category ?? '',
    String(draft.entities?.subcategory ?? ''),
    String(loc?.city ?? draft.entities?.city ?? ''),
    String(loc?.neighborhood ?? draft.entities?.neighborhood ?? ''),
    JSON.stringify(draft.entities ?? {}),
    JSON.stringify(draft.answers ?? {}),
  ].join('\0');
}
