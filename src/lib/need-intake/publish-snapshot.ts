import type { IntakePublishSnapshot, ListingPreview, NeedDraft } from '@/contracts/need-intake';

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, current) => {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return Object.keys(current as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((out, key) => {
          out[key] = (current as Record<string, unknown>)[key];
          return out;
        }, {});
    }
    return current;
  });
}

function draftWithoutSnapshot(draft: NeedDraft): Omit<NeedDraft, 'publishSnapshot'> {
  const { publishSnapshot: _ignored, ...rest } = draft;
  return rest;
}

export function snapshotHashPayload(
  draft: NeedDraft | Omit<NeedDraft, 'publishSnapshot'>,
  listingPreview: ListingPreview,
  draftRevision: number
): unknown {
  const cleanDraft = 'publishSnapshot' in draft
    ? draftWithoutSnapshot(draft as NeedDraft)
    : draft;
  return { draft: cleanDraft, listingPreview, draftRevision };
}

export async function createIntakePublishSnapshot(
  draft: NeedDraft,
  listingPreview: ListingPreview
): Promise<IntakePublishSnapshot> {
  const draftRevision = draft.draftRevision ?? 0;
  const cleanDraft = draftWithoutSnapshot(draft);
  const payload = stableJson(snapshotHashPayload(cleanDraft, listingPreview, draftRevision));
  const bytes = new TextEncoder().encode(payload);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const draftHash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return {
    schemaVersion: 2,
    draft: cleanDraft,
    listingPreview,
    draftRevision,
    draftHash,
    idempotencyKey: globalThis.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}
