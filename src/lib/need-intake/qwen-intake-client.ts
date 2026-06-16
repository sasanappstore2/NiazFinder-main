/**
 * Unified client for intake-mlx (Qwen3.5-2B) — parse + title + health.
 * Re-exports parse helpers from llm-parse-client for backward compatibility.
 */
import type { ListingTitleContext } from '@/lib/need-intake/listing-title-prompt';
import type { ListingCopyContext } from '@/lib/need-intake/listing-copy-prompt';
import {
  buildListingCopySystemPrompt,
  buildListingCopyUserPrompt,
} from '@/lib/need-intake/listing-copy-prompt';
import {
  checkIntakeMlxHealth,
  getNeedIntakeLlmBaseUrl,
  isNeedIntakeLlmEnabled,
  parseIntentViaLlm,
  type LlmParseResult,
} from '@/lib/need-intake/llm-parse-client';
import {
  generateListingCopyViaLocalChat,
  generateTitleViaLocalChat,
} from '@/lib/need-intake/local-copy-bridge';
import {
  isAcceptableListingTitle,
  parseTitleFromModelOutput,
  rejectListingTitleReason,
} from '@/lib/need-intake/listing-title-sanitize';

export {
  getNeedIntakeLlmBaseUrl,
  isNeedIntakeLlmEnabled,
  type LlmParseResult,
};

export async function parseIntentViaQwen(text: string): Promise<LlmParseResult | null> {
  return parseIntentViaLlm(text);
}

export async function checkQwenIntakeHealth(): Promise<{
  ok: boolean;
  modelId?: string;
  loadError?: string | null;
}> {
  return checkIntakeMlxHealth();
}

export interface QwenTitleResult {
  title: string;
  raw: string;
}

export interface QwenListingCopyResult {
  title: string;
  description: string;
  raw: string;
}

function mlxTitlePayload(context: ListingTitleContext) {
  return {
    templateId: context.templateId,
    rootSlug: context.rootSlug,
    intentType: context.intentType,
    categorySlug: context.categorySlug,
    categoryPathFa: context.categoryPathFa,
    city: context.city,
    neighborhood: context.neighborhood,
    dealTypeFa: context.dealTypeFa,
    propertyKind: context.propertyKind,
    rooms: context.rooms,
    areaMin: context.areaMin,
    areaMax: context.areaMax,
    productName: context.productName,
    serviceType: context.serviceType,
    jobTitle: context.jobTitle,
    budgetHint: context.budgetHint,
    vehicleSubject: context.vehicleSubject,
    vehicleCondition: context.vehicleCondition,
    brand: context.brand,
    model: context.model,
    sourceSummary: context.sourceSummary,
    rawTextExcerpt: context.rawTextExcerpt,
    structuredFieldLines: context.structuredFieldLines,
    baselineTitle: context.baselineTitle,
  };
}

export async function generateListingCopyViaQwen(
  context: ListingCopyContext
): Promise<QwenListingCopyResult | null> {
  if (!isNeedIntakeLlmEnabled()) return null;

  const timeoutMs = Number(process.env.NEED_INTAKE_LLM_TIMEOUT_MS ?? 20_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getNeedIntakeLlmBaseUrl()}/v1/listing-copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: buildListingCopySystemPrompt(),
        userPrompt: buildListingCopyUserPrompt(context),
        context: {
          categoryPathFa: context.categoryPathFa,
          propertyKind: context.propertyKind,
          city: context.city,
          neighborhood: context.neighborhood,
          baselineTitle: context.baselineTitle,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn('intake-mlx listing-copy failed:', res.status, await res.text().catch(() => ''));
      return generateListingCopyViaLocalChat(context);
    }

    const data = (await res.json()) as { title?: string; description?: string; raw?: string };
    const title = data.title?.trim();
    const description = data.description?.trim();
    if (!title && !description) return null;

    return {
      title: title ?? '',
      description: description ?? '',
      raw: data.raw ?? '',
    };
  } catch (err) {
    console.warn('intake-mlx listing-copy unreachable:', err);
    return generateListingCopyViaLocalChat(context);
  } finally {
    clearTimeout(timer);
  }
}

export async function generateTitleViaQwen(
  context: ListingTitleContext,
  options?: { fallbackTitle?: string; sourceText?: string }
): Promise<QwenTitleResult | null> {
  if (!isNeedIntakeLlmEnabled()) return null;

  const timeoutMs = Number(process.env.NEED_INTAKE_LLM_TIMEOUT_MS ?? 12_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getNeedIntakeLlmBaseUrl()}/v1/title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: mlxTitlePayload(context),
        fallbackTitle: options?.fallbackTitle,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn('intake-mlx title failed:', res.status, await res.text().catch(() => ''));
      return generateTitleViaLocalChat(context, options);
    }

    const data = (await res.json()) as { title?: string; raw?: string };
    const rawTitle = data.title?.trim();
    if (!rawTitle) return null;

    const title = parseTitleFromModelOutput(rawTitle);
    const qualityCtx = { sourceText: options?.sourceText ?? context.sourceSummary };
    if (!isAcceptableListingTitle(title, qualityCtx)) {
      const reason = rejectListingTitleReason(title, qualityCtx);
      console.warn('intake-mlx title rejected:', reason, title);
      return null;
    }

    return { title, raw: data.raw ?? rawTitle };
  } catch (err) {
    console.warn('intake-mlx title unreachable:', err);
    return generateTitleViaLocalChat(context, options);
  } finally {
    clearTimeout(timer);
  }
}
