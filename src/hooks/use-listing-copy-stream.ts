'use client';

import type { NeedDraft } from '@/contracts/need-intake';

export interface LiveListingCopySnapshot {
  title: string;
  description: string;
  streaming?: boolean;
}

/** SSE listing copy stream removed — no live preview during compose. */
export function useListingCopyStream(
  _draft: NeedDraft | null,
  _enabled: boolean
): LiveListingCopySnapshot | null {
  return null;
}

export async function consumeListingCopyStream(
  _draft: NeedDraft,
  _handlers: Record<string, unknown>
): Promise<void> {
  return;
}
