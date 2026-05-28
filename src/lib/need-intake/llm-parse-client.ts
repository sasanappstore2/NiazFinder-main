import type { ParsedIntent } from '@/contracts/need-intake';
import type { DatasetLabels } from '@/lib/need-intake/dataset/schema';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { INTENT_REGISTRY } from '@/config/need-intents';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { CANONICAL_CITIES } from '@/config/locations';

const ALLOWED_INTENT_TYPES = new Set(Object.keys(INTENT_REGISTRY));
const ALLOWED_CATEGORY_SlUGS = new Set(CANONICAL_CATEGORIES.map((c) => c.slug));

function normalizeCity(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const v = input.trim();
  if (!v) return undefined;

  // Accept exact canonical Persian title.
  const byTitle = CANONICAL_CITIES.find((c) => c.title === v);
  if (byTitle) return byTitle.title;

  const lower = v.toLowerCase();
  const bySlugOrEnglish = CANONICAL_CITIES.find(
    (c) => c.slug.toLowerCase() === lower || c.englishTitle.toLowerCase() === lower
  );
  if (bySlugOrEnglish) return bySlugOrEnglish.title;

  return undefined;
}

function mapUrgency(input: unknown): DatasetLabels['urgency'] | undefined {
  if (typeof input !== 'string') return undefined;
  const v = input.trim().toLowerCase();
  if (v === 'low') return 'LOW';
  if (v === 'normal' || v === 'medium') return 'NORMAL';
  if (v === 'high') return 'HIGH';
  if (v === 'urgent') return 'URGENT';
  if (v === 'low' || v === 'normal') return v.toUpperCase() as DatasetLabels['urgency'];
  return undefined;
}

function mapIntentType(raw: unknown): DatasetLabels['intentType'] | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();

  if (ALLOWED_INTENT_TYPES.has(v)) return v as DatasetLabels['intentType'];

  // Common base-model outputs → our taxonomy (only for safe fallback)
  if (v === 'purchase' || v === 'buy') return 'product_search';
  if (v === 'sell' || v === 'sale') return 'product_listing';
  if (v === 'service') return 'service_request';
  if (v === 'help') return 'help_request';
  if (v === 'job') return 'job_search';
  return null;
}

function mapCategorySlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (ALLOWED_CATEGORY_SlUGS.has(v)) return v;

  // Base model common categories → our canonical slugs
  if (v.toLowerCase() === 'gaming' || v.toLowerCase() === 'games') return 'game-console';
  if (v.toLowerCase() === 'console' || v.toLowerCase() === 'playstation') return 'game-console';
  if (v.toLowerCase() === 'electronics') return 'electronics';
  if (v.toLowerCase() === 'mobile') return 'mobile-phone';
  return null;
}

function coerceEntities(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(o)) {
      if (val == null) continue;
      out[k] = typeof val === 'string' ? val : JSON.stringify(val);
    }
    return out;
  }
  // Array form (e.g. [{name,type,confidence}])
  if (Array.isArray(raw)) {
    const out: Record<string, string> = {};
    for (const item of raw as Array<any>) {
      if (!item) continue;
      const name = typeof item.name === 'string' ? item.name : undefined;
      const type = typeof item.type === 'string' ? item.type : undefined;
      if (name && type) out[type] = name;
      else if (name) out['item'] = name;
    }
    return out;
  }
  return {};
}

export function isNeedIntakeLlmEnabled(): boolean {
  return process.env.NEED_INTAKE_LLM_ENABLED === 'true';
}

export function getNeedIntakeLlmBaseUrl(): string {
  return (process.env.NEED_INTAKE_LLM_URL ?? 'http://127.0.0.1:8100').replace(/\/$/, '');
}

function labelsToParsedIntent(text: string, labels: DatasetLabels): ParsedIntent {
  return enrichParsedIntent({
    intentType: labels.intentType,
    categorySlug: labels.categorySlug,
    subcategorySlug: labels.subcategorySlug,
    city: labels.city,
    province: labels.province,
    budgetMin: labels.budgetMin,
    budgetMax: labels.budgetMax,
    urgency: labels.urgency ?? 'NORMAL',
    neighborhoodSlug: labels.neighborhoodSlug,
    confidence: 0.72,
    entities: labels.entities ?? {},
    rawText: text.trim(),
  });
}

export interface LlmParseResult {
  parsed: ParsedIntent;
  raw: string;
}

/**
 * Call local intake-mlx microservice. Returns null on failure (caller uses rules).
 */
export async function parseIntentViaLlm(text: string): Promise<LlmParseResult | null> {
  if (!isNeedIntakeLlmEnabled()) return null;

  const timeoutMs = Number(process.env.NEED_INTAKE_LLM_TIMEOUT_MS ?? 8000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getNeedIntakeLlmBaseUrl()}/v1/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn('intake-mlx parse failed:', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = (await res.json()) as { labels?: any; raw?: string };

    const rawLabels = data.labels;
    if (!rawLabels) {
      return null;
    }

    const intentType = mapIntentType(rawLabels.intentType);
    const categorySlug = mapCategorySlug(rawLabels.categorySlug);
    if (!intentType || !categorySlug) return null;

    const city = normalizeCity(rawLabels.city);
    const urgency = mapUrgency(rawLabels.urgency);

    const parsedLabels: DatasetLabels = {
      intentType,
      categorySlug,
      subcategorySlug:
        typeof rawLabels.subcategorySlug === 'string'
          ? (rawLabels.subcategorySlug.trim() as string)
          : undefined,
      entities: coerceEntities(rawLabels.entities),
      city,
      budgetMin:
        typeof rawLabels.budgetMin === 'number' ? rawLabels.budgetMin : undefined,
      budgetMax:
        typeof rawLabels.budgetMax === 'number' ? rawLabels.budgetMax : undefined,
      urgency,
      neighborhoodSlug:
        typeof rawLabels.neighborhoodSlug === 'string'
          ? rawLabels.neighborhoodSlug.trim()
          : undefined,
    };

    return { parsed: labelsToParsedIntent(text, parsedLabels), raw: data.raw ?? '' };
  } catch (err) {
    console.warn('intake-mlx unreachable:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkIntakeMlxHealth(): Promise<{
  ok: boolean;
  modelId?: string;
  loadError?: string | null;
}> {
  try {
    const res = await fetch(`${getNeedIntakeLlmBaseUrl()}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as {
      ok?: boolean;
      modelId?: string;
      loadError?: string | null;
    };
    return { ok: Boolean(data.ok), modelId: data.modelId, loadError: data.loadError };
  } catch {
    return { ok: false };
  }
}
