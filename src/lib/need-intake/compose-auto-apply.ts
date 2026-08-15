/**
 * Compose auto-apply discipline (RFC-0004).
 * Calm UX: ambiguity ⇒ refuse to write (no chip theater).
 */
import type { NeedDraft } from '@/contracts/need-intake';
import { RULES_DISAMBIG_MIN_CONFIDENCE } from '@/intake/rules/config';

/** Category + location auto-apply / draft retention — frozen parity. */
export const COMPOSE_AUTO_APPLY_MIN_CONFIDENCE = RULES_DISAMBIG_MIN_CONFIDENCE; // 0.85

/** High-confidence writes should carry evidence when available. */
export const COMPOSE_EVIDENCE_REQUIRED_MIN_CONFIDENCE = 0.75;

export const UNDERSTANDING_LOCATION_MIN_CONFIDENCE = COMPOSE_AUTO_APPLY_MIN_CONFIDENCE;

/** Keep mid-confidence neighborhood for chips / form prefill (auto-lock stays 0.85). */
export const NEIGHBORHOOD_PREFILL_MIN_CONFIDENCE = 0.5;

export type ComposeFieldKey =
  | 'categorySlug'
  | 'subcategorySlug'
  | 'city'
  | 'citySlug'
  | 'neighborhood'
  | 'neighborhoodSlug';

const CATEGORY_KEYS: ComposeFieldKey[] = ['categorySlug', 'subcategorySlug'];
const LOCATION_KEYS: ComposeFieldKey[] = [
  'city',
  'citySlug',
  'neighborhood',
  'neighborhoodSlug',
];

function metaConfidence(
  draft: NeedDraft,
  key: string
): number {
  const n = Number(draft.fieldMeta?.[key]?.confidence ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** True when field may be auto-applied / retained in draft for compose. */
export function mayAutoApplyField(
  draft: NeedDraft,
  key: ComposeFieldKey,
  opts?: { candidateCount?: number; ambiguous?: boolean }
): boolean {
  if (opts?.ambiguous) return false;
  if ((opts?.candidateCount ?? 0) >= 2) return false;
  const conf = metaConfidence(draft, key);
  if (conf < COMPOSE_AUTO_APPLY_MIN_CONFIDENCE) return false;
  return true;
}

export function mayPrefillNeighborhood(draft: NeedDraft): boolean {
  const candidates = draft.parsedIntent?.neighborhoodCandidates?.length ?? 0;
  if (candidates >= 2) return false;
  const conf = Math.max(
    metaConfidence(draft, 'neighborhood'),
    metaConfidence(draft, 'neighborhoodSlug')
  );
  return conf >= NEIGHBORHOOD_PREFILL_MIN_CONFIDENCE;
}

export function mayAutoApplyLocation(
  draft: NeedDraft,
  kind: 'city' | 'neighborhood'
): boolean {
  const candidates = draft.parsedIntent?.neighborhoodCandidates?.length ?? 0;
  if (kind === 'neighborhood' && candidates >= 2) return false;

  if (kind === 'city') {
    return (
      mayAutoApplyField(draft, 'city', { candidateCount: 0 }) ||
      mayAutoApplyField(draft, 'citySlug', { candidateCount: 0 })
    );
  }

  return (
    mayAutoApplyField(draft, 'neighborhood', { candidateCount: candidates }) ||
    mayAutoApplyField(draft, 'neighborhoodSlug', { candidateCount: candidates })
  );
}

function stripEntity(
  entities: Record<string, unknown> | undefined,
  key: string
): Record<string, unknown> | undefined {
  if (!entities || !(key in entities)) return entities;
  const next = { ...entities };
  delete next[key];
  return next;
}

function stripFieldMeta(
  fieldMeta: NeedDraft['fieldMeta'],
  key: string
): NeedDraft['fieldMeta'] {
  if (!fieldMeta || !(key in fieldMeta)) return fieldMeta;
  const next = { ...fieldMeta };
  delete next[key];
  return next;
}

/**
 * Strip below-gate category / ambiguous location from a draft before setNeedDraft.
 * Does not reintroduce UI theater — omit fields only.
 */
export function sanitizeDraftForComposeAutoApply(draft: NeedDraft): NeedDraft {
  let entities =
    draft.entities && typeof draft.entities === 'object'
      ? ({ ...(draft.entities as Record<string, unknown>) } as Record<string, unknown>)
      : undefined;
  let fieldMeta = draft.fieldMeta ? { ...draft.fieldMeta } : undefined;
  let parsedIntent = draft.parsedIntent
    ? { ...draft.parsedIntent, entities: { ...(draft.parsedIntent.entities ?? {}) } }
    : draft.parsedIntent;

  const hoodCandidates = draft.parsedIntent?.neighborhoodCandidates?.length ?? 0;

  for (const key of CATEGORY_KEYS) {
    if (!mayAutoApplyField(draft, key)) {
      entities = stripEntity(entities, key);
      fieldMeta = stripFieldMeta(fieldMeta, key);
      if (parsedIntent) {
        if (key === 'categorySlug') {
          const { categorySlug: _drop, ...rest } = parsedIntent;
          parsedIntent = rest as typeof parsedIntent;
        }
        if (key === 'subcategorySlug') {
          const { subcategorySlug: _drop, ...rest } = parsedIntent;
          parsedIntent = rest as typeof parsedIntent;
        }
        if (parsedIntent.entities && key in parsedIntent.entities) {
          const ent = { ...parsedIntent.entities };
          delete ent[key as keyof typeof ent];
          parsedIntent = { ...parsedIntent, entities: ent };
        }
      }
    }
  }

  for (const key of LOCATION_KEYS) {
    const kind = key.startsWith('neighborhood') ? 'neighborhood' : 'city';
    const ok =
      kind === 'city'
        ? mayAutoApplyLocation(draft, 'city')
        : mayPrefillNeighborhood(draft);
    if (!ok) {
      entities = stripEntity(entities, key);
      fieldMeta = stripFieldMeta(fieldMeta, key);
      if (parsedIntent) {
        if (key === 'city') {
          const { city: _drop, ...rest } = parsedIntent;
          parsedIntent = rest as typeof parsedIntent;
        }
        if (key === 'neighborhoodSlug') {
          const { neighborhoodSlug: _drop, ...rest } = parsedIntent;
          parsedIntent = rest as typeof parsedIntent;
        }
        if (key === 'neighborhood' && parsedIntent.entities) {
          const ent = { ...parsedIntent.entities };
          delete ent.area;
          parsedIntent = { ...parsedIntent, entities: ent };
        }
      }
    }
  }

  // Ambiguous neighborhoods: never retain a single winner slug in draft.
  if (hoodCandidates >= 2) {
    for (const key of ['neighborhood', 'neighborhoodSlug'] as const) {
      entities = stripEntity(entities, key);
      fieldMeta = stripFieldMeta(fieldMeta, key);
    }
  }

  return {
    ...draft,
    entities: entities as NeedDraft['entities'],
    fieldMeta,
    parsedIntent: parsedIntent ?? draft.parsedIntent,
  };
}

/** Soft-fill min confidence aligned with neighborhood prefill chips. */
export const NEIGHBORHOOD_SOFT_FILL_MIN_CONFIDENCE = NEIGHBORHOOD_PREFILL_MIN_CONFIDENCE;
