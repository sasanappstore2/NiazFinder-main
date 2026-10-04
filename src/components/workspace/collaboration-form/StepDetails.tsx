'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AREA_BAND_LABELS,
  BUDGET_BAND_LABELS,
  DEAL_TYPE_OPTIONS,
  isRentDealType,
  PROPERTY_KIND_LABELS,
  RENT_BUDGET_BANDS,
  SALE_BUDGET_BANDS,
  type CollaborationDealType,
} from '@/lib/business/workspace/collaboration-posts';
import type {
  CollaborationAreaBand,
  CollaborationBudgetBand,
  CollaborationPropertyKind,
} from '@prisma/client';

function Chip<T extends string>({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
        selected
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'border-border/60 text-muted-foreground hover:bg-muted/50'
      )}
    >
      {label}
    </button>
  );
}

export function StepDetails({
  dealType,
  propertyKind,
  areaBand,
  budgetBand,
  onDealTypeChange,
  onPropertyKindChange,
  onAreaBandChange,
  onBudgetBandChange,
}: {
  dealType: CollaborationDealType;
  propertyKind: CollaborationPropertyKind;
  areaBand: CollaborationAreaBand | null;
  budgetBand: CollaborationBudgetBand | null;
  onDealTypeChange: (v: CollaborationDealType) => void;
  onPropertyKindChange: (v: CollaborationPropertyKind) => void;
  onAreaBandChange: (v: CollaborationAreaBand | null) => void;
  onBudgetBandChange: (v: CollaborationBudgetBand | null) => void;
}) {
  const [optionalOpen, setOptionalOpen] = useState(false);
  const rent = isRentDealType(dealType);
  const budgetBands = rent ? RENT_BUDGET_BANDS : SALE_BUDGET_BANDS;

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-muted-foreground">نوع معامله</legend>
        <div className="flex flex-wrap gap-1.5">
          {DEAL_TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={dealType === opt.value}
              onClick={() => onDealTypeChange(opt.value)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-muted-foreground">نوع ملک</legend>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {(Object.keys(PROPERTY_KIND_LABELS) as CollaborationPropertyKind[]).map((k) => (
            <Chip
              key={k}
              label={PROPERTY_KIND_LABELS[k]}
              selected={propertyKind === k}
              onClick={() => onPropertyKindChange(k)}
            />
          ))}
        </div>
      </fieldset>

      <div className="rounded-xl border border-border/50">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium text-muted-foreground"
          onClick={() => setOptionalOpen((o) => !o)}
          aria-expanded={optionalOpen}
        >
          جزئیات اختیاری (متراژ و بودجه)
          <ChevronDown className={cn('size-4 transition-transform', optionalOpen && 'rotate-180')} />
        </button>

        {optionalOpen ? (
          <div className="space-y-3 border-t border-border/50 px-3 pb-3 pt-2">
            <fieldset className="space-y-2">
              <legend className="text-[11px] text-muted-foreground">متراژ</legend>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  label="مهم نیست"
                  selected={areaBand === null}
                  onClick={() => onAreaBandChange(null)}
                />
                {(Object.keys(AREA_BAND_LABELS) as CollaborationAreaBand[]).map((k) => (
                  <Chip
                    key={k}
                    label={AREA_BAND_LABELS[k]}
                    selected={areaBand === k}
                    onClick={() => onAreaBandChange(k)}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-[11px] text-muted-foreground">
                {rent ? 'اجاره / رهن' : 'بودجه'}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  label="مهم نیست"
                  selected={budgetBand === null}
                  onClick={() => onBudgetBandChange(null)}
                />
                {budgetBands.map((k) => (
                  <Chip
                    key={k}
                    label={BUDGET_BAND_LABELS[k]}
                    selected={budgetBand === k}
                    onClick={() => onBudgetBandChange(k)}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}
      </div>
    </div>
  );
}
