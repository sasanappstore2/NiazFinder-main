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
  getOccupationSectorColor,
} from '@/lib/business/occupation-mega-menu';
import { useOccupationMegaMenuTree } from '@/hooks/use-occupation-mega-menu';
import { useOnlineStoreMegaMenuTree } from '@/hooks/use-online-store-mega-menu';
import { getOnlineStoreSectorColor } from '@/lib/business/online-store-mega-menu';
import {
  BusinessCategoryMegaMenuPicker,
  type BusinessCategoryMegaMenuConfig,
} from '@/components/business-profile/BusinessCategoryMegaMenuPicker';

export function BusinessProfileCategoryTabs({
  selectedSlugs,
  onChange,
  className,
}: {
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  className?: string;
}) {
  const { tree: occupationTree, filterMenu: filterOccupationMenu } = useOccupationMegaMenuTree();
  const { tree: onlineStoreTree, filterMenu: filterOnlineStoreMenu } = useOnlineStoreMegaMenuTree();
  const sharedHint = `حداکثر ${MAX_PROFILE_CATEGORY_SELECTIONS} مورد از هر دو زبانه — اولین = اصلی`;

  const occupationConfig = React.useMemo(
    (): BusinessCategoryMegaMenuConfig => ({
      defaultTree: occupationTree,
      filterMenu: filterOccupationMenu,
      getSectorColor: getOccupationSectorColor,
      selectionNoun: 'مورد',
      searchPlaceholder: 'جستجوی شغل…',
      emptySearchMessage: 'شغلی یافت نشد',
      mobileRootTitle: 'انتخاب شغل',
      hintText: sharedHint,
    }),
    [occupationTree, filterOccupationMenu, sharedHint]
  );
  const onlineConfig = React.useMemo(
    (): BusinessCategoryMegaMenuConfig => ({
      defaultTree: onlineStoreTree,
      filterMenu: filterOnlineStoreMenu,
      getSectorColor: getOnlineStoreSectorColor,
      selectionNoun: 'مورد',
      searchPlaceholder: 'جستجوی حوزه فروش…',
      emptySearchMessage: 'حوزه‌ای یافت نشد',
      mobileRootTitle: 'انتخاب فروشگاه اینترنتی',
      hintText: sharedHint,
    }),
    [onlineStoreTree, filterOnlineStoreMenu, sharedHint]
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
