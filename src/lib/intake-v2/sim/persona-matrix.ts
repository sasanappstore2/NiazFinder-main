import { REAL_ESTATE_LEAF_SLUGS } from '@/lib/need-intake/dataset/real-estate-leaf-slugs';

export type PropertyDeal =
  | 'buy'
  | 'sell'
  | 'rent_monthly'
  | 'rent_rahn_full'
  | 'rent_rahn_ejare'
  | 'rent_short_term';

export type PersonaArchetype =
  | 'family_residence'
  | 'business_owner'
  | 'investor'
  | 'first_time_buyer'
  | 'landlord'
  | 'short_stay';

export interface ConversationPersona {
  id: string;
  batch: number;
  index: number;
  categorySlug: string;
  dealType: PropertyDeal;
  city: string;
  district: string;
  archetype: PersonaArchetype;
  propertyKind: string;
  openingHint: string;
  areaHint: string;
  budgetHint: string;
  depositHint: string;
  rentHint: string;
  noise: 'none' | 'typo' | 'indirect' | 'preference';
}

const CITIES = ['مشهد', 'تهران', 'اصفهان', 'شیراز', 'کرج'] as const;

const DISTRICTS: Record<string, string[]> = {
  مشهد: ['فرامرز عباسی', 'احمدآباد', 'سجاد', 'هاشمیه', 'فردوسی'],
  تهران: ['ونک', 'سعادت‌آباد', 'پونک', 'یوسف‌آباد', 'تهرانپارس'],
  اصفهان: ['مرداویج', 'چهارباغ', 'فردوسی'],
  شیراز: ['معالی‌آباد', 'صدرا'],
  کرج: ['گوهردشت', 'مهرویلا'],
};

const ARCHETYPES: PersonaArchetype[] = [
  'family_residence',
  'business_owner',
  'investor',
  'first_time_buyer',
  'landlord',
  'short_stay',
];

const KIND_FROM_SLUG: Record<string, string> = {
  apartment: 'apartment',
  villa: 'villa',
  land: 'land',
  office: 'office',
  shop: 'shop',
  industrial: 'industrial',
  suite: 'apartment',
  workspace: 'office',
};

function kindFromSlug(slug: string): string {
  for (const [key, kind] of Object.entries(KIND_FROM_SLUG)) {
    if (slug.includes(key)) return kind;
  }
  return 'apartment';
}

function dealsForSlug(slug: string, index: number): PropertyDeal {
  if (slug.includes('short-rent') || slug === 'suite-apartment-rent' || slug === 'villa-short-rent') {
    return 'rent_short_term';
  }
  if (slug.includes('sale')) {
    return index % 2 === 0 ? 'buy' : 'sell';
  }
  if (slug.includes('rent')) {
    const rents: PropertyDeal[] = ['rent_monthly', 'rent_rahn_ejare', 'rent_rahn_full'];
    return rents[index % rents.length]!;
  }
  return index % 2 === 0 ? 'buy' : 'rent_monthly';
}

function archetypeHint(archetype: PersonaArchetype): string {
  switch (archetype) {
    case 'business_owner':
      return 'برای مغازه/مزون/کسب‌وکار';
    case 'investor':
      return 'برای سرمایه‌گذاری';
    case 'landlord':
      return 'برای اجاره دادن';
    case 'short_stay':
      return 'کوتاه‌مدت';
    case 'first_time_buyer':
      return 'اولین خرید';
    default:
      return 'برای سکونت خانواده';
  }
}

/** Build exactly `total` personas (default 1000), 100 per batch × 10 batches. */
export function buildPersonaMatrix(total = 1000): ConversationPersona[] {
  const leaves = REAL_ESTATE_LEAF_SLUGS.filter(
    (s) => !['agency-services', 'construction-partnership', 'pre-sale-services'].includes(s)
  );
  const personas: ConversationPersona[] = [];

  for (let i = 0; i < total; i++) {
    const batch = Math.floor(i / 100) + 1;
    const slug = leaves[i % leaves.length]!;
    const city = CITIES[i % CITIES.length]!;
    const districts = DISTRICTS[city] ?? [city];
    const district = districts[i % districts.length]!;
    const archetype = ARCHETYPES[i % ARCHETYPES.length]!;
    const dealType = dealsForSlug(slug, i);
    const kind = kindFromSlug(slug);
    const isEdge = i >= total - 10;

    personas.push({
      id: `b${batch}-p${String(i).padStart(4, '0')}`,
      batch,
      index: i,
      categorySlug: slug,
      dealType: isEdge ? 'rent_rahn_ejare' : dealType,
      city,
      district,
      archetype: isEdge ? 'business_owner' : archetype,
      propertyKind: kind,
      openingHint: isEdge ? 'پاساژ آناهیتا هم ترجیح می‌دم' : archetypeHint(archetype),
      areaHint: ['35', '50', '80', '100', '120'][i % 5]!,
      budgetHint: ['۵', '۸', '۱۲', '۲', '۳'][i % 5]!,
      depositHint: ['۱۵۰', '۲۰۰', '۳۰۰', '۵۰۰'][i % 4]!,
      rentHint: ['۱۵', '۲۵', '۴۰', '۶۰'][i % 4]!,
      noise: isEdge ? 'preference' : (['none', 'typo', 'indirect', 'preference'] as const)[i % 4]!,
    });
  }

  return personas;
}

export function personasForBatch(batch: number, total = 1000): ConversationPersona[] {
  return buildPersonaMatrix(total).filter((p) => p.batch === batch);
}
