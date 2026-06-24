'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, LayoutGrid } from 'lucide-react';
import {
  BusinessBrowseCategoryMenuDesktop,
  BusinessBrowseCategoryMenuMobile,
} from '@/components/browse/BusinessBrowseCategoryMenu';
import {
  CategorySelector,
  getCategoryIcon,
} from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import type { MegaMenuCategory } from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import { getCategoryBrowseUrl } from '@/lib/search/category-browse-url';
import { useBrowseListingType } from '@/hooks/use-browse-listing-type';
import { useFilteredNeedMegaMenu } from '@/hooks/use-filtered-need-mega-menu';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';

function NeedHeaderCategoryMenuDesktop() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const listingType = useBrowseListingType();
  const nestedCategories = useFilteredNeedMegaMenu();

  const handleSelect = (category: MegaMenuCategory) => {
    router.push(getCategoryBrowseUrl(category, { type: listingType }));
    setIsOpen(false);
  };

  return (
    <div className="hidden items-center gap-1 lg:flex">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setIsOpen((open) => !open);
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200',
              'border border-transparent',
              isOpen
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border/50'
            )}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <LayoutGrid className="size-4" />
            <span>دسته‌بندی نیازها</span>
            <ChevronDown
              className={cn('size-3 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(840px,calc(100vw-2rem))] max-h-[min(450px,calc(100dvh-var(--site-header-offset,6.5rem)-2rem))] p-0 overflow-hidden"
          dir="rtl"
          align="start"
          sideOffset={4}
        >
          <CategorySelector
            isDesktop
            nestedCategories={nestedCategories}
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

function HeaderCategoryMenuDesktop() {
  const listingType = useBrowseListingType();
  if (listingType === 'business') {
    return <BusinessBrowseCategoryMenuDesktop />;
  }
  return <NeedHeaderCategoryMenuDesktop />;
}

function NeedHeaderCategoryMenuMobile() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const listingType = useBrowseListingType();
  const nestedCategories = useFilteredNeedMegaMenu();

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
            className="flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
          >
            <LayoutGrid className="size-4" />
            <span>دسته‌بندی نیازها</span>
            <ChevronLeft className="size-3" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-[min(340px,calc(100vw-1.5rem))] p-0 sm:w-[min(400px,calc(100vw-2rem))]"
        >
          <CategorySelector
            isDesktop={false}
            nestedCategories={nestedCategories}
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

function HeaderCategoryMenuMobile() {
  const listingType = useBrowseListingType();
  if (listingType === 'business') {
    return <BusinessBrowseCategoryMenuMobile />;
  }
  return <NeedHeaderCategoryMenuMobile />;
}

/** Browse-only category pickers — code-split from the main header shell. */
export function HeaderBrowseCategoryMenus() {
  return (
    <>
      <HeaderCategoryMenuDesktop />
      <HeaderCategoryMenuMobile />
    </>
  );
}
