'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BrowseFilters } from '@/lib/filters/parser';
import { getAttribute } from '@/lib/filters/parser';
import type { CategoryFilterField } from '@/config/category-filters/types';
import { RECENT_OPTIONS, SORT_OPTIONS_BUSINESS, SORT_OPTIONS_NEED } from '@/config/browse-filter-definitions';

interface BrowseFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BrowseFilters;
  browseFields: CategoryFilterField[];
  isBusiness: boolean;
  onApplyGlobal: (patch: Partial<BrowseFilters>) => void;
  onApplyAttributes: (patch: Record<string, string | null | undefined>) => void;
  onClearAll: () => void;
}

function fieldVisible(field: CategoryFilterField, ctx: Record<string, string>): boolean {
  if (field.globalKey) return field.browse !== false;
  if (!field.showIf) return true;
  const val = ctx[field.showIf.field] ?? '';
  if (field.showIf.equals != null) return val === field.showIf.equals;
  if (field.showIf.in) return field.showIf.in.includes(val);
  return true;
}

export function BrowseFilterSheet({
  open,
  onOpenChange,
  filters,
  browseFields,
  isBusiness,
  onApplyGlobal,
  onApplyAttributes,
  onClearAll,
}: BrowseFilterSheetProps) {
  const sortOptions = isBusiness ? SORT_OPTIONS_BUSINESS : SORT_OPTIONS_NEED;
  const ctx = { ...filters.attributes };

  const categoryFields = browseFields.filter(
    (f) => !f.globalKey && visibleField(f, ctx)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl" dir="rtl">
        <SheetHeader>
          <SheetTitle>فیلترها</SheetTitle>
        </SheetHeader>
        <div className="mt-4 max-h-[60vh] space-y-5 overflow-y-auto pb-6">
          {browseFields.some((f) => f.globalKey === 'price') && (
            <div className="space-y-2">
              <Label>قیمت / بودجه (تومان)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="از"
                  value={filters.priceMin ?? ''}
                  onChange={(e) =>
                    onApplyGlobal({
                      priceMin: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="تا"
                  value={filters.priceMax ?? ''}
                  onChange={(e) =>
                    onApplyGlobal({
                      priceMax: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
          )}

          {categoryFields.map((field) => (
            <SheetFieldRow
              key={field.key}
              field={field}
              filters={filters}
              onApplyAttributes={onApplyAttributes}
            />
          ))}

          {browseFields.some((f) => f.globalKey === 'recent') && (
            <div className="space-y-2">
              <Label>بازه زمانی</Label>
              <Select
                value={filters.recent ?? 'all'}
                onValueChange={(v) =>
                  onApplyGlobal({
                    recent: v === 'all' ? null : (v as BrowseFilters['recent']),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="همه زمان‌ها" />
                </SelectTrigger>
                <SelectContent>
                  {RECENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value || 'all'} value={o.value || 'all'}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>مرتب‌سازی</Label>
            <Select
              value={filters.sort}
              onValueChange={(v) => onApplyGlobal({ sort: v as BrowseFilters['sort'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {browseFields.some((f) => f.globalKey === 'hasPhoto') && (
              <Button
                type="button"
                variant={filters.hasPhoto ? 'default' : 'outline'}
                size="sm"
                onClick={() => onApplyGlobal({ hasPhoto: filters.hasPhoto ? null : true })}
              >
                عکس‌دار
              </Button>
            )}
            {browseFields.some((f) => f.globalKey === 'urgent') && (
              <Button
                type="button"
                variant={filters.urgent ? 'default' : 'outline'}
                size="sm"
                onClick={() => onApplyGlobal({ urgent: filters.urgent ? null : true })}
              >
                فوری
              </Button>
            )}
            {browseFields.some((f) => f.globalKey === 'verified') && (
              <Button
                type="button"
                variant={filters.verified ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  onApplyGlobal({ verified: filters.verified ? null : true })
                }
              >
                تأییدشده
              </Button>
            )}
          </div>

          <Button variant="ghost" className="w-full text-destructive" onClick={onClearAll}>
            حذف همه فیلترها
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function visibleField(field: CategoryFilterField, ctx: Record<string, string>): boolean {
  if (!field.showIf) return true;
  const val = ctx[field.showIf.field] ?? '';
  if (field.showIf.equals != null) return val === field.showIf.equals;
  if (field.showIf.in) return field.showIf.in.includes(val);
  return true;
}

function SheetFieldRow({
  field,
  filters,
  onApplyAttributes,
}: {
  field: CategoryFilterField;
  filters: BrowseFilters;
  onApplyAttributes: (patch: Record<string, string | null | undefined>) => void;
}) {
  const value = getAttribute(filters, field.key);

  if (field.kind === 'chips' || field.kind === 'select' || field.kind === 'multi') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Select
          value={value ?? 'all'}
          onValueChange={(v) => onApplyAttributes({ [field.key]: v === 'all' ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="همه" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.kind === 'range' && !field.globalKey) {
    const minKey = field.key.includes('Min') ? field.key : `${field.key}Min`;
    const maxKey = field.key.includes('Max') ? field.key : `${field.key}Max`;
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="از"
            value={getAttribute(filters, minKey) ?? ''}
            onChange={(e) =>
              onApplyAttributes({ [minKey]: e.target.value || null })
            }
          />
          <Input
            type="number"
            placeholder="تا"
            value={getAttribute(filters, maxKey) ?? ''}
            onChange={(e) =>
              onApplyAttributes({ [maxKey]: e.target.value || null })
            }
          />
        </div>
      </div>
    );
  }

  return null;
}
