import type { ProfileSectionId, ProfileTemplate } from '@/contracts/business-profile';

export type ProfileTabId =
  | 'intro'
  | 'products'
  | 'services'
  | 'portfolio'
  | 'gallery'
  | 'listings'
  | 'menu'
  | 'company'
  | 'needs'
  | 'reviews';

export type CmsModule =
  | 'offers'
  | 'portfolio'
  | 'listings'
  | 'menu'
  | 'companyInfo'
  | 'needs';

export interface ProfileTabSpec {
  id: ProfileTabId;
  labelFa: string;
  sections: ProfileSectionId[];
}

export interface BlueprintMatch {
  /** @deprecated Legacy need-category roots — use occupationSectors */
  rootSlugs?: string[];
  /** @deprecated Legacy need categories — use occupationSlugs */
  parentSlugs?: string[];
  leafSlugs?: string[];
  /** Business occupation sector slugs (depth 0) */
  occupationSectors?: string[];
  /** Business occupation slugs (depth 1) */
  occupationSlugs?: string[];
  /** Online store sector slugs (depth 0) */
  onlineStoreSectors?: string[];
  /** Online store vertical slugs (depth 1) */
  onlineStoreSlugs?: string[];
  /** Extension key must exist with non-empty data */
  extensionHint?: 'restaurant' | 'realEstate' | 'doctor' | 'mechanic' | 'company' | 'coach';
}

export interface BusinessProfileBlueprint {
  id: ProfileTemplate;
  titleFa: string;
  match: BlueprintMatch;
  sectionOrder: ProfileSectionId[];
  tabs: ProfileTabSpec[];
  defaultTab: ProfileTabId;
  cmsModules: CmsModule[];
  galleryLayout?: 'grid' | 'masonry' | 'portfolio';
}
