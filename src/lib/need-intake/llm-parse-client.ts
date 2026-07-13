import type { ParsedIntent } from '@/contracts/need-intake';
import type { DatasetLabels } from '@/lib/need-intake/dataset/schema';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { parseLabelsViaLocalChat } from '@/lib/need-intake/local-parse-bridge';
import { checkLocalModelHealth } from '@/lib/need-intake/local-chat-client';
import { INTENT_REGISTRY } from '@/config/need-intents';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { CANONICAL_CITIES, CANONICAL_PROVINCES } from '@/config/locations';

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

function normalizeProvince(input: unknown, city?: string): string | undefined {
  if (typeof input === 'string' && input.trim()) {
    const v = input.trim();
    const byTitle = CANONICAL_PROVINCES.find((p) => p.title === v);
    if (byTitle) return byTitle.title;
    const lower = v.toLowerCase();
    const bySlugOrEnglish = CANONICAL_PROVINCES.find(
      (p) => p.slug.toLowerCase() === lower || p.englishTitle.toLowerCase() === lower
    );
    if (bySlugOrEnglish) return bySlugOrEnglish.title;
  }
  // Fall back to the canonical city's province.
  if (city) {
    const canonicalCity = CANONICAL_CITIES.find((c) => c.title === city);
    if (canonicalCity) {
      const province = CANONICAL_PROVINCES.find((p) => p.slug === canonicalCity.provinceSlug);
      if (province) return province.title;
    }
  }
  return undefined;
}

function mapUrgency(input: unknown): DatasetLabels['urgency'] | undefined {
  if (typeof input !== 'string') return undefined;
  const v = input.trim().toLowerCase();
  if (v === 'low' || v === 'کم') return 'LOW';
  if (v === 'normal' || v === 'medium' || v === 'عادی' || v === 'معمولی') return 'NORMAL';
  if (v === 'high' || v === 'زیاد' || v === 'بالا') return 'HIGH';
  if (v === 'urgent' || v === 'فوری' || v === 'اضطراری') return 'URGENT';
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
  return (process.env.NEED_INTAKE_LLM_URL ?? 'http://127.0.0.1:1234').replace(/\/$/, '');
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
 * Call local model API. Tries legacy /v1/parse then OpenAI-compatible /v1/chat/completions.
 */
export async function parseIntentViaLlm(text: string): Promise<LlmParseResult | null> {
  if (!isNeedIntakeLlmEnabled()) return null;

  const mlxResult = await parseIntentViaLegacyMlx(text);
  if (mlxResult) return mlxResult;

  const chatResult = await parseLabelsViaLocalChat(text);
  if (!chatResult?.labels.categorySlug || !chatResult.labels.intentType) {
    return null;
  }

  const intentType = mapIntentType(chatResult.labels.intentType);
  const categorySlug = mapCategorySlug(chatResult.labels.categorySlug);
  if (!intentType || !categorySlug) return null;

  const city = normalizeCity(chatResult.labels.city);
  const parsedLabels: DatasetLabels = {
    intentType,
    categorySlug,
    subcategorySlug: chatResult.labels.subcategorySlug,
    entities: chatResult.labels.entities ?? {},
    city,
    province: normalizeProvince(chatResult.labels.province, city),
    budgetMin: chatResult.labels.budgetMin,
    budgetMax: chatResult.labels.budgetMax,
    urgency: chatResult.labels.urgency,
    neighborhoodSlug: chatResult.labels.neighborhoodSlug,
  };

  return {
    parsed: labelsToParsedIntent(text, parsedLabels),
    raw: chatResult.raw,
  };
}

async function parseIntentViaLegacyMlx(text: string): Promise<LlmParseResult | null> {
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
      province: normalizeProvince(rawLabels.province, city),
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
  const legacy = await checkLegacyMlxHealth();
  if (legacy.ok) return legacy;
  const local = await checkLocalModelHealth();
  return {
    ok: local.ok,
    modelId: local.modelId,
    loadError: local.loadError,
  };
}

async function checkLegacyMlxHealth(): Promise<{
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
