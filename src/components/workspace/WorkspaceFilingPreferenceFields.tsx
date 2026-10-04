'use client';

import { cn } from '@/lib/utils';
import type { WorkspaceFilingPreferences } from '@/lib/business/ecosystem/types';
import {
  WORKSPACE_DEAL_TYPE_OPTIONS,
  WORKSPACE_PROPERTY_KIND_OPTIONS,
} from '@/lib/business/workspace/filing-preferences';

function toggleValue<T extends string>(list: T[] | undefined, value: T): T[] {
  const current = list ?? [];
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

function PreferenceChips<T extends string>({
  label,
  hint,
  options,
  selected,
  onChange,
}: {
  label: string;
  hint: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  selected: T[] | undefined;
  onChange: (next: T[]) => void;
}) {
  const active = selected ?? [];
  const allSelected = active.length === 0;

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange([])}
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs transition-colors',
            allSelected
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
          )}
        >
          همه
        </button>
        {options.map((opt) => {
          const on = active.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(toggleValue(active, opt.value))}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                on
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WorkspaceFilingPreferenceFields({
  value,
  onChange,
}: {
  value: WorkspaceFilingPreferences;
  onChange: (next: WorkspaceFilingPreferences) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/15 p-3">
      <div>
        <p className="text-sm font-semibold">فیلتر فایلینگ</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          فقط فایل‌ها و همکاری‌هایی که با انتخاب شما هم‌خوان هستند در میزکار نمایش داده می‌شوند.
          فایل‌های پروفایل خودتان همیشه نمایش داده می‌شوند.
        </p>
      </div>

      <PreferenceChips
        label="نوع معامله"
        hint="مثلاً رهن و اجاره یا رهن کامل"
        options={WORKSPACE_DEAL_TYPE_OPTIONS}
        selected={value.dealTypes}
        onChange={(dealTypes) => onChange({ ...value, dealTypes })}
      />

      <PreferenceChips
        label="نوع ملک"
        hint="مثلاً آپارتمان یا ویلایی"
        options={WORKSPACE_PROPERTY_KIND_OPTIONS}
        selected={value.propertyKinds}
        onChange={(propertyKinds) => onChange({ ...value, propertyKinds })}
      />
    </div>
  );
}
