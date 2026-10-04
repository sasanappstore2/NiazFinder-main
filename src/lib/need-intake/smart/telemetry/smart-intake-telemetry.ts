'use client';

/**
 * Smart Intake telemetry (Claude backlog #3).
 * No PII: lengths/flags only, never raw need text.
 */

import { trackAnalyticsEvent } from '@/lib/analytics/track';
import type { SmartExtractionResult } from '@/intake/smart-extractor/types';

export function trackSmartExtractionRequest(params: {
  textLength: number;
  modelId?: string;
}) {
  trackAnalyticsEvent('smart_intake:extraction_requested', {
    category: 'smart_intake',
    textLength: params.textLength,
    modelId: params.modelId || 'rules',
    timestamp: Date.now(),
  });
}

export function trackSmartExtractionResponse(params: {
  result: SmartExtractionResult | null;
  latencyMs: number;
  error?: string;
}) {
  trackAnalyticsEvent('smart_intake:extraction_completed', {
    category: 'smart_intake',
    success: !!params.result && !params.error,
    latencyMs: params.latencyMs,
    hasCategory: !!params.result?.category?.value,
    hasLocation: !!(params.result?.location?.city || params.result?.location?.neighborhood),
    hasAmbiguity: params.result?.location?.disambiguationNeeded === true,
    alternativesCount: params.result?.location?.alternatives?.length || 0,
    hasTransaction: !!params.result?.transaction?.type,
    error: params.error ? '1' : undefined,
    timestamp: Date.now(),
  });
}

export function trackDisambiguationShown(params: {
  alternativesCount: number;
  city?: string;
}) {
  trackAnalyticsEvent('smart_intake:disambiguation_shown', {
    category: 'smart_intake',
    alternativesCount: params.alternativesCount,
    city: params.city,
    timestamp: Date.now(),
  });
}

export function trackDisambiguationApplied(params: {
  selectedOption: string;
  optionIndex: number;
  totalOptions: number;
}) {
  trackAnalyticsEvent('smart_intake:disambiguation_applied', {
    category: 'smart_intake',
    selectedOption: params.selectedOption.slice(0, 40),
    optionIndex: params.optionIndex,
    totalOptions: params.totalOptions,
    timestamp: Date.now(),
  });
}

export function trackSmartTitleShown(params: {
  hasTitle: boolean;
  hasDescription: boolean;
}) {
  trackAnalyticsEvent('smart_intake:smart_title_shown', {
    category: 'smart_intake',
    hasTitle: params.hasTitle,
    hasDescription: params.hasDescription,
    timestamp: Date.now(),
  });
}

export function trackSmartTitleApplied(params: {
  field: 'title' | 'description';
  generatedLength: number;
}) {
  trackAnalyticsEvent('smart_intake:smart_title_applied', {
    category: 'smart_intake',
    field: params.field,
    generatedLength: params.generatedLength,
    timestamp: Date.now(),
  });
}

export function trackSmartIntakeUsage(params: {
  featuresUsed: Array<'extraction' | 'disambiguation' | 'title_gen'>;
  needId?: string;
}) {
  trackAnalyticsEvent('smart_intake:features_used', {
    category: 'smart_intake',
    featuresUsed: params.featuresUsed,
    featuresCount: params.featuresUsed.length,
    needId: params.needId,
    timestamp: Date.now(),
  });
}
