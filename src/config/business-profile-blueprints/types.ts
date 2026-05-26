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
  rootSlugs?: string[];
  parentSlugs?: string[];
  leafSlugs?: string[];
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
