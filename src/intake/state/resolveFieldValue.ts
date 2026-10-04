import type { FieldSchema } from '@/contracts/need-intake';
import type { IntakeEntities } from '@/intake/types';
import { extractVehicleSubjectFromText } from '@/lib/need-intake/vertical-title';

export function fieldVisible(
  field: FieldSchema,
  answers: Record<string, unknown>
): boolean {
  if (field.showIf) {
    const val = String(answers[field.showIf.field] ?? '');
    if (val !== field.showIf.equals) return false;
  }
  if (field.showIfIn) {
    const val = String(answers[field.showIfIn.field] ?? '');
    if (!field.showIfIn.values.includes(val)) return false;
  }
  return true;
}

export function buildShowIfContext(
  answers: Record<string, string | number | boolean | string[]>,
  transactionType?: string | null
): Record<string, unknown> {
  return {
    ...answers,
    dealType: String(answers.dealType ?? transactionType ?? ''),
  };
}

export function resolveFieldValue(
  field: FieldSchema,
  answers: Record<string, string | number | boolean | string[]>,
  entities: IntakeEntities | null,
  sourceText?: string,
  parsedBrand?: string
): string | number | boolean | string[] | undefined {
  const answer = answers[field.key];
  if (field.type === 'multi_select') {
    if (Array.isArray(answer)) return answer;
    if (typeof answer === 'string' && answer.trim()) {
      return answer
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [];
  }
  if (answer != null && answer !== '') return answer as string | number | boolean;

  if (!entities) return undefined;

  if (field.key === 'dealType' && entities.transactionType) {
    return entities.transactionType;
  }
  if (field.key === 'bedrooms' && entities.rooms != null) {
    return entities.rooms;
  }
  if (field.key === 'transactionType' && entities.transactionType) {
    return entities.transactionType;
  }
  if ((field.key === 'area' || field.key === 'areaMin') && entities.area != null) {
    return entities.area;
  }
  if (field.key === 'rooms' && entities.rooms != null) {
    return entities.rooms;
  }
  if (field.key === 'budget') {
    return entities.budgetMax ?? entities.budgetMin ?? undefined;
  }
  if (field.key === 'city') {
    return entities.city ?? undefined;
  }
  if (field.key === 'neighborhood') {
    return entities.neighborhood ?? undefined;
  }
  if (field.key === 'description') {
    const desc = answers.description;
    if (typeof desc === 'string') return desc;
  }
  if (field.key === 'rahnAmount') {
    const rahn = answers.rahnAmount ?? answers.deposit;
    if (rahn != null && rahn !== '') return rahn as string | number;
    const tx = String(entities.transactionType ?? answers.dealType ?? '');
    const isRentDeal =
      tx === 'FULL_DEPOSIT' ||
      tx === 'DEPOSIT_AND_RENT' ||
      tx === 'RENT' ||
      tx.includes('rahn') ||
      tx.includes('rent');
    if (
      isRentDeal &&
      entities.budgetMax != null &&
      entities.budgetMax >= 50_000_000
    ) {
      return entities.budgetMax;
    }
  }
  if (field.key === 'monthlyRent' && answers.monthlyRent != null && answers.monthlyRent !== '') {
    return answers.monthlyRent as string | number;
  }
  if (field.key === 'deposit') {
    const deposit = answers.deposit ?? answers.rahnAmount;
    if (deposit != null && deposit !== '') return deposit as string | number;
    const tx = String(entities.transactionType ?? answers.dealType ?? '');
    const isRentDeal =
      tx === 'FULL_DEPOSIT' ||
      tx === 'DEPOSIT_AND_RENT' ||
      tx === 'RENT' ||
      tx.includes('rahn') ||
      tx.includes('rent');
    if (
      isRentDeal &&
      entities.budgetMax != null &&
      entities.budgetMax >= 50_000_000
    ) {
      return entities.budgetMax;
    }
  }
  if (field.key === 'brand') {
    const brandAnswer = answers.brand;
    if (brandAnswer != null && brandAnswer !== '') return brandAnswer as string | number;
    if (parsedBrand?.trim()) return parsedBrand.trim();
    if (sourceText?.trim()) {
      const extracted = extractVehicleSubjectFromText(sourceText);
      if (extracted) return extracted;
    }
  }
  return undefined;
}
