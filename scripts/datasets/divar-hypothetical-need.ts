import { citySlugToPersianName, locationCityIdToSlug } from '@/lib/search/city-slugs';
import { extractPostNaturalFields } from '@/lib/need-intake/si/post-natural-extractor';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const DIVAR_HYPOTHETICAL_NEED_TASK = 'divar-counterfactual-post-need-proposal/v5';

const CATEGORY_COPY: Record<string, { object: string; action: string }> = {
  'apartment-sale': { object: 'آپارتمان', action: 'برای خرید' },
  'apartment-rent': { object: 'آپارتمان', action: 'برای اجارهٔ ماهانه' },
  'villa-sale': { object: 'خانه یا ویلا', action: 'برای خرید' },
  'villa-rent': { object: 'خانه یا ویلا', action: 'برای اجارهٔ ماهانه' },
  'land-sale': { object: 'زمین یا ملک کلنگی', action: 'برای خرید' },
  'shop-sale': { object: 'مغازه یا واحد تجاری', action: 'برای خرید' },
  'shop-rent': { object: 'مغازه یا واحد تجاری', action: 'برای اجارهٔ ماهانه' },
  'office-sale': { object: 'دفتر کار', action: 'برای خرید' },
  'office-rent': { object: 'دفتر کار', action: 'برای اجارهٔ ماهانه' },
  'industrial-sale': { object: 'فضای صنعتی', action: 'برای خرید' },
  'industrial-rent': { object: 'فضای صنعتی', action: 'برای اجارهٔ ماهانه' },
  'suite-apartment-rent': { object: 'آپارتمان یا سوئیت', action: 'برای اجاره کوتاه‌مدت' },
  'villa-short-rent': { object: 'ویلا', action: 'برای اجاره کوتاه‌مدت' },
  'workspace-short-rent': { object: 'فضای کاری یا آموزشی', action: 'برای اجاره کوتاه‌مدت' },
  'pre-sale-services': { object: 'ملک پیش‌فروش', action: 'برای پیش‌خرید' },
  'construction-partnership': { object: 'پروژهٔ ملکی', action: 'برای مشارکت در ساخت' },
};

type JsonRecord = Record<string, any>;

let catalogsByAppCitySlug: Map<string, JsonRecord> | null = null;

export function divarAppCityCatalog(citySlug: string): JsonRecord | undefined {
  if (catalogsByAppCitySlug === null) {
    catalogsByAppCitySlug = new Map();
    const catalogPath = resolve(process.cwd(), 'src/data/neighborhoods/catalog');
    try {
      const catalogs: Array<{ slug: string; catalog: JsonRecord }> = [];
      for (const filename of readdirSync(catalogPath)) {
        if (!filename.endsWith('.json')) continue;
        try {
          const catalog = JSON.parse(readFileSync(resolve(catalogPath, filename), 'utf8')) as JsonRecord;
          const slug = filename.slice(0, -'.json'.length);
          // The catalog's explicit cityId is the guard against accidental
          // filename aliases resolving to another city.
          if (catalog.cityId === slug && text(catalog.cityName)) catalogs.push({ slug, catalog });
        } catch {
          // A malformed unrelated catalog must not prevent dataset processing.
        }
      }
      // Prefer a directly named app slug. Then resolve known location-system
      // aliases such as tehran -> tehran-city without guessing by text.
      for (const { slug, catalog } of catalogs) catalogsByAppCitySlug.set(slug, catalog);
      for (const { catalog } of catalogs) {
        const normalizedSlug = locationCityIdToSlug(String(catalog.cityId));
        if (!catalogsByAppCitySlug.has(normalizedSlug)) {
          catalogsByAppCitySlug.set(normalizedSlug, catalog);
        }
      }
    } catch {
      // The established city-slug registry remains the primary source.
    }
  }
  return catalogsByAppCitySlug.get(citySlug);
}

export function divarAppCityPersianName(citySlug: string): string | undefined {
  return citySlugToPersianName(citySlug) ?? text(divarAppCityCatalog(citySlug)?.cityName) ?? undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function target(value: unknown, source: string): JsonRecord {
  return { value: value ?? 'unknown', source, humanReviewed: false };
}

function persianNumber(value: number | string): string {
  return String(value).replace(/\d/gu, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export type DivarHypotheticalNeed = {
  taskType: typeof DIVAR_HYPOTHETICAL_NEED_TASK;
  schemaVersion: 5;
  exampleId: string;
  state: string;
  synthetic: true;
  realNeedGroundTruth: false;
  trainingEligible: false;
  generation: {
    method: 'deterministic-counterfactual-template';
    version: 5;
    perspective: 'hypothetical_seeker';
    disclaimer: string;
  };
  source: JsonRecord;
  sourceOfferGroup: string;
  originalSplit: string;
  targetDecisions: JsonRecord;
  sourceOfferLocation: JsonRecord;
  sourceOfferConflicts: Array<{
    field: string;
    structuredValue: unknown;
    textValue: unknown;
    resolution: 'unknown';
  }>;
  excludedOfferFields: string[];
};

function naturalNeedSentence(
  category: { object: string; action: string },
  attributes: string[],
  location: string,
  stableSourceId: string,
): string {
  const action = category.action.replace(/^برای\s*/u, '');
  const detail = attributes.join(' ');
  const templates = [
    (article: string) => `برای ${action} دنبال ${article} ${category.object} ${detail} ${location} هستم.`,
    (article: string) => `${article} ${category.object} ${detail} ${location} برای ${action} می‌خواهم.`,
    (article: string) => `نیاز به ${category.object} ${detail} ${location} دارم؛ قصد ${action} دارم.`,
    (article: string) => `${location ? `${location}، ` : ''}${article} ${category.object} ${detail} برای ${action} می‌خواهم.`,
  ];
  const digest = createHash('sha256').update(stableSourceId).digest();
  const template = templates[digest.readUInt32BE(0) % templates.length]!;
  const article = digest[4]! % 2 === 0 ? 'یک' : 'یه';
  return template(article).replace(/\s+/gu, ' ').replace(/\s+([،؛.])/gu, '$1').trim();
}

function needTransactionForCategory(categorySlug: string): string {
  if (categorySlug === 'construction-partnership') return 'unknown';
  if (categorySlug === 'pre-sale-services' || categorySlug.endsWith('-sale')) return 'buy';
  if (categorySlug === 'villa-short-rent' || categorySlug === 'suite-apartment-rent' || categorySlug === 'workspace-short-rent') {
    return 'rent_short_term';
  }
  if (categorySlug.endsWith('-rent')) return 'rent_monthly';
  return 'unknown';
}

/**
 * Build a clearly counterfactual seeker utterance from an offer's catalog facts.
 * This is template transformation, not Si text generation and not user-need
 * ground truth. Listing prices, rents, deposits, and negative amenities are
 * deliberately never recast as seeker preferences.
 */
export function buildDivarHypotheticalNeed(row: JsonRecord): DivarHypotheticalNeed | null {
  if (
    row.taskType !== 'divar-property-offer-facts/v2' ||
    row.synthetic !== false ||
    row.isNeedGroundTruth !== false ||
    row.source?.sourceType !== 'seller_or_agent_property_offer' ||
    row.source?.dataset !== 'divarofficial/real_estate_ads' ||
    typeof row.exampleId !== 'string' ||
    typeof row.source?.normalizedTextGroupSha256 !== 'string'
  ) return null;

  const categorySlug = text(row.typedDecisions?.offer_category?.value);
  const propertyKind = text(row.typedDecisions?.offer_property_kind?.value) ?? 'unknown';
  const copy = categorySlug ? CATEGORY_COPY[categorySlug] : undefined;
  if (!categorySlug || !copy) return null;

  const citySlug = text(row.offerLocation?.appCitySlug);
  const cityName = citySlug ? divarAppCityPersianName(citySlug) : undefined;
  const neighborhoodName =
    row.offerLocation?.neighborhoodMatch === 'exact_official_crosswalk'
      ? text(row.offerLocation?.appNeighborhoodName)
      : undefined;

  // Prefer Divar's structured offer facts over parsing seller prose. These
  // facts become preferences only through the explicitly hypothetical
  // transformation below; provenance records that distinction.
  const parsed = extractPostNaturalFields(String(row.state ?? ''));
  const offerAttributes = row.sourceOfferAttributes ?? {};
  const sourceOfferConflicts: DivarHypotheticalNeed['sourceOfferConflicts'] = [];
  const noteConflict = (field: string, structuredValue: unknown, textValue: unknown) => {
    sourceOfferConflicts.push({ field, structuredValue, textValue, resolution: 'unknown' });
  };
  const structuredArea = offerAttributes.area?.value;
  const validStructuredArea = typeof structuredArea === 'number' && Number.isFinite(structuredArea) && structuredArea > 0
    ? structuredArea
    : undefined;
  const parsedArea = typeof parsed.entities.area === 'number' && Number.isFinite(parsed.entities.area) && parsed.entities.area > 0
    ? parsed.entities.area
    : undefined;
  const parsedAreaRange = parsed.fields.find((field) => field.key === 'areaRange')?.value as
    | { min?: unknown; max?: unknown }
    | undefined;
  const validAreaRange = typeof parsedAreaRange?.min === 'number' && typeof parsedAreaRange.max === 'number'
    ? parsedAreaRange as { min: number; max: number }
    : undefined;
  const areaConflict = validStructuredArea !== undefined && (
    (parsedArea !== undefined && parsedArea !== validStructuredArea) ||
    (validAreaRange !== undefined && (validStructuredArea < validAreaRange.min || validStructuredArea > validAreaRange.max))
  );
  if (areaConflict) noteConflict('area', validStructuredArea, parsedArea ?? validAreaRange);
  const area = areaConflict
    ? undefined
    : validStructuredArea ?? parsedArea;
  const structuredRooms = offerAttributes.rooms?.value;
  // The need schema has no zero-bedroom/studio numeric value. Do not synthesize
  // a room preference that the canonical form and parser cannot represent.
  const unsupportedZeroRoomCount = structuredRooms === 0;
  const validStructuredRooms = typeof structuredRooms === 'number' && Number.isInteger(structuredRooms) && structuredRooms > 0
    ? structuredRooms
    : structuredRooms === '4+'
      ? '4+'
      : undefined;
  const parsedRooms = typeof parsed.entities.rooms === 'number' || parsed.entities.rooms === '4+'
    ? parsed.entities.rooms
    : undefined;
  const roomBucket = (value: unknown) => value === '4+' || (typeof value === 'number' && value >= 4) ? '4+' : value;
  const roomsConflict = validStructuredRooms !== undefined && parsedRooms !== undefined &&
    roomBucket(validStructuredRooms) !== roomBucket(parsedRooms);
  if (roomsConflict) noteConflict('rooms', validStructuredRooms, parsedRooms);
  const rooms = roomsConflict ? undefined : validStructuredRooms ?? parsedRooms;
  const structuredDeed = text(offerAttributes.deedType?.value)?.toLowerCase();
  const parsedDeed = text(parsed.entities.deedType);
  const deedConflict = Boolean(structuredDeed && parsedDeed && structuredDeed !== 'single_page');
  if (deedConflict) noteConflict('deedType', structuredDeed, parsedDeed);
  const deedType = deedConflict
    ? undefined
    : structuredDeed === 'single_page'
    ? 'single_sheet'
    : parsedDeed;
  const amenityLabels: Record<string, string> = { parking: 'پارکینگ', elevator: 'آسانسور', storage: 'انباری' };
  const amenityConflicts = new Set<string>();
  const positiveAmenities = ['parking', 'elevator', 'storage'].filter((key) => {
    const offerValue = offerAttributes.amenities?.[key]?.value;
    const textValue = parsed.fields.find((field) => field.key === key)?.value;
    const explicitTextValue = textValue === 'yes' || textValue === 'no' ? textValue : undefined;
    if (typeof offerValue === 'boolean' && explicitTextValue && (offerValue !== (explicitTextValue === 'yes'))) {
      amenityConflicts.add(key);
      noteConflict(key, offerValue, explicitTextValue);
      return false;
    }
    if (offerValue === true) return true;
    if (offerValue === false) return false;
    return explicitTextValue === 'yes';
  });
  const areaSource = areaConflict
    ? 'source_offer_text_conflict'
    : offerAttributes.area?.value === area && area !== undefined
    ? 'structured_listing_area_recast_as_hypothetical_preference'
    : 'listing_text_area_recast_as_hypothetical_preference';
  const roomsSource = roomsConflict
    ? 'source_offer_text_conflict'
    : offerAttributes.rooms?.value === rooms && rooms !== undefined
    ? 'structured_listing_rooms_recast_as_hypothetical_preference'
    : 'listing_text_rooms_recast_as_hypothetical_preference';
  const deedSource = deedConflict
    ? 'source_offer_text_conflict'
    : structuredDeed === 'single_page' && deedType === 'single_sheet'
    ? 'structured_listing_deed_recast_as_hypothetical_preference'
    : 'listing_text_deed_recast_as_hypothetical_preference';
  const amenitySource = (key: string) => offerAttributes.amenities?.[key]?.value === true
    ? 'structured_listing_feature_recast_as_hypothetical_preference'
    : 'listing_text_feature_recast_as_hypothetical_preference';

  const attributes: string[] = [];
  if (area !== undefined) attributes.push(`حدود ${persianNumber(area)} متر`);
  if (rooms === 0) attributes.push('بدون اتاق خواب');
  else if (rooms !== undefined) attributes.push(`${rooms === '4+' ? '۴ یا بیشتر' : persianNumber(rooms)} خواب`);
  if (positiveAmenities.length) {
    attributes.push(`با ${positiveAmenities.map((key) => amenityLabels[key]).join(' و ')}`);
  }
  if (deedType === 'single_sheet') attributes.push('با سند تک‌برگ');
  else if (deedType === 'multi_owner') attributes.push('با سند مشاعی');
  else if (deedType === 'power_of_attorney') attributes.push('با سند وکالتی');

  const location = neighborhoodName && cityName
    ? `در محدودهٔ ${neighborhoodName}، ${cityName}`
    : cityName
      ? `در ${cityName}`
      : neighborhoodName
        ? `در محدودهٔ ${neighborhoodName}`
        : '';
  // Keep counterfactual disclosure in metadata, not in the utterance. A
  // deterministic source-stable template avoids one artificial prefix/shape
  // becoming a shortcut for the parser.
  const state = naturalNeedSentence(copy, attributes, location, row.source.normalizedTextGroupSha256);
  if (state.length < 12 || state.length > 1_000) return null;

  const decisions: JsonRecord = {
    category_candidate: target(categorySlug, 'source_offer_category_counterfactual'),
    property_kind: target(propertyKind, 'source_offer_category_counterfactual'),
    transaction_type: target(needTransactionForCategory(categorySlug), 'counterfactual_from_requested_category'),
    usage: target('unknown', 'not_inferred_from_offer'),
    city: target(citySlug ?? 'unknown', citySlug ? 'verified_app_city_crosswalk' : 'not_mapped'),
    neighborhood: target(
      neighborhoodName ? row.offerLocation.appNeighborhoodId : 'unknown',
      neighborhoodName ? 'exact_city_scoped_official_crosswalk' : 'not_exactly_mapped',
    ),
    area: target(area, area !== undefined ? areaSource : areaConflict ? 'source_offer_text_conflict' : 'not_stated'),
    rooms: target(rooms, rooms !== undefined ? roomsSource : roomsConflict ? 'source_offer_text_conflict' : unsupportedZeroRoomCount ? 'zero_room_count_not_supported_by_canonical_rooms_field' : 'not_stated'),
    deed_type: target(deedType, deedType ? deedSource : deedConflict ? 'source_offer_text_conflict' : 'not_stated'),
    parking: target(positiveAmenities.includes('parking') ? 'yes' : 'unknown', positiveAmenities.includes('parking') ? amenitySource('parking') : amenityConflicts.has('parking') ? 'source_offer_text_conflict' : 'not_stated'),
    elevator: target(positiveAmenities.includes('elevator') ? 'yes' : 'unknown', positiveAmenities.includes('elevator') ? amenitySource('elevator') : amenityConflicts.has('elevator') ? 'source_offer_text_conflict' : 'not_stated'),
    storage: target(positiveAmenities.includes('storage') ? 'yes' : 'unknown', positiveAmenities.includes('storage') ? amenitySource('storage') : amenityConflicts.has('storage') ? 'source_offer_text_conflict' : 'not_stated'),
    budget: target('unknown', 'offer_price_never_transferred_to_seeker_budget'),
    monthly_rent: target('unknown', 'offer_rent_never_transferred_to_seeker_preference'),
    deposit: target('unknown', 'offer_credit_never_transferred_to_seeker_preference'),
  };

  return {
    taskType: DIVAR_HYPOTHETICAL_NEED_TASK,
    schemaVersion: 5,
    exampleId: `${row.exampleId}:counterfactual-v5`,
    state,
    synthetic: true,
    realNeedGroundTruth: false,
    trainingEligible: false,
    generation: {
      method: 'deterministic-counterfactual-template',
      version: 5,
      perspective: 'hypothetical_seeker',
      disclaimer: 'فرضی/پیشنهادی؛ از آگهی عرضهٔ ملکی مشتق شده است و نیاز واقعی کاربر یا ترجیح اثبات‌شده نیست.',
    },
    source: {
      dataset: row.source.dataset,
      datasetSha256: row.source.datasetSha256,
      sourceType: row.source.sourceType,
      sourceRowOrdinal: row.source.rowOrdinal,
      sourceExampleId: row.exampleId,
      normalizedTextGroupSha256: row.source.normalizedTextGroupSha256,
      sourceUse: row.sourceUse ?? null,
      privacyReview: row.privacy?.reviewStatus ?? 'unknown',
    },
    sourceOfferGroup: row.splitGroup ?? row.source.normalizedTextGroupSha256,
    originalSplit: text(row.split) ?? 'unknown',
    targetDecisions: decisions,
    sourceOfferConflicts,
    sourceOfferLocation: {
      appCitySlug: citySlug ?? null,
      appCityName: cityName ?? null,
      appNeighborhoodId: neighborhoodName ? row.offerLocation.appNeighborhoodId : null,
      appNeighborhoodName: neighborhoodName ?? null,
      neighborhoodMatch: neighborhoodName ? 'exact_official_crosswalk' : 'unresolved_or_not_stated',
    },
    excludedOfferFields: [
      'listing_price',
      'listing_rent',
      'listing_credit',
      'negative_amenities',
      'seller_or_agent_identity',
      'unmapped_city_or_neighborhood',
      'usage_or_business_purpose',
    ],
  };
}

type SiOfferAnswer = {
  choice?: unknown;
  answer_confidence?: unknown;
  confidence?: unknown;
};

const SI_PROPERTY_KINDS = new Set(['apartment', 'villa', 'land', 'office', 'shop', 'industrial', 'unknown']);
const SI_TRANSACTION_ACTIONS: Record<string, string> = {
  buy: 'برای خرید',
  rent_monthly: 'برای اجارهٔ ماهانه',
  rent_rahn_full: 'برای رهن کامل',
  rent_rahn_ejare: 'برای رهن و اجاره',
  rent_short_term: 'برای اجارهٔ کوتاه‌مدت',
};

function propertyKindCompatible(categorySlug: string, propertyKind: string): boolean {
  if (propertyKind === 'unknown') return true;
  let expected: string[];
  if (categorySlug.startsWith('apartment-') || categorySlug === 'suite-apartment-rent') expected = ['apartment'];
  else if (categorySlug.startsWith('villa-')) expected = ['villa'];
  else if (categorySlug.startsWith('land-')) expected = ['land'];
  else if (categorySlug.startsWith('shop-')) expected = ['shop'];
  else if (categorySlug.startsWith('office-')) expected = ['office'];
  else if (categorySlug.startsWith('industrial-')) expected = ['industrial'];
  else if (categorySlug === 'workspace-short-rent') expected = ['office'];
  else if (categorySlug === 'pre-sale-services') expected = ['apartment', 'villa'];
  else if (categorySlug === 'construction-partnership') expected = ['land'];
  else expected = [];
  return expected.length > 0 && expected.includes(propertyKind);
}

function transactionCompatible(categorySlug: string, transactionType: string): boolean {
  if (categorySlug.endsWith('-sale') || categorySlug === 'pre-sale-services') return transactionType === 'buy';
  if (categorySlug === 'villa-short-rent' || categorySlug === 'suite-apartment-rent' || categorySlug === 'workspace-short-rent') {
    return transactionType === 'rent_short_term';
  }
  if (categorySlug.endsWith('-rent')) {
    return ['rent_monthly', 'rent_rahn_full', 'rent_rahn_ejare'].includes(transactionType);
  }
  return false;
}

function siDecision(answers: JsonRecord, key: string, allowed: Set<string>) {
  const answer = answers[key] as SiOfferAnswer | undefined;
  const raw = typeof answer?.choice === 'string' ? answer.choice.trim() : '';
  const value = allowed.has(raw) ? raw : 'unknown';
  const rawConfidence = Number(answer?.answer_confidence ?? answer?.confidence);
  const confidence = Number.isFinite(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 1
    ? rawConfidence
    : undefined;
  return {
    value,
    source: 'si_offer_inspection' as const,
    confidence,
    accepted: false as const,
  };
}

/**
 * Convert Si's typed reading of the original seller-side offer into a
 * separately marked hypothetical request proposal. Render text only when the
 * Si choices agree with the structured offer facts; numeric/location facts
 * remain deterministic and source-attributed. This output is never training-
 * eligible.
 */
export function buildSiDerivedHypotheticalNeed(
  row: JsonRecord,
  deterministicProposal: Pick<DivarHypotheticalNeed, 'targetDecisions' | 'sourceOfferLocation'>,
  answers: JsonRecord,
) {
  const category = siDecision(answers, 'category_candidate', new Set(Object.keys(CATEGORY_COPY)));
  const propertyKind = siDecision(answers, 'property_kind', SI_PROPERTY_KINDS);
  const transactionType = siDecision(
    answers,
    'transaction_type',
    new Set([...Object.keys(SI_TRANSACTION_ACTIONS), 'sell', 'unknown']),
  );
  const sourceCategory = text(row.typedDecisions?.offer_category?.value) ?? 'unknown';
  const sourcePropertyKind = text(row.typedDecisions?.offer_property_kind?.value) ?? 'unknown';
  const sourceOfferTransaction = text(row.typedDecisions?.offer_transaction_type?.value) ?? 'unknown';
  const expectedCounterfactualTransaction = SI_TRANSACTION_ACTIONS[sourceOfferTransaction]
    ? sourceOfferTransaction
    : needTransactionForCategory(sourceCategory);
  const disagreements = [
    ...(category.value !== 'unknown' && sourceCategory !== 'unknown' && category.value !== sourceCategory
      ? [{ field: 'category_candidate', si: category.value, source: sourceCategory }]
      : []),
    ...(propertyKind.value !== 'unknown' && sourcePropertyKind !== 'unknown' && propertyKind.value !== sourcePropertyKind
      ? [{ field: 'property_kind', si: propertyKind.value, source: sourcePropertyKind }]
      : []),
    ...(transactionType.value !== 'unknown' && expectedCounterfactualTransaction !== 'unknown' && transactionType.value !== expectedCounterfactualTransaction
      ? [{ field: 'transaction_type', si: transactionType.value, source: expectedCounterfactualTransaction }]
      : []),
  ];

  const hasCategory = Boolean(CATEGORY_COPY[category.value]);
  const categoryTransactionCompatible = hasCategory && transactionCompatible(category.value, transactionType.value);
  const categoryPropertyKindCompatible = hasCategory && propertyKindCompatible(category.value, propertyKind.value);
  const categoryMatchesSource = sourceCategory === 'unknown' || category.value === sourceCategory;
  const propertyKindMatchesSource = sourcePropertyKind === 'unknown' || propertyKind.value === 'unknown' || propertyKind.value === sourcePropertyKind;
  const transactionMatchesSource = expectedCounterfactualTransaction === 'unknown' ||
    transactionType.value === 'unknown' || transactionType.value === expectedCounterfactualTransaction;
  const copy = CATEGORY_COPY[category.value];
  const canRenderText = Boolean(
    copy && categoryTransactionCompatible && categoryPropertyKindCompatible && categoryMatchesSource &&
    propertyKindMatchesSource && transactionMatchesSource,
  );
  const conversionStatus = canRenderText
    ? 'rendered_from_compatible_si_choices'
    : !hasCategory
      ? 'unknown_or_unsupported_category'
      : !categoryMatchesSource
        ? 'source_category_disagreement'
        : !transactionMatchesSource
          ? 'source_transaction_disagreement'
          : !propertyKindMatchesSource
          ? 'source_property_kind_disagreement'
            : !categoryTransactionCompatible
              ? 'category_transaction_conflict_or_unknown'
              : 'category_property_kind_conflict';

  const targetDecisions = {
    category_candidate: category,
    property_kind: propertyKind,
    transaction_type: transactionType,
  };
  let state: string | null = null;
  if (canRenderText && copy) {
    const fields = deterministicProposal.targetDecisions;
    const attributes: string[] = [];
    const area = fields.area?.value;
    const rooms = fields.rooms?.value;
    if (typeof area === 'number' && Number.isFinite(area) && area > 0) {
      attributes.push(`حدود ${persianNumber(area)} متر`);
    }
    if (typeof rooms === 'number' && Number.isInteger(rooms) && rooms > 0) {
      attributes.push(`${persianNumber(rooms)} خواب`);
    } else if (rooms === '4+') {
      attributes.push('۴ یا بیشتر خواب');
    }
    const amenityLabels: Record<string, string> = {
      parking: 'پارکینگ', elevator: 'آسانسور', storage: 'انباری',
    };
    const positiveAmenities = ['parking', 'elevator', 'storage'].filter(
      (key) => fields[key]?.value === 'yes',
    );
    if (positiveAmenities.length) {
      attributes.push(`با ${positiveAmenities.map((key) => amenityLabels[key]).join(' و ')}`);
    }
    if (fields.deed_type?.value === 'single_sheet') attributes.push('با سند تک‌برگ');
    else if (fields.deed_type?.value === 'multi_owner') attributes.push('با سند مشاعی');
    else if (fields.deed_type?.value === 'power_of_attorney') attributes.push('با سند وکالتی');

    const location = deterministicProposal.sourceOfferLocation.appNeighborhoodName &&
      deterministicProposal.sourceOfferLocation.appCityName
      ? `در محدودهٔ ${deterministicProposal.sourceOfferLocation.appNeighborhoodName}، ${deterministicProposal.sourceOfferLocation.appCityName}`
      : deterministicProposal.sourceOfferLocation.appCityName
        ? `در ${deterministicProposal.sourceOfferLocation.appCityName}`
        : '';
    const siBasedCopy = { ...copy, action: SI_TRANSACTION_ACTIONS[transactionType.value] };
    state = naturalNeedSentence(
      siBasedCopy,
      attributes,
      location,
      `${row.source.normalizedTextGroupSha256}:si-derived-v1`,
    );
  }

  return {
    taskType: 'divar-si-derived-hypothetical-need/v1',
    schemaVersion: 1,
    exampleId: `${row.exampleId}:si-counterfactual-v1`,
    state,
    synthetic: true,
    realNeedGroundTruth: false,
    trainingEligible: false,
    shadowOnly: true,
    accepted: false,
    source: 'si_typed_decisions_plus_deterministic_catalog_facts',
    model: 'convaiinnovations/si-multilingual',
    conversionStatus,
    decisions: targetDecisions,
    decisionAgreementWithSource: {
      sourceCategory,
      sourcePropertyKind,
      expectedCounterfactualTransaction,
      disagreements,
      transactionCategoryCompatible: categoryTransactionCompatible,
      propertyKindCategoryCompatible: categoryPropertyKindCompatible,
      categoryMatchesSource,
      propertyKindMatchesSource,
      transactionMatchesSource,
    },
    deterministicFacts: deterministicProposal.targetDecisions,
    sourceOfferLocation: deterministicProposal.sourceOfferLocation,
    disclaimer: 'پیشنهاد فرضی مشتق‌شده از آگهی عرضه؛ خروجی Si بازبینی‌نشده است، نیاز واقعی یا برچسب طلایی نیست و برای آموزش تأیید نشده است.',
  };
}
