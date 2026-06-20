/** Site import blueprint ids supported in phase 1 */
export type SiteImportBlueprintId = 'online_store' | 'company';

export type SiteImportSuggestionGroup =
  | 'brand'
  | 'storefront_categories'
  | 'products'
  | 'seo'
  | 'social';

export type SiteImportApplyType =
  | 'patch_profile'
  | 'patch_web_presence'
  | 'add_categories'
  | 'add_offers'
  | 'patch_extensions';

export type SiteImportSuggestion = {
  id: string;
  group: SiteImportSuggestionGroup;
  labelFa: string;
  preview: unknown;
  apply: {
    type: SiteImportApplyType;
    payload: Record<string, unknown>;
  };
  sourceUrl?: string;
};

export type SiteImportPreviewResult = {
  siteType: string;
  blueprintId: SiteImportBlueprintId;
  confidence: number;
  pagesScraped: string[];
  suggestions: SiteImportSuggestion[];
  warnings: string[];
  /** Server-issued token; required for apply (replaces trusting client suggestions). */
  previewToken: string;
};

export type SiteImportApplyResult = {
  applied: string[];
  skipped: string[];
  errors: { id: string; message: string }[];
};
