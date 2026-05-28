'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  getBusinessCategoryKindLabel,
  getBusinessCategoryTitle,
  MAX_PROFILE_CATEGORY_SELECTIONS,
} from '@/lib/business/business-category';
import {
  filterOccupationMegaMenu,
  getOccupationSectorColor,
  OCCUPATION_MEGA_MENU_TREE,
} from '@/lib/business/occupation-mega-menu';
import {
  filterOnlineStoreMegaMenu,
  getOnlineStoreSectorColor,
  ONLINE_STORE_MEGA_MENU_TREE,
} from '@/lib/business/online-store-mega-menu';
import {
  BusinessCategoryMegaMenuPicker,
  type BusinessCategoryMegaMenuConfig,
} from '@/components/business-profile/BusinessCategoryMegaMenuPicker';

const OCCUPATION_MENU_CONFIG: BusinessCategoryMegaMenuConfig = {
  defaultTree: OCCUPATION_MEGA_MENU_TREE,
  filterMenu: filterOccupationMegaMenu,
  getSectorColor: getOccupationSectorColor,
  selectionNoun: 'مورد',
  searchPlaceholder: 'جستجوی شغل…',
  emptySearchMessage: 'شغلی یافت نشد',
  mobileRootTitle: 'انتخاب شغل',
};

const ONLINE_STORE_MENU_CONFIG: BusinessCategoryMegaMenuConfig = {
  defaultTree: ONLINE_STORE_MEGA_MENU_TREE,
  filterMenu: filterOnlineStoreMegaMenu,
  getSectorColor: getOnlineStoreSectorColor,
  selectionNoun: 'مورد',
  searchPlaceholder: 'جستجوی حوزه فروش…',
  emptySearchMessage: 'حوزه‌ای یافت نشد',
  mobileRootTitle: 'انتخاب فروشگاه اینترنتی',
};

export function BusinessProfileCategoryTabs({
  selectedSlugs,
  onChange,
  className,
}: {
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  className?: string;
}) {
  const sharedHint = `حداکثر ${MAX_PROFILE_CATEGORY_SELECTIONS} مورد از هر دو زبانه — اولین = اصلی`;

  const occupationConfig = React.useMemo(
    () => ({ ...OCCUPATION_MENU_CONFIG, hintText: sharedHint }),
    []
  );
  const onlineConfig = React.useMemo(
    () => ({ ...ONLINE_STORE_MENU_CONFIG, hintText: sharedHint }),
    []
  );

  return (
    <div className={cn('space-y-3', className)}>
      {selectedSlugs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {selectedSlugs.map((slug, i) => (
            <li
              key={slug}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-800 dark:text-emerald-300"
            >
              {i === 0 && <span className="font-semibold">اصلی:</span>}
              <span className="text-[10px] opacity-70">{getBusinessCategoryKindLabel(slug)}</span>
              <span>{getBusinessCategoryTitle(slug)}</span>
            </li>
          ))}
        </ul>
      )}

      <Tabs defaultValue="occupations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="occupations">مشاغل</TabsTrigger>
          <TabsTrigger value="online-stores">فروشگاه اینترنتی</TabsTrigger>
        </TabsList>
        <TabsContent value="occupations" className="mt-3">
          <BusinessCategoryMegaMenuPicker
            config={occupationConfig}
            selectedSlugs={selectedSlugs}
            onChange={onChange}
          />
        </TabsContent>
        <TabsContent value="online-stores" className="mt-3">
          <BusinessCategoryMegaMenuPicker
            config={onlineConfig}
            selectedSlugs={selectedSlugs}
            onChange={onChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
