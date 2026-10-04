'use client';

import { Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  PostNaturalAnalyzeResponse,
  PostNaturalField,
} from '@/lib/need-intake/laya/post-natural-contract';

const FIELD_LABELS: Record<string, string> = {
  categorySlug: 'دسته‌بندی',
  city: 'شهر',
  neighborhood: 'محله',
  area: 'متراژ',
  areaRange: 'بازهٔ متراژ',
  rooms: 'تعداد خواب',
  dealType: 'نوع معامله',
  propertyKind: 'نوع ملک',
  deedType: 'نوع سند',
  budgetMin: 'حداقل بودجه',
  budgetMax: 'حداکثر بودجه',
  rahnAmount: 'رهن / ودیعه',
  deposit: 'ودیعه',
  monthlyRent: 'اجارهٔ ماهانه',
  parking: 'پارکینگ',
  elevator: 'آسانسور',
  storage: 'انباری',
  usageType: 'کاربری',
};

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('، ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '');
}

export interface PostNaturalAnalysisCardProps {
  result: PostNaturalAnalyzeResponse | null;
  analyzing: boolean;
  error: string | null;
  onConfirmField: (field: PostNaturalField) => void;
  onConfirmCategory: (slug: string) => void;
  className?: string;
}

export function PostNaturalAnalysisCard({
  result,
  analyzing,
  error,
  onConfirmField,
  onConfirmCategory,
  className,
}: PostNaturalAnalysisCardProps) {
  if (!analyzing && !result && !error) return null;

  const proposals =
    result?.fields.filter(
      (field) =>
        field.requiresConfirmation &&
        !(field.key === 'neighborhood' && result.locationCandidates.length > 0) &&
        !(field.key === 'categorySlug' && result.provisionalCategory?.requiresConfirmation)
    ) ?? [];
  const layaNeighborhoodProposal = result?.fields.find(
    (field) =>
      field.key === 'neighborhood' &&
      field.source === 'laya' &&
      field.requiresConfirmation &&
      result.locationCandidates.some((candidate) => candidate.label === field.value)
  );
  const applied = result?.fields.filter((field) => !field.requiresConfirmation) ?? [];
  // Multi-city matches: identical neighborhood names in different cities are
  // indistinguishable without the city suffix (e.g. «نیاوران (تهران)»).
  const candidateCities = new Set(
    (result?.locationCandidates ?? []).map((candidate) => candidate.city?.trim()).filter(Boolean)
  );
  const multiCityCandidates = candidateCities.size > 1;

  return (
    <section
      className={cn(
        'mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm',
        className
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium text-foreground">
          {analyzing ? <Loader2 className="size-4 animate-spin text-emerald-400" /> : <Sparkles className="size-4 text-emerald-400" />}
          <span>{analyzing ? 'در حال تکمیل فرم از روی متن…' : 'نتیجهٔ تکمیل هوشمند فرم'}</span>
        </div>
        {result ? (
          <span className="text-[11px] text-muted-foreground">
            {result.laya.status === 'ready' ? 'تصمیم‌گیری محلی Laya' : 'حالت دستی / قوانین'}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-200">
          {error} فرم معمولی همچنان قابل استفاده است.
        </p>
      ) : null}

      {result ? (
        <>
          {applied.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {applied.map((field, index) => (
                <span
                  key={`${field.key}-${index}-${displayValue(field.value)}`}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-100"
                >
                  <Check className="size-3" />
                  {FIELD_LABELS[field.key] ?? field.key}: {displayValue(field.value)}
                </span>
              ))}
            </div>
          ) : null}

          {result.provisionalCategory?.requiresConfirmation ? (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5">
              <p className="text-xs text-amber-100">این دسته‌بندی پیشنهادی است؛ برای اعمال آن تأیید کنید.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => onConfirmCategory(result.provisionalCategory!.slug)}
              >
                تأیید دسته‌بندی {result.provisionalCategory.slug}
              </Button>
            </div>
          ) : null}

          {proposals.length ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">این موارد نیاز به تأیید شما دارند:</p>
              {proposals.map((field, index) => (
                <div
                  key={`${field.key}-${index}-${displayValue(field.value)}-proposal`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/30 px-2.5 py-2"
                >
                  <span className="text-xs">
                    {FIELD_LABELS[field.key] ?? field.key}: {displayValue(field.value)}
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => onConfirmField(field)}>
                    تأیید
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {result.categoryCandidates.length > 1 && !result.provisionalCategory ? (
            <div className="mt-3">
              <p className="mb-2 text-xs text-muted-foreground">دسته‌بندی‌های نزدیک را انتخاب کنید:</p>
              <div className="flex flex-wrap gap-2">
                {result.categoryCandidates.map((candidate) => (
                  <Button
                    key={candidate.slug}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onConfirmCategory(candidate.slug)}
                  >
                    {candidate.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {result.locationCandidates.length > 0 ? (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5">
              <p className="mb-2 text-xs text-muted-foreground">
                یک یا چند محلهٔ نزدیک پیدا شد؛ اگر گزینهٔ درست را می‌بینید انتخابش کنید:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.locationCandidates.map((candidate) => (
                  <Button
                    key={`${candidate.city ?? ''}:${candidate.slug}`}
                    type="button"
                    size="sm"
                    variant={layaNeighborhoodProposal?.value === candidate.label ? 'default' : 'outline'}
                    className="gap-1.5"
                    onClick={() => onConfirmField(
                      layaNeighborhoodProposal?.value === candidate.label
                        ? layaNeighborhoodProposal
                        : {
                            key: 'neighborhood',
                            value: candidate.label,
                            source: 'deterministic-parser',
                            requiresConfirmation: true,
                            evidence: `محله در شهر ${candidate.city ?? 'انتخاب‌شده'}`,
                            ...(candidate.city ? { city: candidate.city } : null),
                            ...(candidate.slug ? { slug: candidate.slug } : null),
                          }
                    )}
                  >
                    {candidate.label}
                    {multiCityCandidates && candidate.city ? ` (${candidate.city})` : null}
                    {layaNeighborhoodProposal?.value === candidate.label ? (
                      <span className="text-[10px] opacity-80">پیشنهاد Laya</span>
                    ) : null}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {result.warnings.length ? (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {result.warnings.slice(0, 4).map((warning) => <li key={warning}>• {warning}</li>)}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
