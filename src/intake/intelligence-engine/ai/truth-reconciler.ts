import type { IntakeFieldBag, IntakeFieldKey } from '@/intake/intelligence-engine/types';
import { setField, isTransactionType } from '@/intake/intelligence-engine/types';
import type { TruthVerdict } from '@/intake/intelligence-engine/ai/truth-verifier-schema';

const NUMERIC_FIELDS = new Set<IntakeFieldKey>([
  'area',
  'rooms',
  'rahnAmount',
  'monthlyRent',
  'deposit',
  'budgetMax',
  'budgetMin',
  'floorMin',
  'yearMin',
]);

const MIN_OVERRIDE_CONFIDENCE = 0.65;

function coerceValue(key: IntakeFieldKey, raw: unknown): unknown {
  if (raw == null || raw === '') return null;
  if (NUMERIC_FIELDS.has(key)) {
    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  if (key === 'transactionType' && typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    return isTransactionType(upper) ? upper : raw.trim();
  }
  return typeof raw === 'string' ? raw.trim() : raw;
}

function valuesEqual(key: IntakeFieldKey, a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (NUMERIC_FIELDS.has(key)) {
    return Number(a) === Number(b);
  }
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export interface TruthReconcileResult {
  bag: IntakeFieldBag;
  corrected: string[];
  confirmed: string[];
  skipped: string[];
}

/** Apply AI truth verdicts ? override intake when incorrect/missing and confident enough. */
export function applyTruthVerdicts(
  bag: IntakeFieldBag,
  verdicts: TruthVerdict[],
  opts?: { categoryLockedByUser?: boolean }
): TruthReconcileResult {
  const corrected: string[] = [];
  const confirmed: string[] = [];
  const skipped: string[] = [];

  for (const v of verdicts) {
    const key = v.field as IntakeFieldKey;
    if (!(key in bag)) {
      skipped.push(v.field);
      continue;
    }

    const prev = bag[key];
    if (prev?.lockedByUser) {
      skipped.push(key);
      continue;
    }
    if (opts?.categoryLockedByUser && (key === 'categorySlug' || key === 'subcategorySlug')) {
      skipped.push(key);
      continue;
    }

    const aiConf = v.confidence ?? 0.7;

    if (v.status === 'correct') {
      if (prev?.value != null) {
        bag[key] = {
          ...prev,
          confidence: Math.min(0.98, Math.max(prev.confidence ?? 0, aiConf)),
          evidence: prev.evidence ? `${prev.evidence};truth:confirmed` : 'truth:confirmed',
        };
      }
      confirmed.push(key);
      continue;
    }

    if (v.status !== 'incorrect' && v.status !== 'missing') {
      skipped.push(key);
      continue;
    }

    if (aiConf < MIN_OVERRIDE_CONFIDENCE) {
      skipped.push(key);
      continue;
    }

    const coerced = coerceValue(key, v.value);
    if (coerced == null || coerced === '') {
      skipped.push(key);
      continue;
    }

    if (prev?.value != null && valuesEqual(key, prev.value, coerced)) {
      confirmed.push(key);
      continue;
    }

    setField(bag, key, {
      value: coerced as never,
      confidence: aiConf,
      source: 'ai',
      evidence: `truth:${v.status}${v.reasonFa ? `:${v.reasonFa.slice(0, 40)}` : ''}`,
    });
    corrected.push(key);
  }

  return { bag, corrected, confirmed, skipped };
}
