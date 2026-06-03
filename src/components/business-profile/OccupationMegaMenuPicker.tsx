'use client';

import {
  filterOccupationMegaMenu,
  getOccupationSectorColor,
} from '@/lib/business/occupation-mega-menu';
import { useOccupationMegaMenuTree } from '@/hooks/use-occupation-mega-menu';
import { MAX_PROFILE_CATEGORY_SELECTIONS } from '@/lib/business/business-category';
import {
  BusinessCategoryMegaMenuPicker,
  type BusinessCategoryMegaMenuConfig,
} from '@/components/business-profile/BusinessCategoryMegaMenuPicker';

export const MAX_OCCUPATION_SELECTIONS = MAX_PROFILE_CATEGORY_SELECTIONS;

/** @deprecated Prefer BusinessProfileCategoryTabs for onboarding. */
export function OccupationMegaMenuPicker({
  selectedSlugs,
  onChange,
  className,
}: {
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  className?: string;
}) {
  const { tree, filterMenu } = useOccupationMegaMenuTree();
  const config: BusinessCategoryMegaMenuConfig = {
    defaultTree: tree,
    filterMenu,
    getSectorColor: getOccupationSectorColor,
    selectionNoun: 'شغل',
    searchPlaceholder: 'جستجوی شغل…',
    emptySearchMessage: 'شغلی یافت نشد',
    mobileRootTitle: 'انتخاب شغل',
    hintText: `حداکثر ${MAX_PROFILE_CATEGORY_SELECTIONS} شغل — اولین مورد، شغل اصلی است`,
  };

  return (
    <BusinessCategoryMegaMenuPicker
      config={config}
      selectedSlugs={selectedSlugs}
      onChange={onChange}
      className={className}
    />
  );
}
