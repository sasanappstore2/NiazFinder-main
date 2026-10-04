'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface IntakeSectionDef {
  key: string;
  label: string;
  fields: readonly string[];
}

interface IntakeSectionMenusProps {
  sections: readonly IntakeSectionDef[];
  enabledKeys: Set<string>;
  onEnabledKeysChange: (keys: Set<string>) => void;
  isSectionFilled: (section: IntakeSectionDef) => boolean;
  renderSectionFields: (section: IntakeSectionDef) => React.ReactNode;
  /** Sections that cannot be removed (category, location, …). */
  mandatoryKeys?: ReadonlySet<string>;
  /** Sections containing useful matching fields; these remain optional. */
  criticalKeys?: ReadonlySet<string>;
  className?: string;
}

export function IntakeSectionMenus({
  sections,
  enabledKeys,
  onEnabledKeysChange,
  isSectionFilled,
  renderSectionFields,
  mandatoryKeys,
  criticalKeys,
  className,
}: IntakeSectionMenusProps) {
  const mandatory = mandatoryKeys ?? new Set<string>();
  const critical = criticalKeys ?? new Set<string>();

  const availableToAdd = useMemo(
    () => sections.filter((s) => !mandatory.has(s.key) && !enabledKeys.has(s.key)),
    [sections, enabledKeys, mandatory]
  );

  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set([...enabledKeys].filter((key) => mandatory.has(key)))
  );

  const enableSection = (key: string) => {
    const next = new Set(enabledKeys);
    next.add(key);
    onEnabledKeysChange(next);
    setOpenKeys((prev) => new Set(prev).add(key));
  };

  const disableSection = (key: string) => {
    const next = new Set(enabledKeys);
    next.delete(key);
    onEnabledKeysChange(next);
  };

  const enabledSections = useMemo(() => {
    const mandatoryList = sections.filter((s) => enabledKeys.has(s.key) && mandatory.has(s.key));
    const optionalList = sections.filter((s) => enabledKeys.has(s.key) && !mandatory.has(s.key));
    return [...mandatoryList, ...optionalList];
  }, [sections, enabledKeys, mandatory]);

  useEffect(() => {
    setOpenKeys((prev) => {
      const next = new Set([...prev].filter((key) => enabledKeys.has(key)));
      for (const key of mandatory) {
        if (enabledKeys.has(key)) next.add(key);
      }
      if (next.size === prev.size && [...next].every((key) => prev.has(key))) return prev;
      return next;
    });
  }, [enabledKeys, mandatory]);

  return (
    <div className={cn('intake-section-menus flex flex-col gap-3', className)}>
      {enabledSections.length === 0 && availableToAdd.length > 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          با زدن + می‌توانید فیلدهای اضافی نیاز را اضافه و تکمیل کنید.
        </p>
      ) : null}

      <div className="intake-section-menus__list flex flex-col gap-2">
        {enabledSections.map((section) => {
          const filled = isSectionFilled(section);
          const isMandatory = mandatory.has(section.key);
          const isCritical = critical.has(section.key);
          return (
            <details
              key={section.key}
              open={openKeys.has(section.key)}
              onToggle={(e) => {
                const isOpen = e.currentTarget.open;
                setOpenKeys((prev) => {
                  const next = new Set(prev);
                  if (isOpen) next.add(section.key);
                  else next.delete(section.key);
                  return next;
                });
              }}
              className="group rounded-xl border border-border/70 bg-background/50"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  <span className="truncate">{section.label}</span>
                  {isMandatory ? (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      ضروری
                    </span>
                  ) : isCritical && !filled ? (
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                      مهم برای تطبیق
                    </span>
                  ) : filled ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600">
                      تکمیل شده
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      اختیاری
                    </span>
                  )}
                </span>
                {!isMandatory ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`بستن ${section.label}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      disableSection(section.key);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                ) : (
                  <span className="size-8 shrink-0" aria-hidden />
                )}
              </summary>
              <div className="border-t border-border/60 px-3 pb-3 pt-2">
                {renderSectionFields(section)}
              </div>
            </details>
          );
        })}
      </div>

      {availableToAdd.length > 0 ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">افزودن اطلاعات (اختیاری)</label>
          <div className="flex flex-wrap gap-2">
            {availableToAdd.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => enableSection(section.key)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  'border-dashed border-border bg-card hover:border-primary hover:bg-primary/5'
                )}
                aria-label={`افزودن ${section.label}`}
              >
                <Plus className="size-4 shrink-0 text-primary" aria-hidden />
                {section.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
