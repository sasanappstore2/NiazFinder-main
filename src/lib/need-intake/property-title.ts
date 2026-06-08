import type { IntentType } from '@/contracts/need-intake';

const KIND_FA: Record<string, string> = {
  apartment: 'آپارتمان',
  villa: 'خانه ویلایی',
  land: 'زمین',
  office: 'دفتر کار',
  shop: 'مغازه',
  industrial: 'ملک صنعتی',
};

function dealPhrase(deal?: string): string {
  if (deal === 'rent_rahn_full') return 'رهن کامل';
  if (deal === 'rent_rahn_ejare') return 'رهن و اجاره';
  if (deal === 'rent_monthly') return 'اجاره';
  if (deal === 'rent_short_term') return 'اجاره روزانه';
  if (deal === 'buy') return 'خرید';
  if (deal === 'sell') return 'فروش';
  return 'جستجوی ملک';
}

/** Natural Persian title for property intents (no em-dash chains). */
export function buildPropertyTitle(
  intent: IntentType,
  entities: Record<string, string>,
  city?: string,
  areaName?: string
): string {
  if (!intent.startsWith('property')) {
    return 'ثبت نیاز';
  }

  const deal = entities.dealType;
  const kind = entities.propertyKind;
  const kindFa = kind ? (KIND_FA[kind] ?? 'ملک') : 'ملک';
  const dealFa = dealPhrase(deal);

  const sizePart =
    entities.areaMax && !entities.areaMin
      ? ` تا ${entities.areaMax} متر`
      : entities.areaMin && entities.areaMax
        ? ` ${entities.areaMin} تا ${entities.areaMax} متر`
        : entities.areaMin
          ? ` از ${entities.areaMin} متر`
          : entities.areaMax
            ? ` تا ${entities.areaMax} متر`
            : '';

  const roomPart =
    entities.rooms && entities.rooms !== 'studio'
      ? ` ${entities.rooms === '4+' ? '۴+' : entities.rooms} خواب`
      : '';

  let core = `${dealFa} ${kindFa}${roomPart}${sizePart}`.trim();

  const locationPart =
    areaName && city
      ? `در ${areaName}، ${city}`
      : areaName
        ? `در ${areaName}`
        : city
          ? `در ${city}`
          : '';

  if (locationPart) {
    core = `${core} ${locationPart}`.trim();
  }

  return core.slice(0, 80) || 'جستجوی ملک';
}

/** Title for مشارکت در ساخت and similar real-estate services. */
export function buildRealEstateServiceTitle(
  entities: Record<string, string>,
  city?: string
): string {
  const kindFa = entities.propertyKind
    ? (KIND_FA[entities.propertyKind] ?? 'ملک')
    : 'ملک';
  const size =
    entities.areaMin && entities.areaMax
      ? `${entities.areaMin} تا ${entities.areaMax} متر`
      : entities.areaMin
        ? `${entities.areaMin} متر`
        : entities.areaMax
          ? `تا ${entities.areaMax} متر`
          : '';
  const width = entities.plotWidth ? `عرض ${entities.plotWidth} متر` : '';
  const parts = ['مشارکت در ساخت', kindFa];
  if (size) parts.push(size);
  if (width) parts.push(`(${width})`);
  if (city) parts.push(`در ${city}`);
  return parts.join(' ').slice(0, 80);
}
