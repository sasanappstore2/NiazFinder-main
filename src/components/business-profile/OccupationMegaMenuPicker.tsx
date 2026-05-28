'use client';

import {
  filterOccupationMegaMenu,
  getOccupationSectorColor,
  OCCUPATION_MEGA_MENU_TREE,
} from '@/lib/business/occupation-mega-menu';
import { MAX_PROFILE_CATEGORY_SELECTIONS } from '@/lib/business/business-category';
import {
  BusinessCategoryMegaMenuPicker,
  type BusinessCategoryMegaMenuConfig,
} from '@/components/business-profile/BusinessCategoryMegaMenuPicker';

export const MAX_OCCUPATION_SELECTIONS = MAX_PROFILE_CATEGORY_SELECTIONS;

const OCCUPATION_CONFIG: BusinessCategoryMegaMenuConfig = {
  defaultTree: OCCUPATION_MEGA_MENU_TREE,
  filterMenu: filterOccupationMegaMenu,
  getSectorColor: getOccupationSectorColor,
  selectionNoun: 'شغل',
  searchPlaceholder: 'جستجوی شغل…',
  emptySearchMessage: 'شغلی یافت نشد',
  mobileRootTitle: 'انتخاب شغل',
  hintText: `حداکثر ${MAX_PROFILE_CATEGORY_SELECTIONS} شغل — اولین مورد، شغل اصلی است`,
};

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
  return (
    <BusinessCategoryMegaMenuPicker
      config={OCCUPATION_CONFIG}
      selectedSlugs={selectedSlugs}
      onChange={onChange}
      className={className}
    />
  );
}
