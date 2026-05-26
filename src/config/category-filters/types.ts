import type { FieldSchema, FieldType } from '@/contracts/need-intake';
import type { ListingType } from '@/lib/filters/parser';

/** Which marketplace UI/API this filter applies to. Default: `need`. */
export type FilterAudience = 'need' | 'business' | 'both';

export type FilterControlKind =
  | 'toggle'
  | 'chips'
  | 'select'
  | 'range'
  | 'text'
  | 'multi';

/** Maps to a global browse query field instead of `attributes`. */
export type GlobalBrowseKey =
  | 'price'
  | 'hasPhoto'
  | 'urgent'
  | 'verified'
  | 'recent'
  | 'sort';

export interface CategoryFilterField {
  key: string;
  label: string;
  kind: FilterControlKind;
  urlParam?: string;
  options?: { value: string; label: string }[];
  showIf?: { field: string; equals?: string; in?: string[] };
  /** When set, rendered via global BrowseFilters (not attributes). */
  globalKey?: GlobalBrowseKey;
  browse?: boolean;
  intake?: boolean;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  audience?: FilterAudience;
}

export interface ResolvedCategoryFilters {
  categorySlug: string | null;
  rootSlug: string | null;
  listingType: ListingType;
  /** Category-specific fields for browse bar/sheet (excludes path-redundant). */
  browseFields: CategoryFilterField[];
  /** Full intake field list for this category. */
  intakeFields: FieldSchema[];
  /** URL param keys allowed for this category (attributes + ranges). */
  allowedUrlParams: Set<string>;
}

export type CategoryFilterSpec = CategoryFilterField[];
