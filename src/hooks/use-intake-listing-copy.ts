'use client';

import type { NeedDraft } from '@/contracts/need-intake';
import { useListingCopyStream } from '@/hooks/use-listing-copy-stream';

/** Live listing title/description stream on details/location steps. */
export function useIntakeListingCopy(
  liveDraftForCopy: NeedDraft | null,
  enabled: boolean
) {
  return useListingCopyStream(liveDraftForCopy, enabled);
}
