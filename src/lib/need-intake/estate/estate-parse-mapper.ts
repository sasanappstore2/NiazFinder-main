import type { ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { computeMissingIntakeFields } from '@/lib/need-intake/compute-missing-fields';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import {
  isConstructionPartnershipText,
  parseCity,
} from '@/lib/need-intake/intent-parser';
import {
  coerceParsedForEstate,
  parseEstateBudgetFromText,
} from '@/lib/need-intake/estate/estate-parse-coerce';
import {
  isLandlordOfferRahn,
  isLandlordOfferRent,
  isTenantSeekerRahnEjare,
} from '@/lib/need-intake/deal-type-helpers';
import type {
  EstateClarification,
  EstateIntent,
  EstateParseResult,
  EstatePropertyType,
} from '@/lib/need-intake/estate/estate-parse-result';

const CLARIFICATION_TEMPLATES: Record<string, { question: string; priority: 'required' | 'helpful' }> =
  {
    dealType: { question: 'می‌خواید بخرید یا اجاره کنید؟', priority: 'required' },
    intent: { question: 'می‌خواید بخرید یا اجاره کنید؟', priority: 'required' },
    propertyKind: { question: 'چه نوع ملکی مد نظرتون است؟', priority: 'required' },
    city: { question: 'در کدام شهر دنبال ملک هستید؟', priority: 'required' },
    'location.city': { question: 'در کدام شهر دنبال ملک هستید؟', priority: 'required' },
    deposit: { question: 'مبلغ رهن (ودیعه) چقدر است؟', priority: 'required' },
    monthlyRent: { question: 'اجاره ماهانه چقدر مد نظرتون است؟', priority: 'required' },
    budgetMin: { question: 'بودجه یا مبلغ مد نظرتون چقدره؟', priority: 'required' },
    areaMin: { question: 'متراژ تقریبی ملک چقدر باشه؟', priority: 'helpful' },
    rooms: { question: 'چند خواب می‌خواید؟', priority: 'helpful' },
    neighborhood: {
      question: 'محله یا منطقه دقیق‌تر کجاست؟',
      priority: 'helpful',
    },
  };

function isEstateParsed(parsed: ParsedIntent): boolean {
  if (parsed.intentType.startsWith('property')) return true;
  if (parsed.intentType === 'real_estate_service') return true;
  if (parsed.categorySlug === 'construction-partnership') return true;
  const root = getCategoryPath(parsed.categorySlug)[0]?.slug;
  return root === 'real-estate';
}

function detectSpecialIntent(text: string, parsed: ParsedIntent): EstateIntent | null {
  if (
    isConstructionPartnershipText(text) ||
    text.includes('مشارکت') ||
    (text.includes('شریک') && text.includes('سازنده'))
  ) {
    return 'partnership';
  }
  if (text.includes('پیش‌خرید') || text.includes('پیش خرید') || text.includes('پیشفروش')) {
    return 'pre_purchase';
  }
  if (text.includes('جابجایی') || text.includes('معاوضه') || text.includes('کلید در کلید')) {
    return 'swap';
  }
  if (
    text.includes('بگیرم') &&
    text.includes('بدم') &&
    (text.includes('کار') || text.includes('کار کنه'))
  ) {
    return 'lease_out';
  }
  if (
    text.includes('سرمایه‌گذاری') ||
    text.includes('سرمایه گذاری') ||
    text.includes('مستغل') ||
    (text.includes('بخرم') && text.includes('اجاره بدم'))
  ) {
    return 'investment';
  }
  if (isLandlordOfferRent(text)) {
    return 'lease_out';
  }
  if (!isTenantSeekerRahnEjare(text) && isLandlordOfferRahn(text)) {
    return 'lease_out';
  }
  if (
    text.includes('اجاره بدم') ||
    text.includes('اجاره دادن') ||
    text.includes('اجاره دادنی') ||
    text.includes('واگذار') ||
    (text.includes('اجاره') && text.includes('بدم'))
  ) {
    return 'lease_out';
  }
  if (parsed.intentType === 'property_listing' || parsed.entities.dealType === 'sell') {
    if (text.includes('فروش') || text.includes('بفروش') || text.includes('تبدیل به پول')) {
      return 'sell';
    }
    if (text.includes('اجاره بدم') || text.includes('اجاره دادن')) return 'lease_out';
  }
  return null;
}

function mapDealTypeToIntent(dealType: string | undefined, intentType: string): EstateIntent {
  if (intentType === 'property_listing') {
    if (dealType === 'sell') return 'sell';
    if (
      dealType === 'rent_monthly' ||
      dealType === 'rent_rahn_ejare' ||
      dealType === 'rent_rahn_full'
    ) {
      return 'lease_out';
    }
  }
  switch (dealType) {
    case 'buy':
      return 'buy';
    case 'sell':
      return 'sell';
    case 'rent_monthly':
      return 'rent';
    case 'rent_rahn_full':
      return 'full_mortgage';
    case 'rent_rahn_ejare':
      return 'rent_mortgage';
    case 'rent_short_term':
      return 'rent';
    default:
      return null;
  }
}

function mapPropertyKind(
  kind: string | undefined,
  categorySlug: string,
  text: string
): EstatePropertyType {
  if (text.includes('تجاری-مسکونی') || text.includes('تجاری مسکونی')) return 'mixed';
  if (text.includes('زندگی') && text.includes('کار')) return 'mixed';
  if (text.includes('خانه ویلایی') || (text.includes('خانه') && text.includes('ویلایی'))) {
    return 'house';
  }
  if (text.includes('پنت‌هاوس') || text.includes('پنت هاوس')) return 'apartment';
  if (text.includes('سوله') || text.includes('کارگاه')) return 'warehouse';
  if (text.includes('انبار') && !text.includes('انباری')) return 'warehouse';
  if (text.includes('نقلی')) return 'apartment';

  if (text.includes('زمین') || text.includes('کلنگی') || text.includes('باغ')) return 'land';
  if (kind === 'land') return 'land';

  const slug = categorySlug.toLowerCase();
  if (slug.includes('apartment')) return 'apartment';
  if (slug.includes('villa')) return 'villa';
  if (slug.includes('land')) return 'land';
  if (slug.includes('office') || slug.includes('workspace')) return 'office';
  if (slug.includes('shop')) return 'shop';
  if (slug.includes('industrial')) return 'warehouse';

  switch (kind) {
    case 'apartment':
      return 'apartment';
    case 'villa':
      return 'villa';
    case 'land':
      return 'land';
    case 'office':
      return 'office';
    case 'shop':
      return 'shop';
    case 'industrial':
      return 'warehouse';
    default:
      return null;
  }
}

function parseRooms(slots: ReturnType<typeof extractPropertySlotsFromText>): number | null {
  const r = slots.rooms?.replace('+', '');
  if (!r) return null;
  const n = Number(r);
  return Number.isFinite(n) ? n : null;
}

function parseAreaNumbers(
  slots: ReturnType<typeof extractPropertySlotsFromText>
): EstateParseResult['area'] {
  const min = slots.areaMin ? Number(slots.areaMin) : null;
  const max = slots.areaMax ? Number(slots.areaMax) : null;
  if (min != null && max != null && min === max) {
    return { min: null, max: null, exact: min };
  }
  if (min != null && max == null) return { min, max: null, exact: min };
  if (min == null && max != null) return { min: null, max, exact: max };
  return { min: min ?? null, max: max ?? null, exact: null };
}

function buildBudget(
  parsed: ParsedIntent,
  slots: ReturnType<typeof extractPropertySlotsFromText>
): EstateParseResult['budget'] {
  const budget: EstateParseResult['budget'] = { unit: 'toman' };
  const extra = parseEstateBudgetFromText(parsed.rawText ?? '', parsed.entities.dealType);
  const depositRaw = slots.deposit || slots.rahnAmount || parsed.entities.deposit || extra.deposit;
  const rentRaw = slots.monthlyRent || parsed.entities.monthlyRent || extra.monthlyRent;
  const deposit = depositRaw ? Number(depositRaw) : null;
  const rent = rentRaw ? Number(rentRaw) : null;

  if (deposit != null && Number.isFinite(deposit)) {
    budget.mortgage = { amount: deposit };
  }
  if (rent != null && Number.isFinite(rent)) {
    budget.rent = { amount: rent };
  }
  if (parsed.budgetMin != null || parsed.budgetMax != null || extra.budgetMin || extra.budgetMax) {
    budget.purchase_price = {
      min: parsed.budgetMin ?? extra.budgetMin ?? null,
      max: parsed.budgetMax ?? extra.budgetMax ?? null,
    };
  }
  return budget;
}

function buildFeatures(
  text: string,
  slots: ReturnType<typeof extractPropertySlotsFromText>
): EstateParseResult['features'] {
  let direction: EstateParseResult['features']['direction'] = null;
  if (text.includes('جنوبی')) direction = 'south';
  else if (text.includes('شمالی')) direction = 'north';
  else if (text.includes('شرقی')) direction = 'east';
  else if (text.includes('غربی')) direction = 'west';

  let document_type: EstateParseResult['features']['document_type'] = null;
  if (text.includes('سند شخصی')) document_type = 'shakhsi';
  if (text.includes('وقف') || text.includes('وقفی')) document_type = 'vaghfi';

  let building_age_max: number | null = null;
  if (text.includes('نوساز') || text.includes('کلید اول')) building_age_max = 2;
  const ageMatch = text.match(/حداکثر\s*(\d+)\s*سال/u);
  if (ageMatch?.[1]) building_age_max = Number(ageMatch[1]);

  const floorMin = slots.floorMin ? Number(slots.floorMin) : null;
  const floorMax = slots.floorMax ? Number(slots.floorMax) : null;

  return {
    parking: text.includes('پارکینگ') ? true : null,
    elevator: text.includes('آسانسور') ? true : null,
    storage: text.includes('انباری') ? true : null,
    furnished: text.includes('مبله') ? true : text.includes('غیر مبله') ? false : null,
    floor:
      floorMin != null || floorMax != null
        ? { min: floorMin, max: floorMax }
        : text.includes('طبقه بالا') || text.includes('طبقه ۳')
          ? { min: 3, max: null }
          : null,
    building_age_max,
    direction,
    document_type,
  };
}

function buildClarifications(
  parsed: ParsedIntent,
  missing: string[],
  locationNeedsClarification: boolean
): EstateClarification[] {
  const out: EstateClarification[] = [];
  const seen = new Set<string>();

  for (const key of missing) {
    const tpl = CLARIFICATION_TEMPLATES[key];
    if (!tpl || seen.has(key)) continue;
    seen.add(key);
    out.push({ field: key, question: tpl.question, priority: tpl.priority });
  }

  if (locationNeedsClarification && !seen.has('city')) {
    const status = parsed.locationResolutionStatus;
    if (status === 'city_ambiguous') {
      out.push({
        field: 'location.city',
        question: 'منظورتون شمال تهران است یا استان‌های شمالی؟',
        priority: 'required',
      });
    } else if (!parsed.city?.trim()) {
      out.push({
        field: 'location.city',
        question: 'در کدام شهر دنبال ملک هستید؟',
        priority: 'required',
      });
    } else if (parsed.locationAmbiguous || status === 'neighborhood_ambiguous') {
      out.push({
        field: 'location.neighborhood',
        question: 'محله یا منطقه دقیق‌تر کجاست؟',
        priority: 'helpful',
      });
    }
  }

  return out;
}

function inferPrerequisites(intent: EstateIntent, result: EstateParseResult): string[] {
  const missing: string[] = [];
  if (!intent) missing.push('intent');
  if (!result.property_type) missing.push('property_type');
  if (!result.location.city && !result.location.needs_clarification) {
    missing.push('location.city');
  }

  switch (intent) {
    case 'buy':
    case 'investment':
    case 'pre_purchase':
      if (!result.budget.purchase_price?.min && !result.budget.purchase_price?.max) {
        missing.push('budget.purchase_price');
      }
      break;
    case 'rent':
      if (!result.budget.rent?.amount) missing.push('budget.rent');
      break;
    case 'full_mortgage':
      if (!result.budget.mortgage?.amount) missing.push('budget.mortgage');
      break;
    case 'rent_mortgage':
      if (!result.budget.mortgage?.amount) missing.push('budget.mortgage');
      if (!result.budget.rent?.amount) missing.push('budget.rent');
      break;
    case 'partnership':
      if (!result.area.exact && !result.area.min) missing.push('area');
      break;
    default:
      break;
  }
  return missing;
}

/** Map rules-parser `ParsedIntent` → benchmark `EstateParseResult`. */
export function mapParsedIntentToEstateResult(rawParsed: ParsedIntent): EstateParseResult {
  const parsed = coerceParsedForEstate(rawParsed);
  const text = parsed.rawText ?? '';
  const estate = isEstateParsed(parsed);

  if (!estate) {
    return {
      category: 'out_of_scope',
      intent: null,
      property_type: null,
      location: {
        city: null,
        district: null,
        neighborhood: null,
        ambiguous: false,
        needs_clarification: false,
      },
      area: { min: null, max: null, exact: null },
      budget: { unit: 'toman' },
      rooms: null,
      features: {
        parking: null,
        elevator: null,
        storage: null,
        furnished: null,
        floor: null,
        building_age_max: null,
        direction: null,
        document_type: null,
      },
      urgency: null,
      clarifications_needed: [],
      missing_prerequisites: [],
      confidence: parsed.confidence,
    };
  }

  const slots = extractPropertySlotsFromText(text);
  const specialIntent = detectSpecialIntent(text, parsed);
  const intent =
    specialIntent ?? mapDealTypeToIntent(parsed.entities.dealType, parsed.intentType);

  const city = (() => {
    let c = parsed.city?.trim() || parseCity(text) || null;
    if (text.includes('نزدیک مترو') && !/(?:تهران|مشهد|اصفهان|شیراز|کرج|تبریز)/u.test(text)) {
      c = null;
    }
    return c;
  })();
  const neighborhood =
    parsed.entities?.area?.trim() ||
    (parsed.neighborhoodSlug ? parsed.neighborhoodSlug : null);

  const locationAmbiguous =
    Boolean(parsed.locationAmbiguous) ||
    parsed.locationResolutionStatus === 'city_ambiguous' ||
    parsed.locationResolutionStatus === 'neighborhood_ambiguous' ||
    parsed.locationResolutionStatus === 'unresolved';

  const needsClarification =
    locationAmbiguous ||
    !intent ||
    !parsed.entities.propertyKind;

  const districtMatch = text.match(/منطقه\s*([۰-۹0-9]+)/u);
  const district = districtMatch ? `منطقه ${districtMatch[1]}` : null;

  const missingFields = parsed.missingFields ?? computeMissingIntakeFields(parsed);
  const clarifications = buildClarifications(parsed, missingFields, needsClarification);

  const result: EstateParseResult = {
    category: 'estate',
    intent,
    property_type: mapPropertyKind(parsed.entities.propertyKind, parsed.categorySlug, text),
    location: {
      city,
      district,
      neighborhood: typeof neighborhood === 'string' ? neighborhood : null,
      ambiguous: locationAmbiguous,
      needs_clarification: !city || locationAmbiguous,
    },
    area: parseAreaNumbers(slots),
    budget: buildBudget(parsed, slots),
    rooms: parseRooms(slots),
    features: buildFeatures(text, slots),
    urgency:
      parsed.urgency === 'URGENT' || parsed.urgency === 'HIGH'
        ? 'urgent'
        : parsed.urgency
          ? 'normal'
          : text.includes('بدو') || text.includes('فوری')
            ? 'urgent'
            : null,
    clarifications_needed: clarifications,
    missing_prerequisites: [],
    confidence: parsed.confidence,
  };

  if (!result.intent || !result.property_type) {
    if (!result.intent) {
      result.clarifications_needed.push({
        field: 'intent',
        question: 'می‌خواید بخرید یا اجاره کنید؟',
        priority: 'required',
      });
      result.missing_prerequisites.push('intent');
    }
    if (!result.property_type) {
      result.clarifications_needed.push({
        field: 'propertyKind',
        question: 'چه نوع ملکی مد نظرتون است؟',
        priority: 'required',
      });
      result.missing_prerequisites.push('property_type');
    }
  }
  result.missing_prerequisites.push(...inferPrerequisites(intent, result));
  result.missing_prerequisites = [...new Set(result.missing_prerequisites)];
  for (const f of missingFields) {
    if (!result.missing_prerequisites.includes(f)) result.missing_prerequisites.push(f);
  }

  if (!result.intent) {
    if (result.budget.mortgage?.amount && result.budget.rent?.amount) {
      result.intent = 'rent_mortgage';
    } else if (result.budget.mortgage?.amount) {
      result.intent = 'full_mortgage';
    } else if (result.budget.rent?.amount) {
      result.intent = 'rent';
    } else if (result.budget.purchase_price?.max || result.budget.purchase_price?.min) {
      result.intent = 'buy';
    } else if (parsed.entities.dealType) {
      result.intent = mapDealTypeToIntent(parsed.entities.dealType, parsed.intentType);
    }
  } else if (
    result.budget.mortgage?.amount &&
    result.budget.rent?.amount &&
    result.intent === 'rent'
  ) {
    result.intent = 'rent_mortgage';
  } else if (
    result.budget.rent?.amount &&
    result.intent === 'buy' &&
    !result.budget.purchase_price?.max
  ) {
    result.intent = 'rent';
  }

  return result;
}
