'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toPersianDigits } from '@/lib/format/digits';
import {
  FILINGS_FILE_TYPE_OPTIONS,
  FILINGS_POSTER_KIND_OPTIONS,
  type useFilingsExplorerFilters,
} from './useFilingsExplorerFilters';

type Explorer = ReturnType<typeof useFilingsExplorerFilters>;

export function FilingsExplorerFilterSheet({
  open,
  onOpenChange,
  explorer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explorer: Explorer;
}) {
  const { filters, patch, reset, hasActive, activeCount } = explorer;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] rounded-t-2xl sheet-safe-area-lg" dir="rtl">
        <div className="mx-auto -mb-2 mt-1 h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <SheetHeader className="pb-0">
          <SheetTitle>فیلترها</SheetTitle>
        </SheetHeader>

        <div className="max-h-[58vh] space-y-5 overflow-y-auto px-4 pb-2">
          <div className="space-y-2">
            <Label>منبع فایل</Label>
            <Select
              value={filters.fileType}
              onValueChange={(fileType) =>
                patch({ fileType: fileType as typeof filters.fileType })
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="همه منابع" />
              </SelectTrigger>
              <SelectContent>
                {FILINGS_FILE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>آگهی‌دهنده</Label>
            <Select
              value={filters.posterKind}
              onValueChange={(posterKind) =>
                patch({ posterKind: posterKind as typeof filters.posterKind })
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="همه آگهی‌دهندگان" />
              </SelectTrigger>
              <SelectContent>
                {FILINGS_POSTER_KIND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>کد فایل</Label>
            <PersianDigitInput
              variant="plain"
              placeholder="مثلاً ۲۳۴۵۶"
              value={filters.fileCode}
              onChange={(d) => patch({ fileCode: d })}
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border/60 px-4 pt-4 pb-safe">
          {hasActive ? (
            <Button type="button" variant="outline" className="flex-1" onClick={reset}>
              پاک کردن همه
              {activeCount > 0 ? ` (${toPersianDigits(activeCount)})` : ''}
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
