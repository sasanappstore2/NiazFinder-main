import type { IntentType, ParsedIntent } from '@/contracts/need-intake';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';

export type DatasetSource = 'fixture' | 'manual' | 'captured';

/** Golden labels for training / eval (teacher output). */
export interface DatasetLabels {
  intentType: IntentType;
  categorySlug: string;
  subcategorySlug?: string;
  entities: Record<string, string>;
  city?: string;
  province?: string;
  budgetMin?: number;
  budgetMax?: number;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  neighborhoodSlug?: string;
}

export interface DatasetFixture {
  id: string;
  input: string;
  labels: DatasetLabels;
  meta?: {
    source?: DatasetSource;
    vertical?: ClassifierVertical;
    tags?: string[];
  };
  /** Eval expectations (subset of labels). */
  expectIntentPrefix?: string;
  expectCategoryIncludes?: string;
  expectDealType?: string;
  expectCity?: string;
  expectVertical?: ClassifierVertical;
  expectAreaMax?: string;
  expectAreaMin?: string;
  expectNeighborhoodIncludes?: string;
  minConfidence?: number;
}

export interface TrainingMessageRow {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

export const NEED_INTAKE_SYSTEM_PROMPT =
  'تو یک دستیار طبقه‌بندی نیاز فارسی هستی. از متن کاربر فقط یک JSON معتبر برگردان با فیلدهای: intentType, categorySlug, subcategorySlug (اختیاری), entities (dealType, propertyKind, rooms, areaMin, areaMax, pricePerMeterMin, deposit, monthlyRent, nightlyRent, guestCount, plotWidth, …), city, budgetMin, budgetMax, urgency. بدون توضیح اضافه.';

export function labelsFromParsedIntent(parsed: ParsedIntent): DatasetLabels {
  return {
    intentType: parsed.intentType,
    categorySlug: parsed.categorySlug,
    subcategorySlug: parsed.subcategorySlug,
    entities: { ...parsed.entities },
    city: parsed.city,
    budgetMin: parsed.budgetMin,
    budgetMax: parsed.budgetMax,
    urgency: parsed.urgency,
    neighborhoodSlug: parsed.neighborhoodSlug,
  };
}
