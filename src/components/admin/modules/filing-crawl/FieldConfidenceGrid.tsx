'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FilingFieldKey } from '@/lib/filing-scrapers/crawl-blueprint';
import {
  CONFIDENCE_THRESHOLD_REQUIRED,
  type FieldGuess,
} from '@/lib/filing-scrapers/portal-families/types';
import { cn } from '@/lib/utils';

const FIELD_LABELS: Record<string, string> = {
  title: 'عنوان',
  fileCode: 'کد فایل',
  dealType: 'نوع معامله',
  propertyKind: 'نوع ملک',
  neighborhood: 'محله',
  location: 'آدرس',
  deposit: 'رهن',
  monthlyRent: 'اجاره',
  price: 'قیمت',
  area: 'متراژ',
  rooms: 'اتاق',
  floor: 'طبقه',
};

function levelClass(level: FieldGuess['level'], confidence: number): string {
  if (confidence >= CONFIDENCE_THRESHOLD_REQUIRED || level === 'high') {
    return 'border-emerald-400/50 bg-emerald-50/40 dark:bg-emerald-950/20';
  }
  if (level === 'medium') return 'border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20';
  return 'border-red-400/50 bg-red-50/40 dark:bg-red-950/20';
}

export function FieldConfidenceGrid({
  guesses,
  onFixField,
  activeFixField,
}: {
  guesses: FieldGuess[];
  onFixField: (field: FilingFieldKey) => void;
  activeFixField?: string | null;
}) {
  if (!guesses.length) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
        هنوز فیلدی شناسایی نشده — ابتدا «اسکن خودکار صفحه» را بزنید.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {guesses.map((g) => {
        const needsFix = g.confidence < CONFIDENCE_THRESHOLD_REQUIRED && !g.manuallyFixed;
        const ext = g.extractor;
        const extractorHint = ext?.selector
          ? `sel: ${ext.selector.slice(0, 40)}`
          : ext?.regex
            ? `regex: ${ext.regex.slice(0, 36)}…`
            : '—';

        return (
          <div
            key={g.key}
            className={cn(
              'flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 text-xs',
              levelClass(g.level, g.confidence)
            )}
          >
            <span className="w-20 shrink-0 font-medium">{FIELD_LABELS[g.key] ?? g.key}</span>
            <span className="min-w-0 flex-1 truncate text-foreground/90">{g.value ?? '—'}</span>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {Math.round(g.confidence * 100)}%
            </Badge>
            <span className="hidden w-full font-mono text-[10px] text-muted-foreground sm:block" dir="ltr">
              {extractorHint}
            </span>
            {needsFix ? (
              <Button
                type="button"
                size="sm"
                variant={activeFixField === g.key ? 'default' : 'outline'}
                className="h-7 text-[11px]"
                onClick={() => onFixField(g.key)}
              >
                {activeFixField === g.key ? 'لغو' : 'اصلاح'}
              </Button>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                OK
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function discoveryGateOk(guesses: FieldGuess[]): { ok: boolean; missing: string[] } {
  const critical = ['fileCode', 'dealType', 'neighborhood'] as const;
  const missing: string[] = [];
  for (const key of critical) {
    const g = guesses.find((x) => x.key === key);
    if (!g || g.confidence < CONFIDENCE_THRESHOLD_REQUIRED) {
      if (!g?.manuallyFixed) missing.push(FIELD_LABELS[key] ?? key);
    }
  }
  const hasPrice = guesses.some(
    (g) => (g.key === 'deposit' || g.key === 'price') && g.confidence >= CONFIDENCE_THRESHOLD_REQUIRED
  );
  if (!hasPrice) missing.push('رهن یا قیمت');
  return { ok: missing.length === 0, missing };
}
