import type { IntentType } from '@/contracts/need-intake';
import { getIntentsForCategory } from '@/config/need-intents';
import { getCategoryPath } from '@/config/categories';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { toAsciiDigits } from '@/lib/format/digits';
import type { DatasetFixture, DatasetLabels } from './schema';
import { labelsFromParsedIntent } from './schema';
import { normalizeInput } from './shared/normalize-input';
import { cityToSlug } from './shared/normalize-city';

export interface DivarNeedSourcePost {
  title: string;
  district?: string;
  city?: string;
  priceText?: string;
  nfSlug: string;
  citySlug: string;
  vertical: ClassifierVertical;
}

const NEED_OPENERS = [
  'میخوام',
  'دنبال',
  'نیاز دارم به',
  'به دنبال',
  'لازم دارم',
];

function verticalForSlug(nfSlug: string): ClassifierVertical {
  if (
    nfSlug.includes('apartment') ||
    nfSlug.includes('villa') ||
    nfSlug.includes('land') ||
    nfSlug.includes('office') ||
    nfSlug.includes('shop') ||
    nfSlug.includes('industrial') ||
    nfSlug.includes('suite') ||
    nfSlug.includes('workspace') ||
    nfSlug.includes('construction') ||
    nfSlug.includes('pre-sale')
  ) {
    return 'real-estate';
  }
  if (nfSlug.startsWith('car') || nfSlug === 'motorcycle' || nfSlug === 'spare-parts' || nfSlug === 'boat') {
    return 'vehicles';
  }
  if (
    ['it', 'admin-management', 'marketing-sales', 'engineering'].includes(nfSlug)
  ) {
    return 'jobs';
  }
  if (
    ['cleaning', 'repairs', 'plumbing', 'moving', 'electrical', 'painting', 'education'].includes(
      nfSlug
    )
  ) {
    return 'services';
  }
  return 'products';
}

export function inferNeedIntentType(nfSlug: string): IntentType {
  const allowed = getIntentsForCategory(nfSlug);
  const prefer: IntentType[] = [
    'property_search',
    'vehicle_search',
    'product_search',
    'service_request',
    'job_search',
    'help_request',
  ];
  for (const intent of prefer) {
    if (allowed.includes(intent)) return intent;
  }
  return allowed[0] ?? 'service_request';
}

export function inferNeedDealType(nfSlug: string): string | undefined {
  if (nfSlug.includes('rent') || nfSlug === 'car-rental') {
    if (nfSlug.includes('short') || nfSlug.includes('suite') || nfSlug.includes('workspace')) {
      return 'rent_daily';
    }
    return 'rent';
  }
  if (nfSlug.includes('sale') || nfSlug.startsWith('car') || nfSlug === 'motorcycle') {
    return 'buy';
  }
  if (nfSlug === 'construction-partnership') return 'partnership';
  if (nfSlug === 'pre-sale-services') return 'buy';
  if (verticalForSlug(nfSlug) === 'services') return 'service';
  if (verticalForSlug(nfSlug) === 'jobs') return 'hiring';
  return 'buy';
}

function parsePriceToman(priceText: string | undefined): number | undefined {
  if (!priceText?.trim()) return undefined;
  const raw = toAsciiDigits(priceText);
  if (/اجاره\s*:/i.test(raw)) {
    const rent = raw.replace(/.*اجاره\s*:\s*/i, '').replace(/[^\d]/g, '');
    const n = Number(rent);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  const digits = raw.replace(/[^\d]/g, '');
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (/میلیارد/i.test(priceText)) return n * 1_000_000_000;
  if (/میلیون/i.test(priceText)) return n * 1_000_000;
  return n;
}

function propertyKindForSlug(nfSlug: string): string | undefined {
  if (nfSlug.includes('apartment')) return 'apartment';
  if (nfSlug.includes('villa')) return 'villa';
  if (nfSlug.includes('land')) return 'land';
  if (nfSlug.includes('office')) return 'office';
  if (nfSlug.includes('shop')) return 'shop';
  if (nfSlug.includes('industrial')) return 'industrial';
  if (nfSlug.includes('suite')) return 'suite';
  return undefined;
}

/** Convert a Divar listing row into a Persian need-seeker user message. */
export function divarListingToNeedInput(
  post: Omit<DivarNeedSourcePost, 'nfSlug' | 'citySlug' | 'vertical'>,
  ctx: { nfSlug: string; variant?: number }
): string {
  const opener = NEED_OPENERS[(ctx.variant ?? 0) % NEED_OPENERS.length]!;
  const deal = inferNeedDealType(ctx.nfSlug);
  const lines: string[] = [];

  if (deal === 'buy') lines.push(`${opener} ${post.title}`);
  else if (deal === 'rent' || deal === 'rent_daily') lines.push(`${opener} ${post.title} برای اجاره`);
  else if (deal === 'service') lines.push(`${opener} ${post.title}`);
  else lines.push(`${opener} ${post.title}`);

  if (post.district?.trim() && post.city?.trim()) {
    lines.push(`محدوده: ${post.district.trim()}، ${post.city.trim()}`);
  } else if (post.city?.trim()) {
    lines.push(`شهر: ${post.city.trim()}`);
  }

  const budget = parsePriceToman(post.priceText);
  if (budget != null) {
    if (deal === 'rent' || deal === 'rent_daily' || /اجاره/i.test(post.priceText ?? '')) {
      lines.push(`اجاره حدود ${post.priceText?.trim() ?? ''}`);
    } else {
      lines.push(`بودجه حدود ${post.priceText?.trim() ?? ''}`);
    }
  }

  return lines.join('\n').trim();
}

export function buildDivarNeedLabels(
  input: string,
  nfSlug: string,
  opts?: { fallbackCity?: string; fallbackCitySlug?: string; priceText?: string }
): DatasetLabels {
  const enriched = enrichParsedIntent({
    ...parseIntentFromText(input),
    rawText: input,
    categorySlug: nfSlug,
  });

  const labels = labelsFromParsedIntent(enriched);
  const dealType = inferNeedDealType(nfSlug);
  const propertyKind = propertyKindForSlug(nfSlug);
  const budgetMax =
    parsePriceToman(opts?.priceText) ??
    labels.budgetMax ??
    parsePriceToman(enriched.budgetMax != null ? String(enriched.budgetMax) : undefined);

  const neighborhoodSlug =
    enriched.neighborhoodSlug && !/[\u0600-\u06FF\s]/.test(enriched.neighborhoodSlug)
      ? enriched.neighborhoodSlug
      : undefined;

  return {
    ...labels,
    intentType: inferNeedIntentType(nfSlug),
    categorySlug: nfSlug,
    city:
      cityToSlug(labels.city) ??
      cityToSlug(enriched.city) ??
      cityToSlug(opts?.fallbackCity) ??
      opts?.fallbackCitySlug,
    budgetMax,
    entities: {
      ...labels.entities,
      ...(dealType ? { dealType } : {}),
      ...(propertyKind ? { propertyKind } : {}),
      ...(enriched.entities?.area ? { area: enriched.entities.area } : {}),
      ...(enriched.entities?.brand ? { brand: enriched.entities.brand } : {}),
    },
    neighborhoodSlug,
  };
}

export function buildDivarNeedFixture(
  post: DivarNeedSourcePost,
  variant = 0
): DatasetFixture {
  const input = divarListingToNeedInput(post, { nfSlug: post.nfSlug, variant });
  const labels = buildDivarNeedLabels(input, post.nfSlug, {
    fallbackCity: post.city,
    fallbackCitySlug: post.citySlug,
    priceText: post.priceText,
  });
  const root = getCategoryPath(post.nfSlug)[0]?.slug ?? post.nfSlug;

  return {
    id: `divar-${post.nfSlug}-${normalizeInput(post.title).slice(0, 48)}-${variant}`,
    input,
    labels,
    meta: {
      source: 'captured',
      vertical: post.vertical,
      tags: ['divar', 'need-crawl', post.nfSlug, post.citySlug, root],
    },
  };
}

export function verticalForDivarSlug(nfSlug: string): ClassifierVertical {
  return verticalForSlug(nfSlug);
}
