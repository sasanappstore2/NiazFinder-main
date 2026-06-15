import type { ParsedIntent } from '@/contracts/need-intake';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';

function coerceNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Align legacy budgetMin/budgetMax with dedicated rent fields for rent_rahn_ejare. */
export function syncRentBudgetOnEntityRecord(
  entityRecord: Record<string, unknown>,
  parsed: ParsedIntent
): void {
  const deal = String(entityRecord.dealType ?? parsed.entities?.dealType ?? '').trim();
  if (deal !== 'rent_rahn_ejare') return;

  const rahn =
    coerceNum(entityRecord.rahnAmount) ?? coerceNum(parsed.entities?.rahnAmount);
  const monthly =
    coerceNum(entityRecord.monthlyRent) ?? coerceNum(parsed.entities?.monthlyRent);
  if (rahn == null || monthly == null) return;

  entityRecord.rahnAmount = rahn;
  entityRecord.monthlyRent = monthly;
  entityRecord.budgetMin = rahn;
  entityRecord.budgetMax = monthly;
}

/** Merge seeded answers from parsed intent (wizard form fields). */
export function mergeSeededAnswersFromParsed(
  parsed: ParsedIntent,
  existing: Record<string, unknown> = {},
  leadPhone?: string | null
): Record<string, unknown> {
  const seeded = seedAnswersFromParsed(parsed, leadPhone);
  const merged: Record<string, unknown> = { ...seeded, ...existing };

  const deal = String(merged.dealType ?? parsed.entities?.dealType ?? '').trim();
  if (deal === 'rent_rahn_ejare') {
    const rahn = coerceNum(merged.rahnAmount ?? parsed.entities?.rahnAmount);
    const monthly = coerceNum(merged.monthlyRent ?? parsed.entities?.monthlyRent);
    if (rahn != null && monthly != null) {
      merged.rahnAmount = rahn;
      merged.monthlyRent = monthly;
      merged.budgetMin = rahn;
      merged.budgetMax = monthly;
      delete merged.budget;
    }
  }

  return merged;
}
