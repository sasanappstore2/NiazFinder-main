'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutGrid, ChevronDown, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BusinessCategoryMegaMenuPicker,
  type BusinessCategoryMegaMenuConfig,
} from '@/components/business-profile/BusinessCategoryMegaMenuPicker';
import {
  isUnifiedBrowseNavigableSlug,
  unifiedBrowseSectorColor,
} from '@/lib/business/unified-business-browse-mega-menu';
import { useUnifiedBusinessBrowseMegaMenu } from '@/hooks/use-unified-business-browse-menu';
import { routeBuilder } from '@/config/routes';
import { parseBrowsePath } from '@/lib/search/browse-path';
import { usePathname } from 'next/navigation';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function useBrowseNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const { citySlug, pathLocation } = parseBrowsePath(pathname);
  const location = citySlug ?? (pathLocation === 'iran' ? 'iran' : pathLocation);

  return (leafSlug: string) => {
    if (!isUnifiedBrowseNavigableSlug(leafSlug)) return;
    router.push(
      routeBuilder.search({
        market: 'business',
        location,
        category: leafSlug,
        filters: { type: 'business' },
      })
    );
  };
}

function BrowseMenuPanel({
  onClose,
  navigate,
  layout,
}: {
  onClose: () => void;
  navigate: (slug: string) => void;
  layout: 'desktop' | 'mobile';
}) {
  const { tree, filterMenu } = useUnifiedBusinessBrowseMegaMenu();
  const config: BusinessCategoryMegaMenuConfig = {
    defaultTree: tree,
    filterMenu,
    getSectorColor: unifiedBrowseSectorColor,
    maxSelections: 1,
    selectionNoun: 'دسته',
    searchPlaceholder: 'جستجوی شغل یا فروشگاه اینترنتی…',
    emptySearchMessage: 'موردی یافت نشد',
    mobileRootTitle: 'دسته‌بندی کسب‌وکار',
    navigateOnLeaf: (slug) => {
      navigate(slug);
      onClose();
    },
  };

  return (
    <BusinessCategoryMegaMenuPicker
      config={config}
      selectedSlugs={[]}
      onChange={() => {}}
      layout={layout}
      className="p-3 sm:p-4"
    />
  );
}

export function BusinessBrowseCategoryMenuDesktop() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useBrowseNavigate();

  return (
    <div className="hidden lg:flex items-center gap-1">
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
            <span>دسته‌بندی کسب‌وکار</span>
            <ChevronDown
              className={cn('size-3 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(calc(100vw-1.5rem),52rem)] max-w-[52rem] p-0 overflow-hidden"
          dir="rtl"
          align="start"
          sideOffset={4}
        >
          <BrowseMenuPanel
            layout="desktop"
            onClose={() => setIsOpen(false)}
            navigate={navigate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function BusinessBrowseCategoryMenuMobile() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useBrowseNavigate();

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent transition-all duration-200"
          >
            <LayoutGrid className="size-4" />
            <span>دسته‌بندی کسب‌وکار</span>
            <ChevronLeft className="size-3" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-md p-0 sm:max-w-lg">
          <SheetTitle className="sr-only">دسته‌بندی کسب‌وکار</SheetTitle>
          <BrowseMenuPanel
            layout="mobile"
            onClose={() => setIsOpen(false)}
            navigate={navigate}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
