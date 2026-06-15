'use client';

import type { NeedDraft } from '@/contracts/need-intake';
import {
  useListingCopyStream,
  type LiveListingCopySnapshot,
} from '@/hooks/use-listing-copy-stream';

/** Live listing copy disabled — manual wizard uses template at preview step. */
export function useIntakeListingCopy(
  liveDraftForCopy: NeedDraft | null,
  enabled: boolean
): LiveListingCopySnapshot | null {
  return useListingCopyStream(liveDraftForCopy, enabled);
}
