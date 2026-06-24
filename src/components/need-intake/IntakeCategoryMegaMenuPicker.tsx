'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import {
  CategorySelector,
  getCategoryIcon,
  type MegaMenuCategory,
} from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { getCategoryPath, normalizeCategoryPair } from '@/config/categories';
import {
  findMegaMenuCategoryForSlug,
  getMegaMenuBreadcrumb,
  resolveIntakeCategoryFromMegaMenu,
} from '@/lib/need-intake/mega-menu-category-utils';
import { useFilteredNeedMegaMenu } from '@/hooks/use-filtered-need-mega-menu';
import { useActiveCategorySlugs } from '@/hooks/use-active-category-slugs';

interface IntakeCategoryMegaMenuPickerProps {
  value: string;
  onChange: (payload: {
    slug: string;
    categorySlug: string;
    subcategorySlug: string | null;
    label: string;
  }) => void;
  className?: string;
  disabled?: boolean;
}

function useIsDesktopMegaMenu(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

function resolveDisplayLabel(slug: string): string {
  if (!slug) return 'انتخاب دسته‌بندی';
  const mega = findMegaMenuCategoryForSlug(slug);
  if (mega) return getMegaMenuBreadcrumb(mega);
  const path = getCategoryPath(slug);
  if (path.length > 1) {
    return path
      .slice(1)
      .map((p) => p.title)
      .join(' / ');
  }
  return path[0]?.title ?? slug;
}

function slugIsActive(slug: string, activeSlugs: ReadonlySet<string>): boolean {
  if (!slug) return true;
  const normalized = normalizeCategoryPair(slug);
  const candidates = [
    slug,
    normalized.categorySlug,
    normalized.subcategorySlug,
  ].filter(Boolean) as string[];
  return candidates.some((s) => activeSlugs.has(s));
}

export function IntakeCategoryMegaMenuPicker({
  value,
  onChange,
  className,
  disabled,
}: IntakeCategoryMegaMenuPickerProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktopMegaMenu();
  const nestedCategories = useFilteredNeedMegaMenu();
  const activeSlugs = useActiveCategorySlugs();
  const inactiveResetRef = useRef<string | null>(null);
  const displayLabel = useMemo(() => resolveDisplayLabel(value), [value]);

  useEffect(() => {
    if (!value || slugIsActive(value, activeSlugs)) return;
    if (inactiveResetRef.current === value) return;
    inactiveResetRef.current = value;
    toast.message('دسته انتخاب‌شده دیگر فعال نیست؛ لطفاً دسته دیگری انتخاب کنید.');
    onChange({
      slug: '',
      categorySlug: '',
      subcategorySlug: null,
      label: '',
    });
  }, [value, activeSlugs, onChange]);

  const handleSelect = (category: MegaMenuCategory) => {
    const resolved = resolveIntakeCategoryFromMegaMenu(category);
    if (!resolved) {
      toast.error('دسته‌بندی انتخاب‌شده در سیستم یافت نشد');
      return;
    }
    onChange(resolved);
    setOpen(false);
  };

  const menu = (
    <CategorySelector
      isDesktop={isDesktop}
      nestedCategories={nestedCategories}
      onSelect={handleSelect}
      onClose={() => setOpen(false)}
      getIcon={getCategoryIcon}
      selectOnly
    />
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm transition-colors',
              'hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40',
              disabled && 'cursor-not-allowed opacity-60',
              className
            )}
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
              <span className={cn('truncate', !value && 'text-muted-foreground')}>
                {displayLabel}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(840px,calc(100vw-2rem))] p-0 overflow-hidden"
          dir="rtl"
          align="start"
          sideOffset={4}
        >
          {menu}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm transition-colors',
          'hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40',
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {displayLabel}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="h-[85vh] p-0" dir="rtl">
          <SheetTitle className="sr-only">انتخاب دسته‌بندی</SheetTitle>
          {menu}
        </SheetContent>
      </Sheet>
    </>
  );
}
