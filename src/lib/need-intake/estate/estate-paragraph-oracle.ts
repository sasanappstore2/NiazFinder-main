/**
 * Tiered oracle for estate-paragraph-1000 corpus.
 */
import type { EstateParagraphCase, EstateParagraphOracle } from '@/lib/need-intake/estate/estate-paragraph-types';

export type FailureTaxonomy =
  | 'category_miss'
  | 'deal_miss'
  | 'area_miss'
  | 'rooms_miss'
  | 'location_miss'
  | 'budget_miss'
  | 'hallucination'
  | 'missing_question'
  | 'soft_other';

export interface AnalyzeProjection {
  categorySlug: string | null;
  subcategorySlug: string | null;
  city: string | null;
  neighborhood: string | null;
  area: number | null;
  rooms: number | null;
  transactionType: string | null;
  dealType: string | null;
  budgetMax: number | null;
  rahnAmount: number | null;
  monthlyRent: number | null;
  deposit: number | null;
  recommendedQuestions: string[];
  gaps: Array<{ kind?: string; fieldKey?: string; messageFa?: string }>;
  answers: Record<string, unknown>;
}

export interface OracleFieldResult {
  field: string;
  tier: 'hard' | 'weighted' | 'soft';
  passed: boolean;
  detail?: string;
}

export interface OracleCaseResult {
  id: string;
  mode: 'rules' | 'hybrid';
  passedHard: boolean;
  hardScore: number;
  hardMax: number;
  weightedScore: number;
  weightedMax: number;
  fields: OracleFieldResult[];
  taxonomy: FailureTaxonomy[];
}

const DEAL_ALIASES: Record<string, string[]> = {
  buy: ['BUY', 'buy', 'SELL', 'sell', 'خرید', 'فروش'],
  rent_monthly: ['RENT', 'rent', 'rent_monthly', 'اجاره'],
  rent_rahn_full: ['FULL_DEPOSIT', 'rent_rahn_full', 'رهن کامل', 'DEPOSIT'],
  rent_rahn_ejare: ['DEPOSIT_AND_RENT', 'rent_rahn_ejare', 'رهن و اجاره', 'RENT'],
  rent_short_term: ['DAILY_RENT', 'rent_short_term', 'اجاره روزانه', 'اجاره کوتاه'],
  partnership: ['partnership', 'مشارکت'],
  pre_sale: ['pre_sale', 'پیش\u200cفروش', 'پیشفروش', 'buy', 'BUY'],
  agency: ['agency', 'agency-services', 'SERVICE', 'service', 'مشاور'],
};

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

function leafHit(got: string | null, expect: string[]): boolean {
  const g = norm(got);
  if (!g) return false;
  const expanded = new Set(expect);
  for (const e of expect) {
    // Near-leaf aliases that share the same property kind / service intent.
    if (e === 'villa-short-rent') expanded.add('villa-rent');
    if (e === 'suite-apartment-rent') expanded.add('apartment-rent');
    if (e === 'workspace-short-rent') expanded.add('office-rent');
    if (e === 'pre-sale-services') expanded.add('apartment-sale');
    if (e === 'industrial-sale') expanded.add('industrial-rent');
    if (e === 'industrial-rent') expanded.add('industrial-sale');
    // Do not alias land-sale ↔ land-rent — deal family must stay distinct.
  }
  if ([...expanded].some((e) => g === norm(e))) return true;
  // Accept parent→leaf only when got is a known estate parent of expected leaf.
  const parents: Record<string, string[]> = {
    'residential-sale': ['apartment-sale', 'villa-sale', 'land-sale'],
    'residential-rent': ['apartment-rent', 'villa-rent', 'land-rent'],
    'commercial-sale': ['office-sale', 'shop-sale', 'industrial-sale'],
    'commercial-rent': ['office-rent', 'shop-rent', 'industrial-rent'],
    'short-term-rent': ['suite-apartment-rent', 'villa-short-rent', 'workspace-short-rent'],
    'real-estate-services': ['agency-services', 'construction-partnership', 'pre-sale-services'],
  };
  const children = parents[g];
  if (children && expect.some((e) => children.includes(e))) return true;
  return [...expanded].some((e) => g.endsWith(norm(e)) || norm(e).endsWith(g));
}

function dealHit(gotTx: string | null, gotDeal: string | null, expect: string): boolean {
  // Brokerage / agency intent has no property transaction type.
  if (expect === 'agency') return true;
  // Partnership / pre-sale are service deals — trust dealType when tx is absent or sale-ish noise.
  if (expect === 'partnership' || expect === 'pre_sale') {
    const d = norm(gotDeal);
    if (d && (DEAL_ALIASES[expect] ?? [expect]).some((a) => d.includes(norm(a)) || norm(a) === d)) {
      return true;
    }
  }
  const aliases = DEAL_ALIASES[expect] ?? [expect];
  // Prefer transactionType when present — ignore conflicting dealType leftovers.
  const candidates =
    gotTx != null && String(gotTx).trim() !== ''
      ? [gotTx]
      : [gotDeal, String(gotDeal ?? '')];
  return candidates.some((c) => {
    const n = String(c ?? '');
    return aliases.some((a) => n.includes(a) || norm(n) === norm(a));
  });
}

function nearNumber(actual: number | null, expected: number, tol = 0.15): boolean {
  if (actual == null || !Number.isFinite(actual)) return false;
  const delta = Math.abs(actual - expected);
  return delta <= Math.max(1, expected * tol);
}

function hasQuestionSignal(proj: AnalyzeProjection, oracle: EstateParagraphOracle): boolean {
  if (proj.recommendedQuestions.length > 0) return true;
  if (proj.gaps.some((g) => g.kind === 'missing' || g.kind === 'uncertain' || g.kind === 'clarify')) {
    return true;
  }
  if (oracle.ambiguous && (!proj.city || !proj.subcategorySlug)) return true;
  return false;
}

function inventedMoney(proj: AnalyzeProjection, oracle: EstateParagraphOracle): boolean {
  if (!oracle.hallucinationTrap) return false;
  const money = [proj.budgetMax, proj.rahnAmount, proj.monthlyRent, proj.deposit].filter(
    (n) => n != null && Number(n) > 0
  );
  // Trap texts intentionally omit money — any invented amount is a fail.
  return money.length > 0 && !oracle.budget?.max && !oracle.budget?.rahn && !oracle.budget?.rent;
}

export function scoreEstateParagraphCase(
  cse: EstateParagraphCase,
  proj: AnalyzeProjection,
  mode: 'rules' | 'hybrid'
): OracleCaseResult {
  const oracle = cse.oracle;
  const fields: OracleFieldResult[] = [];
  const taxonomy: FailureTaxonomy[] = [];

  const leaf =
    proj.subcategorySlug || proj.categorySlug || String(proj.answers.categorySlug ?? '') || null;

  if (oracle.hard.includes('category')) {
    const ok = leafHit(leaf, oracle.leaf);
    fields.push({
      field: 'category',
      tier: 'hard',
      passed: ok,
      detail: ok ? undefined : `expected ${oracle.leaf.join('|')}, got ${leaf}`,
    });
    if (!ok) taxonomy.push('category_miss');
  }

  if (oracle.hard.includes('deal')) {
    const ok = dealHit(proj.transactionType, proj.dealType ?? String(proj.answers.dealType ?? ''), oracle.deal);
    fields.push({
      field: 'deal',
      tier: 'hard',
      passed: ok,
      detail: ok
        ? undefined
        : `expected ${oracle.deal}, got tx=${proj.transactionType} deal=${proj.dealType}`,
    });
    if (!ok) taxonomy.push('deal_miss');
  }

  if (oracle.hard.includes('area') && oracle.area?.exact != null) {
    const ok = nearNumber(proj.area, oracle.area.exact);
    fields.push({
      field: 'area',
      tier: 'hard',
      passed: ok,
      detail: ok ? undefined : `expected ~${oracle.area.exact}, got ${proj.area}`,
    });
    if (!ok) taxonomy.push('area_miss');
  }

  if (oracle.hard.includes('rooms') && oracle.rooms != null) {
    const ok = proj.rooms === oracle.rooms;
    fields.push({
      field: 'rooms',
      tier: 'hard',
      passed: ok,
      detail: ok ? undefined : `expected ${oracle.rooms}, got ${proj.rooms}`,
    });
    if (!ok) taxonomy.push('rooms_miss');
  }

  if (oracle.weighted.includes('location') && oracle.city) {
    const ok = norm(proj.city).includes(norm(oracle.city)) || norm(oracle.city).includes(norm(proj.city));
    fields.push({
      field: 'location',
      tier: 'weighted',
      passed: ok,
      detail: ok ? undefined : `expected city ${oracle.city}, got ${proj.city}`,
    });
    if (!ok) taxonomy.push('location_miss');
  }

  if (oracle.weighted.includes('budget')) {
    let ok = true;
    if (oracle.budget?.max) ok = nearNumber(proj.budgetMax, oracle.budget.max, 0.25);
    else if (oracle.budget?.rahn) ok = nearNumber(proj.rahnAmount ?? proj.deposit, oracle.budget.rahn, 0.25);
    else if (oracle.budget?.rent) ok = nearNumber(proj.monthlyRent, oracle.budget.rent, 0.25);
    fields.push({
      field: 'budget',
      tier: 'weighted',
      passed: ok,
      detail: ok ? undefined : 'budget mismatch',
    });
    if (!ok) taxonomy.push('budget_miss');
  }

  if (oracle.hallucinationTrap && inventedMoney(proj, oracle)) {
    fields.push({
      field: 'hallucination',
      tier: 'hard',
      passed: false,
      detail: 'invented money on hallucination trap',
    });
    taxonomy.push('hallucination');
  }

  if (oracle.expectQuestion) {
    const ok = hasQuestionSignal(proj, oracle);
    fields.push({
      field: 'expectQuestion',
      tier: 'soft',
      passed: ok,
      detail: ok ? undefined : 'expected clarification question',
    });
    if (!ok) taxonomy.push('missing_question');
  }

  const hardFields = fields.filter((f) => f.tier === 'hard');
  const weightedFields = fields.filter((f) => f.tier === 'weighted');
  const hardScore = hardFields.filter((f) => f.passed).length;
  const weightedScore = weightedFields.filter((f) => f.passed).length;

  return {
    id: cse.id,
    mode,
    passedHard: hardFields.every((f) => f.passed),
    hardScore,
    hardMax: hardFields.length,
    weightedScore,
    weightedMax: weightedFields.length,
    fields,
    taxonomy: Array.from(new Set(taxonomy)),
  };
}
