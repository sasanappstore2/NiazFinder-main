import type { IntakeFieldBag, IntakeFieldKey } from '@/intake/intelligence-engine/types';
import { clampConfidence } from '@/intake/scoring/confidenceEngine';

const REQUIRED_REAL_ESTATE: IntakeFieldKey[] = [
  'categorySlug',
  'transactionType',
  'city',
];

export function mergeFieldBags(...partials: Partial<IntakeFieldBag>[]): IntakeFieldBag {
  const base = {} as IntakeFieldBag;
  for (const p of partials) {
    for (const [k, v] of Object.entries(p)) {
      if (!v) continue;
      const key = k as IntakeFieldKey;
      const prev = base[key];
      if (prev?.lockedByUser) continue;
      if (!prev || (v.confidence ?? 0) >= (prev.confidence ?? 0)) {
        base[key] = v as IntakeFieldBag[IntakeFieldKey];
      }
    }
  }
  return base as IntakeFieldBag;
}

export function scoreFieldConfidence(bag: IntakeFieldBag): IntakeFieldBag {
  for (const key of Object.keys(bag) as IntakeFieldKey[]) {
    const f = bag[key];
    if (!f) continue;
    f.confidence = clampConfidence(f.confidence ?? 0);
  }
  return bag;
}

export function overallFieldConfidence(bag: IntakeFieldBag): number {
  const vals = Object.values(bag)
    .map((f) => f.confidence)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  if (!vals.length) return 0;
  return clampConfidence(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function fieldsNeedingAi(
  bag: IntakeFieldBag,
  opts?: { threshold?: number; vertical?: string | null }
): string[] {
  const threshold = opts?.threshold ?? 0.6;
  const needed: string[] = [];
  const isRe = opts?.vertical === 'real-estate' || bag.vertical?.value === 'real-estate';

  if (isRe) {
    for (const key of REQUIRED_REAL_ESTATE) {
      const f = bag[key];
      if (!f?.value || (f.confidence ?? 0) < threshold) needed.push(key);
    }
    const deal = bag.dealType?.value ?? bag.transactionType?.value;
    if (!deal) needed.push('transactionType');
  }

  const hood = bag.neighborhoodSlug;
  if (bag.neighborhood?.value && (!hood?.value || (hood.confidence ?? 0) < threshold)) {
    needed.push('neighborhoodSlug');
  }

  return [...new Set(needed)];
}

export function applyAiPatchToFieldBag(
  bag: IntakeFieldBag,
  patch: Record<string, unknown>,
  opts?: { fieldConfidence?: Record<string, number>; baseConfidence?: number }
): IntakeFieldBag {
  const map: Record<string, IntakeFieldKey> = {
    category: 'categorySlug',
    categorySlug: 'categorySlug',
    city: 'city',
    citySlug: 'citySlug',
    neighborhood: 'neighborhood',
    neighborhoodSlug: 'neighborhoodSlug',
    transactionType: 'transactionType',
    area: 'area',
    budget: 'budgetMax',
    budgetMax: 'budgetMax',
    budgetMin: 'budgetMin',
    rooms: 'rooms',
    rahnAmount: 'rahnAmount',
    monthlyRent: 'monthlyRent',
    deposit: 'deposit',
  };

  const base = opts?.baseConfidence ?? 0.72;
  const perField = opts?.fieldConfidence ?? {};

  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') continue;
    const fieldKey = map[k] ?? (k as IntakeFieldKey);
    const prev = bag[fieldKey];
    if (prev?.lockedByUser) continue;
    if (prev?.value != null && (prev.confidence ?? 0) >= 0.85) continue;
    const conf = clampConfidence(
      typeof perField[k] === 'number'
        ? perField[k]!
        : typeof perField[fieldKey] === 'number'
          ? perField[fieldKey]!
          : base
    );
    bag[fieldKey] = {
      value: v as never,
      confidence: conf,
      source: 'ai',
      evidence: `ai:${k}`,
    };
  }
  return bag;
}
