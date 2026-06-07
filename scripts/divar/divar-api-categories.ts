/** Divar postlist API category mapping (nfSlug → parent + subcategory). */
export interface DivarApiCategory {
  nfSlug: string;
  parentCategory: string;
  subcategory: string;
}

export const DIVAR_API_REAL_ESTATE_CATEGORIES: DivarApiCategory[] = [
  { nfSlug: 'apartment-sale', parentCategory: 'residential-sell', subcategory: 'buy-apartment' },
  { nfSlug: 'villa-sale', parentCategory: 'residential-sell', subcategory: 'buy-villa' },
  { nfSlug: 'land-sale', parentCategory: 'residential-sell', subcategory: 'buy-old-house' },
  { nfSlug: 'apartment-rent', parentCategory: 'residential-rent', subcategory: 'rent-apartment' },
  { nfSlug: 'villa-rent', parentCategory: 'residential-rent', subcategory: 'rent-villa' },
  { nfSlug: 'land-rent', parentCategory: 'residential-rent', subcategory: 'rent-old-house' },
  { nfSlug: 'office-sale', parentCategory: 'commercial-sell', subcategory: 'buy-office' },
  { nfSlug: 'shop-sale', parentCategory: 'commercial-sell', subcategory: 'shop-sell' },
  { nfSlug: 'industrial-sale', parentCategory: 'commercial-sell', subcategory: 'buy-industrial-agricultural-property' },
  { nfSlug: 'office-rent', parentCategory: 'commercial-rent', subcategory: 'rent-office' },
  { nfSlug: 'shop-rent', parentCategory: 'commercial-rent', subcategory: 'shop-rent' },
  { nfSlug: 'industrial-rent', parentCategory: 'commercial-rent', subcategory: 'rent-industrial-agricultural-property' },
  { nfSlug: 'suite-apartment-rent', parentCategory: 'temporary-rent', subcategory: 'rent-temporary-suite-apartment' },
  { nfSlug: 'villa-short-rent', parentCategory: 'temporary-rent', subcategory: 'rent-temporary-villa' },
  { nfSlug: 'workspace-short-rent', parentCategory: 'temporary-rent', subcategory: 'rent-temporary-workspace' },
  { nfSlug: 'construction-partnership', parentCategory: 'real-estate', subcategory: 'contribution-construction' },
  { nfSlug: 'pre-sale-services', parentCategory: 'real-estate', subcategory: 'pre-sell-home' },
];
