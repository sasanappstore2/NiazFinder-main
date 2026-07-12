'use client';

import { useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { SuggestionChips } from '@/components/need-intake/SuggestionChips';
import type { NeedDraft } from '@/contracts/need-intake';
import type { SmartExtractionResult } from '@/intake/smart-extractor/types';
import {
  trackDisambiguationApplied,
  trackDisambiguationShown,
} from '@/lib/need-intake/smart/telemetry/smart-intake-telemetry';

export interface LocationAmbiguityOption {
  value: string;
  label: string;
}

export function hasLocationAmbiguity(parsed: NeedDraft['parsedIntent'] | undefined): boolean {
  if (!parsed) return false;
  if (parsed.locationAmbiguous) return true;
  if ((parsed.cityCandidates?.length ?? 0) >= 2) return true;
  if ((parsed.neighborhoodCandidates?.length ?? 0) >= 2 && !parsed.neighborhoodSlug) return true;
  return false;
}

export function buildLocationAmbiguityOptions(
  parsed: NeedDraft['parsedIntent'] | undefined
): LocationAmbiguityOption[] {
  if (!parsed || !hasLocationAmbiguity(parsed)) return [];
  const seen = new Set<string>();
  const options: LocationAmbiguityOption[] = [];

  const push = (value: string, label: string) => {
    const key = `${value}:${label}`;
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ value, label });
  };

  for (const city of [...(parsed.cityCandidates ?? [])].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  )) {
    push(`city:${city.cityId}`, city.label);
  }
  for (const hood of (parsed.neighborhoodCandidates ?? []).slice(0, 6)) {
    push(`neighborhood:${hood.slug}`, hood.label);
  }
  return options;
}

/** Build chips from Smart Extraction location alternatives (Claude UI wiring). */
export function buildSmartLocationOptions(
  result?: SmartExtractionResult | null
): LocationAmbiguityOption[] {
  const alts = result?.location?.alternatives;
  if (!alts?.length) return [];
  if (!result.location.disambiguationNeeded && alts.length < 2) return [];

  const seen = new Set<string>();
  const options: LocationAmbiguityOption[] = [];
  for (const alt of alts.slice(0, 8)) {
    const slug = alt.neighborhoodSlug || alt.neighborhood;
    const value = `neighborhood:${slug}`;
    const label = alt.district
      ? `${alt.neighborhood} — ${alt.district}`
      : alt.neighborhood;
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label });
  }
  return options.length >= 2 ? options : [];
}

export interface IntakeLocationAmbiguityPromptProps {
  needDraft: NeedDraft | null;
  /** Smart extraction result — neighborhood alternatives (Claude Step UI wiring). */
  smartResult?: SmartExtractionResult | null;
  onApplyCity: (cityName: string) => void;
  onApplyNeighborhood: (
    neighborhoodName: string,
    neighborhoodId?: string | null,
    opts?: { fromUser?: boolean }
  ) => void;
}

export function IntakeNeighborhoodDisambiguationChips({
  options,
  selectedValue,
  onSelect,
}: {
  options: LocationAmbiguityOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}) {
  if (options.length < 2) return null;

  return (
    <div className="space-y-1.5 min-w-0">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="size-3.5 shrink-0" aria-hidden />
        چند محلهٔ مشابه پیدا شد — یکی را انتخاب کنید:
      </p>
      <SuggestionChips
        options={options}
        value={selectedValue}
        onSelect={(v) => {
          const value = typeof v === 'string' ? v : (v[0] ?? '');
          if (value) onSelect(value);
        }}
        className="gap-1.5 [&_button]:min-h-9 [&_button]:rounded-md [&_button]:px-2.5 [&_button]:py-1 [&_button]:text-xs"
      />
    </div>
  );
}

/** Phase 33.4 — single ambiguity question for city / neighborhood (+ smart alternatives). */
export function IntakeLocationAmbiguityPrompt({
  needDraft,
  smartResult,
  onApplyCity,
  onApplyNeighborhood,
}: IntakeLocationAmbiguityPromptProps) {
  const parsed = needDraft?.parsedIntent;
  const legacyOptions = buildLocationAmbiguityOptions(parsed);
  const smartOptions = buildSmartLocationOptions(smartResult);

  const uniqueOptions = Array.from(
    new Map([...smartOptions, ...legacyOptions].map((o) => [o.value, o])).values()
  );

  useEffect(() => {
    if (smartOptions.length >= 2) {
      trackDisambiguationShown({
        alternativesCount: smartOptions.length,
        city: smartResult?.location?.city ?? undefined,
      });
    }
  }, [smartOptions.length, smartResult?.location?.city]);

  if (!uniqueOptions.length) return null;

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
        <MapPin className="size-3.5 shrink-0" aria-hidden />
        کدام شهر یا محله مدنظر شماست؟
      </p>
      <SuggestionChips
        options={uniqueOptions}
        onSelect={(v) => {
          const value = typeof v === 'string' ? v : (v[0] ?? '');
          if (value.startsWith('city:')) {
            onApplyCity(value.slice('city:'.length));
            return;
          }
          if (!value.startsWith('neighborhood:')) return;
          const slug = value.slice('neighborhood:'.length);

          const optionIndex = uniqueOptions.findIndex((o) => o.value === value);
          trackDisambiguationApplied({
            selectedOption: slug,
            optionIndex: optionIndex < 0 ? 0 : optionIndex,
            totalOptions: uniqueOptions.length,
          });

          const smartHit = smartResult?.location?.alternatives?.find(
            (a) => a.neighborhoodSlug === slug || a.neighborhood === slug
          );
          if (smartHit) {
            onApplyNeighborhood(smartHit.neighborhood, smartHit.neighborhoodSlug ?? slug, {
              fromUser: true,
            });
            return;
          }

          const hit = parsed?.neighborhoodCandidates?.find((n) => n.slug === slug);
          const label = (hit?.label ?? slug).trim();
          if (label) onApplyNeighborhood(label, slug, { fromUser: true });
        }}
      />
    </div>
  );
}
