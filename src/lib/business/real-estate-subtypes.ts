/** Canonical occupation slugs under the real-estate + construction taxonomy. */
export type RealEstateSubtype =
  | 'real-estate-agent'
  | 'real-estate-office'
  | 'interior-designer'
  | 'architect'
  | 'property-manager'
  | 'facility-maintenance'
  | 'elevator-technician'
  | 'land-surveyor'
  | 'official-appraiser'
  | 'gate-automation'
  | 'general-contractor';

export const REAL_ESTATE_SUBTYPES: RealEstateSubtype[] = [
  'real-estate-agent',
  'real-estate-office',
  'interior-designer',
  'architect',
  'property-manager',
  'facility-maintenance',
  'elevator-technician',
  'land-surveyor',
  'official-appraiser',
  'gate-automation',
  'general-contractor',
];

const REAL_ESTATE_SUBTYPE_SET = new Set<string>(REAL_ESTATE_SUBTYPES);

export function isRealEstateSubtype(slug: string): slug is RealEstateSubtype {
  return REAL_ESTATE_SUBTYPE_SET.has(slug);
}
