'use client';

import { useRouter } from 'next/navigation';
import { getCategoryBrowseUrl } from '@/lib/search/category-browse-url';
import { useBrowseListingType } from '@/hooks/use-browse-listing-type';
import {
  BusinessBrowseCategoryMenuDesktop,
  BusinessBrowseCategoryMenuMobile,
} from '@/components/browse/BusinessBrowseCategoryMenu';
import { useState } from 'react';
import {
  LayoutGrid,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import {
  CategorySelector,
  ALL_CATEGORIES,
  getCategoryIcon,
} from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import type { MegaMenuCategory } from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from '@/components/ui/sheet';

// ============ Desktop Category Bar ============
function NeedDesktopCategoryBar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const listingType = useBrowseListingType();

  const handleSelect = (category: MegaMenuCategory) => {
    router.push(getCategoryBrowseUrl(category, { type: listingType }));
    setIsOpen(false);
  };

  return (
    <div className="hidden lg:block">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setIsOpen((open) => !open);
            }}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-label font-medium transition-all duration-200',
              'border border-transparent',
              isOpen
                ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_8px_oklch(0.51_0.12_165/0.1)]'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border/50'
            )}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <LayoutGrid className="size-4" />
            <span>همه دسته‌بندی‌ها</span>
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[840px] p-0 overflow-hidden"
          dir="rtl"
          align="start"
          sideOffset={4}
        >
          <CategorySelector
            isDesktop={true}
            nestedCategories={ALL_CATEGORIES}
            onSelect={handleSelect}
            onClose={() => setIsOpen(false)}
            getIcon={getCategoryIcon}
            getHref={(c) => getCategoryBrowseUrl(c, { type: listingType })}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function DesktopCategoryBar() {
  const listingType = useBrowseListingType();
  if (listingType === 'business') {
    return <BusinessBrowseCategoryMenuDesktop />;
  }
  return <NeedDesktopCategoryBar />;
}

// ============ Mobile Category Bar ============
function NeedMobileCategoryBar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const listingType = useBrowseListingType();

  const handleSelect = (category: MegaMenuCategory) => {
    router.push(getCategoryBrowseUrl(category, { type: listingType }));
    setIsOpen(false);
  };

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-label font-medium text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border/50 border border-transparent transition-all duration-200"
          >
            <LayoutGrid className="size-4" />
            <span>همه دسته‌بندی‌ها</span>
            <ChevronLeft className="size-3.5" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[340px] p-0 sm:w-[400px]">
          <CategorySelector
            isDesktop={false}
            nestedCategories={ALL_CATEGORIES}
            onSelect={handleSelect}
            onClose={() => setIsOpen(false)}
            getIcon={getCategoryIcon}
            getHref={(c) => getCategoryBrowseUrl(c, { type: listingType })}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobileCategoryBar() {
  const listingType = useBrowseListingType();
  if (listingType === 'business') {
    return <BusinessBrowseCategoryMenuMobile />;
  }
  return <NeedMobileCategoryBar />;
}

// ============ CategoryBar (Sub-Header) ============
export function CategoryBar() {
  return (
    <div
      className="sticky top-[52px] z-40 w-full border-b border-border/30 bg-background/95 backdrop-blur-xl"
      role="toolbar"
      aria-label="نوار دسته‌بندی‌ها"
    >
      {/* Gradient bottom line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-l from-transparent via-primary/15 to-transparent" />
      <div className="container-default">
        <div className="flex h-11 items-center gap-2 overflow-x-auto scrollbar-none">
          <DesktopCategoryBar />
          <MobileCategoryBar />
        </div>
      </div>
    </div>
  );
}
