'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Tag, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/format/digits';
import type { NeedDraft } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { getIntentDefinition } from '@/config/need-intents';
import { formatMoneyToman } from '@/lib/format/money';
import {
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
} from '@/config/need-schemas/labels';
import type { V2MissingField } from '@/lib/intake-v2/v2-readiness';
import { formatIntelligenceRows } from '@/lib/intake-v2/intelligence-display';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';

interface ExtractedSlotsPanelProps {
  needDraft: NeedDraft;
  readinessScore: number;
  readyToPreview: boolean;
  extractedSummary: string;
  missingFields?: V2MissingField[];
  inferredFields?: string[];
  confirmedCount?: number;
  requiredCount?: number;
  activeFieldKey?: string | null;
  activeFieldLabel?: string | null;
  className?: string;
  variant?: 'mobile' | 'desktop' | 'both';
}

function SlotRow({
  icon,
  label,
  value,
  inferred,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  inferred?: boolean;
}) {
  if (!value?.trim()) return null;
  return (
    <div
      className={cn(
        'flex items-start gap-2 text-sm rounded-lg px-2 py-1.5',
        inferred && 'border border-dashed border-muted-foreground/40 bg-muted/30'
      )}
    >
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          {inferred ? (
            <Badge variant="outline" className="h-4 px-1 text-[9px]">
              حدس AI
            </Badge>
          ) : null}
        </div>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}

function IntelligenceSections({ profile }: { profile?: NeedDraft['intelligenceProfile'] }) {
  const rows = formatIntelligenceRows(profile);
  if (!rows.length) return null;

  const sections: Array<{ id: 'core' | 'decision' | 'smart'; title: string }> = [
    { id: 'core', title: 'اطلاعات اصلی' },
    { id: 'decision', title: 'تصمیم‌گیری' },
    { id: 'smart', title: 'ترجیحات هوشمند' },
  ];

  return (
    <>
      {sections.map(({ id, title }) => {
        const sectionRows = rows.filter((r) => r.section === id);
        if (!sectionRows.length) return null;
        return (
          <div key={id} className="border-t pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
            <ul className="space-y-1.5">
              {sectionRows.map((row) => (
                <li key={`${id}-${row.label}`} className="text-xs text-foreground/90">
                  <span className="text-muted-foreground">{row.label}: </span>
                  {row.value}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

export function ExtractedSlotsPanel({
  needDraft,
  readinessScore,
  readyToPreview,
  extractedSummary,
  missingFields = [],
  inferredFields = [],
  confirmedCount = 0,
  requiredCount = 0,
  activeFieldKey = null,
  activeFieldLabel = null,
  className,
  variant = 'both',
}: ExtractedSlotsPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { parsedIntent, answers } = needDraft;
  const inferredSet = new Set(inferredFields);
  const categoryTitle =
    getCategoryPath(parsedIntent.categorySlug).slice(-1)[0]?.title ?? '';
  const intentLabel = getIntentDefinition(parsedIntent.intentType).labelFa;
  const dealType = answers.dealType ?? parsedIntent.entities?.dealType;
  const dealLabel = dealType ? PROPERTY_DEAL_LABELS[String(dealType)] ?? String(dealType) : null;
  const kind = answers.propertyKind ?? parsedIntent.entities?.propertyKind;
  const kindLabel = kind ? PROPERTY_KIND_LABELS[String(kind)] ?? String(kind) : null;
  const city =
    (answers.location ? String(answers.location) : '') ||
    (parsedIntent.entities?.area && parsedIntent.city
      ? `${parsedIntent.entities.area}، ${parsedIntent.city}`
      : '') ||
    parsedIntent.city ||
    null;
  const budget =
    answers.budget != null
      ? formatMoneyToman(Number(answers.budget))
      : parsedIntent.budgetMax
        ? formatMoneyToman(parsedIntent.budgetMax)
        : null;

  const pct = Math.round(readinessScore * 100);
  const publishCheck = validateNeedDraftForPublish(needDraft);
  const intelligence = needDraft.intelligenceProfile;
  const progressLabel =
    requiredCount > 0
      ? `${toPersianDigits(String(confirmedCount))} از ${toPersianDigits(String(requiredCount))} فیلد`
      : `${toPersianDigits(String(pct))}٪`;

  const panelBody = (
    <>
      <div className="space-y-2">
        {categoryTitle ? (
          <p className="text-xs font-medium text-foreground">{categoryTitle}</p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">پیشرفت ثبت</span>
          <span className="text-xs font-medium tabular-nums">{progressLabel}</span>
        </div>
        <Progress value={pct} className="h-1.5" />
        {readyToPreview ? (
          <Badge variant="secondary" className="text-xs">
            آماده پیش‌نمایش
          </Badge>
        ) : null}
      </div>

      <div className="space-y-2 border-t pt-3">
        <SlotRow icon={<Tag className="size-3.5" />} label="نوع نیاز" value={intentLabel} />
        <SlotRow
          icon={<Tag className="size-3.5" />}
          label="معامله"
          value={dealLabel}
          inferred={inferredSet.has('dealType')}
        />
        <SlotRow
          icon={<Tag className="size-3.5" />}
          label="نوع ملک"
          value={kindLabel}
          inferred={inferredSet.has('propertyKind')}
        />
        <SlotRow
          icon={<MapPin className="size-3.5" />}
          label="مکان"
          value={city}
          inferred={inferredSet.has('location')}
        />
        <SlotRow
          icon={<Wallet className="size-3.5" />}
          label="بودجه"
          value={budget ? `${budget} تومان` : null}
          inferred={inferredSet.has('budget')}
        />
      </div>

      {missingFields.length > 0 ? (
        <div className="border-t pt-3">
          <p className="mb-2 text-xs text-muted-foreground">باقی‌مانده</p>
          <ul className="space-y-1">
            {missingFields.map((f) => (
              <li
                key={f.key}
                className={cn(
                  'text-xs',
                  f.key === activeFieldKey
                    ? 'font-medium text-primary'
                    : 'text-amber-700 dark:text-amber-400'
                )}
              >
                • {f.label}
                {f.key === activeFieldKey && activeFieldLabel ? ' ← الان' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!publishCheck.success ? (
        <div className="border-t pt-3">
          <p className="mb-2 text-xs text-muted-foreground">قبل از انتشار</p>
          <ul className="space-y-1">
            {publishCheck.errors.map((e) => (
              <li key={e.field} className="text-xs text-destructive">
                • {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <IntelligenceSections profile={intelligence} />

      {extractedSummary ? (
        <div className="border-t pt-3">
          <p className="mb-1 text-xs text-muted-foreground">خلاصه</p>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
            {extractedSummary}
          </pre>
        </div>
      ) : null}
    </>
  );

  const showDesktop = variant === 'desktop' || variant === 'both';
  const showMobile = variant === 'mobile' || variant === 'both';

  return (
    <>
      {showDesktop ? (
        <aside
          className={cn(
            'hidden w-72 shrink-0 flex-col gap-4 border-s bg-muted/20 p-4 lg:flex',
            className
          )}
        >
          <h2 className="text-sm font-semibold">نیاز استخراج‌شده</h2>
          {panelBody}
        </aside>
      ) : null}

      {showMobile ? (
        <div className={cn('border-b bg-muted/20 lg:hidden', className)}>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span>
              نیاز استخراج‌شده ({progressLabel})
            </span>
            {mobileOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
          {mobileOpen ? <div className="space-y-4 px-4 pb-3">{panelBody}</div> : null}
        </div>
      ) : null}
    </>
  );
}
