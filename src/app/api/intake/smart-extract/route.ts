import { NextRequest, NextResponse } from 'next/server';
import { extractSmartFields } from '@/intake/smart-extractor/smart-field-extractor';
import { ExtractionCache } from '@/intake/smart-extractor/cache/extraction-cache';
import type { SmartExtractionOptions } from '@/intake/smart-extractor/types';
import {
  guardIntakePayloadSize,
  guardIntakePublicApi,
} from '@/lib/need-intake/intake-api-guard';
import { INTAKE_MIGRATION_FEATURE_FLAGS } from '@/intake/migration/feature-flags';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import type { SmartExtractionResult, SmartTransactionType } from '@/intake/smart-extractor/types';
import { recordToEntities } from '@/intake/entities/entityRecord';

export const runtime = 'nodejs';

const cache = new ExtractionCache();

/** Max JSON body size for public smart-extract (chars ≈ bytes for Persian). */
const MAX_BODY_CHARS = 12_000;
const MAX_NEED_CHARS = 5_000;
const MAX_DETAILS_CHARS = 5_000;

function transactionToSmartType(value: unknown): SmartTransactionType | null {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'BUY') return 'BUY';
  if (normalized === 'SELL') return 'SELL';
  if (normalized === 'FULL_DEPOSIT' || normalized.includes('RAHN_FULL')) return 'FULL_DEPOSIT';
  if (normalized === 'DEPOSIT_AND_RENT' || normalized.includes('RAHN_EJARE')) return 'DEPOSIT_AND_RENT';
  if (normalized === 'DAILY_RENT') return 'DAILY_RENT';
  if (normalized === 'HOURLY_RENT') return 'HOURLY_RENT';
  if (normalized === 'RENT' || normalized.includes('RENT')) return 'RENT';
  return null;
}

function canonicalToSmartResult(
  result: Awaited<ReturnType<typeof runIntakeIntelligence>>
): SmartExtractionResult {
  const entities = recordToEntities(result.draft.entities);
  const confidence = Object.fromEntries(
    Object.entries(result.trace.fieldMeta).map(([key, value]) => [key, value.confidence])
  ) as Record<string, number>;
  const parsed = result.parsedIntent;
  const categorySlug = entities.subcategorySlug || entities.categorySlug;
  const transaction = transactionToSmartType(entities.transactionType);
  return {
    category: {
      value: categorySlug,
      subcategory: entities.subcategorySlug,
      confidence: Number(confidence.categorySlug ?? confidence.category ?? 0),
      alternatives: result.categoryCandidates?.map((candidate) => ({
        slug: candidate.slug,
        label: candidate.label,
        confidence: candidate.confidence,
      })),
    },
    location: {
      city: entities.city,
      citySlug: entities.citySlug,
      neighborhood: entities.neighborhood,
      neighborhoodSlug: entities.neighborhoodSlug,
      confidence: Number(confidence.neighborhood ?? confidence.city ?? 0),
      disambiguationNeeded: parsed.locationAmbiguous,
      alternatives: parsed.neighborhoodCandidates?.map((candidate) => ({
        neighborhood: candidate.label,
        neighborhoodSlug: candidate.slug,
      })),
    },
    transaction: {
      type: transaction,
      dealType: transaction === 'BUY' || transaction === 'SELL' ? 'sale' : transaction ? 'rent' : undefined,
      confidence: Number(confidence.transactionType ?? 0),
    },
    budget: {
      min: entities.budgetMin,
      max: entities.budgetMax,
      confidence: Number(confidence.budgetMax ?? confidence.budget ?? 0),
    },
    property: {
      area: entities.area,
      rooms: entities.rooms,
      confidence: Number(confidence.area ?? 0),
    },
    metadata: {},
    validation: {
      isComplete: result.draft.completionState === 'READY_TO_PUBLISH',
      missingFields: result.missingFields.map((field) => field.field),
      warnings: result.validationWarnings?.map((warning) => warning.messageFa) ?? [],
      suggestions: result.recommendedQuestions,
    },
    trace: {
      rulesUsed: [],
      aiCalled: result.meta.aiInvoked,
      extractionTime: result.meta.latencyMs,
    },
  };
}

export async function POST(request: NextRequest) {
  const rateLimited = guardIntakePublicApi(request, 'smart-extract', 90);
  if (rateLimited) return rateLimited;
  const oversized = guardIntakePayloadSize(request, MAX_BODY_CHARS * 2);
  if (oversized) return oversized;

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_CHARS) {
      return NextResponse.json(
        { error: 'بدنه درخواست بیش از حد مجاز است.' },
        { status: 413 }
      );
    }

    const rawText = await request.text();
    if (rawText.length > MAX_BODY_CHARS) {
      return NextResponse.json(
        { error: 'بدنه درخواست بیش از حد مجاز است.' },
        { status: 413 }
      );
    }

    let body: {
      needText?: string;
      detailsText?: string;
      options?: SmartExtractionOptions;
    };
    try {
      body = JSON.parse(rawText) as typeof body;
    } catch {
      return NextResponse.json({ error: 'JSON نامعتبر' }, { status: 400 });
    }

    const needText =
      typeof body.needText === 'string' ? body.needText.slice(0, MAX_NEED_CHARS) : '';
    const detailsText =
      typeof body.detailsText === 'string'
        ? body.detailsText.slice(0, MAX_DETAILS_CHARS)
        : '';
    const options = body.options ?? {};

    if (!needText.trim() && !detailsText.trim()) {
      return NextResponse.json({ error: 'needText required' }, { status: 400 });
    }

    // Public default: rules-only. Caller must explicitly opt into AI.
    const useAI = options.useAI === true;

    const cacheKey = cache.generateKey(`${needText}\n${detailsText}`, {
      preferredCity: options.preferredCity,
      preferredCitySlug: options.preferredCitySlug,
      useAI,
      realTime: options.realTime,
    });
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true });
    }

    let result: SmartExtractionResult;
    if (INTAKE_MIGRATION_FEATURE_FLAGS.singleAnalyzer) {
      const canonical = await runIntakeIntelligence(
        {
          text: `${needText}\n${detailsText}`.trim(),
          citySlug: options.preferredCitySlug,
          cityName: options.preferredCity,
          formHints: options.formHints as never,
          forceAi: useAI,
        },
        { skipCache: false }
      );
      result = canonicalToSmartResult(canonical);
    } else {
      result = await extractSmartFields(needText, detailsText, {
        ...options,
        useAI,
        useRules: options.useRules !== false,
      });
    }

    cache.set(cacheKey, result);
    return NextResponse.json(
      { ...result, fromCache: false },
      { headers: { Deprecation: 'true', 'X-Intake-Canonical-Analyzer': 'analyze' } }
    );
  } catch (error) {
    console.error('Smart extraction failed:', error);
    return NextResponse.json({ error: 'Failed to extract fields' }, { status: 500 });
  }
}
