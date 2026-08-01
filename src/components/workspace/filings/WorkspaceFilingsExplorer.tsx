'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownAZ, LayoutGrid, Pencil, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toPersianDigits } from '@/lib/format/digits';
import type { WorkspaceFileItem, WorkspaceRegionalFeedMeta } from '../types';
import { FilingsExplorerFilterBar } from './FilingsExplorerFilterBar';
import { PropertyFilingListCard } from './PropertyFilingGridCard';
import { useFilingsExplorerFilters } from './useFilingsExplorerFilters';

export function WorkspaceFilingsExplorer({
  open,
  onOpenChange,
  items,
  feedMeta,
  businessCity,
  onEditAreas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: WorkspaceFileItem[];
  feedMeta: WorkspaceRegionalFeedMeta;
  businessCity?: string;
  onEditAreas?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const explorer = useFilingsExplorerFilters(items);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sheetOpen) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange, sheetOpen]);

  if (!open || !mounted) return null;

  const regionHint = feedMeta.regionLabel ?? businessCity ?? null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      <header className="shrink-0 border-b border-border/60 bg-gradient-to-l from-primary/5 via-background to-background px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 gap-y-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            aria-label="بستن فایلینگ"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </Button>

          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-4 shrink-0 text-primary" />
              <h1 className="text-base font-bold sm:text-lg">فایلینگ منطقه</h1>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              {regionHint ? `${regionHint} · ` : ''}
              {toPersianDigits(explorer.filtered.length)} از {toPersianDigits(items.length)} فایل
              {feedMeta.filingPreferencesSummary
                ? ` · ${feedMeta.filingPreferencesSummary}`
                : ''}
            </p>
          </div>

          <div className="relative w-full min-w-0 sm:w-auto sm:min-w-[12rem] sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 end-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={explorer.filters.q}
              onChange={(e) => explorer.patch({ q: e.target.value })}
              placeholder="جستجو"
              className="h-9 pe-9 text-sm"
              aria-label="جستجو در فایل‌ها"
            />
          </div>

          {onEditAreas ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 text-xs"
              onClick={onEditAreas}
            >
              <Pencil className="size-3.5 ml-1" />
              مناطق و ترجیحات
            </Button>
          ) : null}
        </div>
      </header>

      <FilingsExplorerFilterBar
        explorer={explorer}
        sheetOpen={sheetOpen}
        onSheetOpenChange={setSheetOpen}
      />

      <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {explorer.filtered.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 px-6 text-center">
            <ArrowDownAZ className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">فایلی با این فیلترها یافت نشد</p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              فیلترها را تغییر دهید یا از دکمه «مناطق و ترجیحات» محدوده و نوع فایلینگ را تنظیم
              کنید.
            </p>
            {explorer.hasActive ? (
              <Button type="button" variant="outline" size="sm" onClick={explorer.reset}>
                پاک کردن فیلترها
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-2.5">
            {explorer.filtered.map((item) => (
              <PropertyFilingListCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>,
    document.body
  );
}
