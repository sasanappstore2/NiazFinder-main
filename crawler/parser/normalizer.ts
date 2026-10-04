import type { ExtractedListing, NormalizedProperty } from '../types/property';
import { crawlError, err, ok, type Result } from '../types/errors';
import type { PropertyNormalizer } from '../interfaces/parser';
import { newId, sha256 } from '../core/utils';

export class GenericPropertyNormalizer implements PropertyNormalizer {
  normalize(
    extraction: ExtractedListing,
    context: { siteKey: string; jobId: string }
  ): Result<NormalizedProperty> {
    const raw = extraction.raw;
    const title = String(raw.title ?? raw.name ?? '').trim();
    if (!title || title.length < 3) {
      return err(
        crawlError('validation', 'missing title', { url: extraction.sourceUrl, retryable: false })
      );
    }

    const externalId = String(
      extraction.externalId ?? raw.externalId ?? raw.fileCode ?? raw.id ?? sha256(extraction.sourceUrl).slice(0, 16)
    );

    return ok({
      id: newId('prop'),
      jobId: context.jobId,
      externalId,
      sourceUrl: extraction.sourceUrl,
      sourceSite: context.siteKey,
      fileCode: raw.fileCode ? String(raw.fileCode) : undefined,
      title,
      description: raw.description ? String(raw.description) : undefined,
      dealType: normalizeDeal(raw.dealType),
      propertyKind: normalizeKind(raw.propertyKind ?? raw.propertyType),
      city: raw.city ? String(raw.city) : undefined,
      neighborhood: raw.neighborhood ? String(raw.neighborhood) : undefined,
      location: raw.location ? String(raw.location) : undefined,
      price: raw.price ? String(raw.price) : undefined,
      deposit: raw.deposit ? String(raw.deposit) : undefined,
      monthlyRent: raw.monthlyRent ? String(raw.monthlyRent) : undefined,
      area: raw.area ? String(raw.area) : undefined,
      rooms: typeof raw.rooms === 'number' ? raw.rooms : undefined,
      floor: typeof raw.floor === 'number' ? raw.floor : undefined,
      pricePerMeter: raw.pricePerMeter ? String(raw.pricePerMeter) : undefined,
      buildingAge: typeof raw.buildingAge === 'number' ? raw.buildingAge : undefined,
      documentType: raw.documentType ? String(raw.documentType) : undefined,
      amenities: {
        parking: Boolean(raw.hasParking),
        storage: Boolean(raw.hasStorage),
        elevator: Boolean(raw.hasElevator),
        securityDoor: Boolean(raw.hasSecurityDoor),
        exchangeable: Boolean(raw.exchangeable),
      },
      postedAt: raw.postedAt ? String(raw.postedAt) : undefined,
      detailUrl: raw.detailUrl ? String(raw.detailUrl) : extraction.sourceUrl,
      images: Array.isArray(raw.images) ? raw.images.map(String) : [],
      contentHash: sha256(JSON.stringify(raw)),
      normalizedAt: new Date().toISOString(),
    });
  }
}

function normalizeDeal(v: unknown): NormalizedProperty['dealType'] {
  const s = String(v ?? '').toLowerCase();
  if (s.includes('رهن') && s.includes('اجاره')) return 'rent_rahn_ejare';
  if (s.includes('رهن کامل') || s === 'rent_rahn_full') return 'rent_rahn_full';
  if (s.includes('کوتاه')) return 'rent_short_term';
  if (s.includes('فروش') || s === 'sell' || s === 'sale') return 'sell';
  return 'unknown';
}

function normalizeKind(v: unknown): NormalizedProperty['propertyKind'] {
  const s = String(v ?? '').toLowerCase();
  if (s.includes('آپارتمان') || s === 'apartment') return 'apartment';
  if (s.includes('ویلا') || s === 'villa') return 'villa';
  if (s.includes('زمین') || s === 'land') return 'land';
  if (s.includes('دفتر') || s === 'office') return 'office';
  if (s.includes('مغازه') || s === 'shop') return 'shop';
  if (s.includes('تجاری') || s === 'commercial') return 'commercial';
  return 'unknown';
}
