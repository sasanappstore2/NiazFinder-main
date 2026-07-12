'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toPersianDigits } from '@/lib/format/digits';
import type { FilingBrowseFilters } from '@/lib/filing/apply-filing-filters';
import {
  FILING_BROWSE_SHEET_FILTER_RESET,
  FILING_POSTER_KIND_OPTIONS,
} from '@/lib/filing/apply-filing-filters';
import type { FilingCategoryValue, FilingKindValue } from '@/lib/filing/filing-categories';
import { FilingCategoryBar } from './FilingCategoryBar';
import { FilingFilterFieldGrid } from './FilingFilterFieldGrid';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilingBrowseFilters;
  onPatch: (patch: Partial<FilingBrowseFilters>) => void;
  sheetOnlyCount?: number;
};

export function FilingBrowseFilterSheet({
  open,
  onOpenChange,
  filters,
  onPatch,
  sheetOnlyCount = 0,
}: Props) {
  const clearCount = sheetOnlyCount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="filing-filter-sheet max-h-[88vh] rounded-t-2xl sheet-safe-area-lg" dir="rtl">
        <div className="mx-auto -mb-2 mt-1 h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <SheetHeader className="pb-0">
          <SheetTitle>فیلترهای فایلینگ</SheetTitle>
          <p className="text-xs text-muted-foreground">
            نوع ملک و محدوده‌های عددی را اینجا تنظیم کنید.
          </p>
        </SheetHeader>

        <div className="filing-filter-sheet__body">
          <div className="filing-filter-sheet__group">
            <Label className="filing-filter-sheet__group-label">دسته‌بندی</Label>
            <FilingCategoryBar
              dealType={(filters.dealType as FilingCategoryValue | 'all') ?? 'all'}
              propertyKind={(filters.propertyKind as FilingKindValue | 'all') ?? 'all'}
              onDealChange={(dealType) => onPatch({ dealType })}
              onKindChange={(propertyKind) => onPatch({ propertyKind })}
            />
          </div>

          <div className="filing-filter-sheet__group">
            <Label className="filing-filter-sheet__group-label" htmlFor="filing-poster-kind">
              نوع فایل
            </Label>
            <Select
              value={filters.posterKind}
              onValueChange={(v) =>
                onPatch({ posterKind: v as FilingBrowseFilters['posterKind'] })
              }
            >
              <SelectTrigger id="filing-poster-kind" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILING_POSTER_KIND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="filing-filter-sheet__group">
            <Label className="filing-filter-sheet__group-label">محدوده‌ها و امکانات</Label>
            <FilingFilterFieldGrid filters={filters} onPatch={onPatch} />
          </div>
        </div>

        <div className="filing-filter-sheet__footer">
          {clearCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onPatch(FILING_BROWSE_SHEET_FILTER_RESET)}
            >
              پاک کردن ({toPersianDigits(clearCount)})
            </Button>
          ) : null}
          <Button type="button" className="flex-1" onClick={() => onOpenChange(false)}>
            مشاهده نتایج
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
