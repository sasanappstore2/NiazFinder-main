'use client';

import { MapPin } from 'lucide-react';
import { SuggestionChips } from '@/components/need-intake/SuggestionChips';
import type { NeedDraft } from '@/contracts/need-intake';

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

export interface IntakeLocationAmbiguityPromptProps {
  needDraft: NeedDraft | null;
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

/** Phase 33.4 — single ambiguity question for city / neighborhood. */
export function IntakeLocationAmbiguityPrompt({
  needDraft,
  onApplyCity,
  onApplyNeighborhood,
}: IntakeLocationAmbiguityPromptProps) {
  const parsed = needDraft?.parsedIntent;
  const options = buildLocationAmbiguityOptions(parsed);
  if (!options.length) return null;

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
        <MapPin className="size-3.5 shrink-0" aria-hidden />
        کدام شهر یا محله مدنظر شماست؟
      </p>
      <SuggestionChips
        options={options}
        onSelect={(v) => {
          const value = typeof v === 'string' ? v : v[0] ?? '';
          if (value.startsWith('city:')) {
            onApplyCity(value.slice('city:'.length));
            return;
          }
          if (!value.startsWith('neighborhood:')) return;
          const slug = value.slice('neighborhood:'.length);
          const hit = parsed?.neighborhoodCandidates?.find((n) => n.slug === slug);
          const label = (hit?.label ?? slug).trim();
          if (label) onApplyNeighborhood(label, slug, { fromUser: true });
        }}
      />
    </div>
  );
}
