import type { IntentType } from '@/contracts/need-intake';
import type { TrainingMessageRow } from '@/lib/need-intake/dataset/schema';
import { NEED_INTAKE_SYSTEM_PROMPT } from '@/lib/need-intake/dataset/schema';

export interface MlxExportPayload {
  intentType: IntentType;
  categorySlug: string;
  subcategorySlug?: string | null;
  city?: string | null;
  neighborhoodSlug?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null;
  entities: Record<string, string>;
  confidence: number;
}

function buildParseUserPrompt(text: string): string {
  return `Extract from this Persian need text:

"""
${text}
"""

Return JSON:
{
  "intentType": string,
  "categorySlug": string,
  "subcategorySlug": string | null,
  "city": Persian city name | null,
  "neighborhoodSlug": latin slug | null,
  "budgetMin": number | null,
  "budgetMax": number | null,
  "urgency": "LOW"|"NORMAL"|"HIGH"|"URGENT" | null,
  "entities": { "key": "value" },
  "confidence": 0-1
}`;
}

export function entitiesToMlxPayload(entities: Record<string, unknown>): MlxExportPayload {
  const strEntities: Record<string, string> = {};
  for (const [k, v] of Object.entries(entities)) {
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      strEntities[k] = String(v);
    }
  }

  const intentType = (strEntities.intentType ?? 'service_request') as IntentType;

  return {
    intentType,
    categorySlug: strEntities.categorySlug ?? strEntities.category ?? 'general',
    subcategorySlug: strEntities.subcategorySlug ?? null,
    city: strEntities.city ?? null,
    neighborhoodSlug: strEntities.neighborhoodSlug ?? null,
    budgetMin: entities.budgetMin != null ? Number(entities.budgetMin) : null,
    budgetMax: entities.budgetMax != null ? Number(entities.budgetMax) : null,
    urgency: (strEntities.urgency as MlxExportPayload['urgency']) ?? null,
    entities: strEntities,
    confidence: 0.95,
  };
}

export function toMlxTrainingRow(sourceText: string, entities: Record<string, unknown>): TrainingMessageRow {
  const payload = entitiesToMlxPayload(entities);
  return {
    messages: [
      { role: 'system', content: NEED_INTAKE_SYSTEM_PROMPT },
      { role: 'user', content: buildParseUserPrompt(sourceText) },
      { role: 'assistant', content: JSON.stringify(payload) },
    ],
  };
}

export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function splitTrainVal<T>(rows: T[], valRatio = 0.1, seed = 42): { train: T[]; val: T[] } {
  const rng = mulberry32(seed);
  const val: T[] = [];
  const train: T[] = [];
  for (const row of rows) {
    if (rng() < valRatio) val.push(row);
    else train.push(row);
  }
  return { train, val };
}
