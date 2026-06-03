import { parseBrowsePath } from '@/lib/search/browse-path';
import { resolveBusinessSegments } from '@/lib/search/business-segments-resolve';
import { parseMarketplacePath, isMarketplaceLocationSegment } from '@/config/market-routes';

export type PageDimensions = {
  market?: 'need' | 'business';
  citySlug?: string;
  categorySlug?: string;
  segmentKind?: 'occupation' | 'online-store' | 'need';
  pageKind?: string;
  needCategory?: string;
  occupation?: string;
  onlineStore?: string;
};

function cleanPath(pathname: string): string {
  const path = pathname.split('?')[0]?.split('#')[0] ?? '/';
  return path.startsWith('/') ? path : `/${path}`;
}

/** Central path → business dimension parser for analytics. */
export function parsePageContext(pathname: string): PageDimensions {
  const path = cleanPath(pathname);
  const dims: PageDimensions = {};

  if (path.startsWith('/n/') || path === '/n') {
    dims.market = 'need';
    const ctx = parseBrowsePath(path);
    if (ctx.citySlug) dims.citySlug = ctx.citySlug;
    if (ctx.categorySlug) {
      dims.categorySlug = ctx.categorySlug;
      dims.needCategory = ctx.categorySlug;
      dims.segmentKind = 'need';
    }
    dims.pageKind = 'browse-need';
    return dims;
  }

  if (path.startsWith('/b/') || path === '/b') {
    const parsed = parseMarketplacePath(path);
    if (parsed?.market === 'business' && parsed.parts.length === 1) {
      const slug = parsed.parts[0]!.toLowerCase();
      if (!isMarketplaceLocationSegment(slug)) {
        dims.pageKind = 'business-profile';
        dims.market = 'business';
        return dims;
      }
    }

    dims.market = 'business';
    if (parsed?.market === 'business' && parsed.parts.length > 0) {
      const [rawLoc, ...segments] = parsed.parts;
      const resolved = resolveBusinessSegments(rawLoc, segments);
      if (resolved.kind !== 'invalid-location' && resolved.kind !== 'invalid-segments') {
        if ('location' in resolved && resolved.location.kind === 'city') {
          dims.citySlug = resolved.location.city.slug;
        }
        if (resolved.kind === 'profile-category') {
          dims.categorySlug = resolved.categorySlug;
          dims.segmentKind = resolved.segmentKind;
          if (resolved.segmentKind === 'occupation') dims.occupation = resolved.categorySlug;
          if (resolved.segmentKind === 'online-store') dims.onlineStore = resolved.categorySlug;
        } else if (resolved.kind === 'need-category') {
          dims.categorySlug = resolved.categorySlug;
          dims.segmentKind = 'need';
          dims.needCategory = resolved.categorySlug;
        } else if (resolved.kind === 'parent-child') {
          dims.categorySlug = resolved.categorySlug;
          dims.segmentKind = resolved.segmentKind;
          if (resolved.segmentKind === 'occupation') dims.occupation = resolved.categorySlug;
          if (resolved.segmentKind === 'online-store') dims.onlineStore = resolved.categorySlug;
        }
      }
    }
    dims.pageKind = 'browse-business';
    return dims;
  }

  if (path.startsWith('/v/')) {
    dims.pageKind = 'need-detail';
    dims.market = 'need';
    return dims;
  }

  if (path.startsWith('/chat')) {
    dims.pageKind = 'chat';
    return dims;
  }
  if (path.startsWith('/post')) {
    dims.pageKind = 'post';
    return dims;
  }
  if (path.startsWith('/dashboard')) {
    dims.pageKind = 'dashboard';
    return dims;
  }
  if (path === '/') {
    dims.pageKind = 'home';
    return dims;
  }

  dims.pageKind = 'other';
  return dims;
}

export function parseReferrerDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function parseUtm(searchParams: URLSearchParams | Record<string, string | undefined>) {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key) ?? undefined;
    return searchParams[key];
  };
  return {
    utmSource: get('utm_source'),
    utmMedium: get('utm_medium'),
    utmCampaign: get('utm_campaign'),
    utmContent: get('utm_content'),
    utmTerm: get('utm_term'),
  };
}

export function acquisitionSource(referrer: string | null | undefined, utmSource?: string | null): string {
  if (utmSource) return utmSource;
  const domain = parseReferrerDomain(referrer);
  if (!domain) return '(direct)';
  return domain;
}

export function acquisitionMedium(utmMedium?: string | null, referrer?: string | null): string {
  if (utmMedium) return utmMedium;
  if (!referrer) return '(none)';
  const domain = parseReferrerDomain(referrer);
  if (!domain) return '(none)';
  if (domain.includes('google')) return 'organic';
  if (domain.includes('instagram') || domain.includes('telegram') || domain.includes('twitter')) return 'social';
  return 'referral';
}

const SOCIAL_DOMAINS = ['instagram', 'telegram', 'twitter', 'facebook', 'linkedin', 't.co', 'x.com'];

/** GA-style channel grouping from source + medium strings. */
export function acquisitionChannelLabel(
  source: string,
  medium: string
): string {
  const s = source.toLowerCase();
  const m = medium.toLowerCase();

  if (s === '(direct)' && (m === '(none)' || m === '(not set)')) return 'Direct';
  if (m.includes('cpc') || m.includes('ppc') || m.includes('paid') || m.includes('cpm')) return 'Paid Search';
  if (m === 'organic' || (s.includes('google') && !m.includes('cpc'))) return 'Organic Search';
  if (m === 'email' || m.includes('newsletter')) return 'Email';
  if (m === 'social' || SOCIAL_DOMAINS.some((d) => s.includes(d))) return 'Social';
  if (m === 'referral' || (s !== '(direct)' && m === '(none)')) return 'Referral';
  if (m.includes('affiliate')) return 'Affiliates';
  return 'Other';
}

export const ACQUISITION_CHANNELS = [
  'Direct',
  'Organic Search',
  'Paid Search',
  'Social',
  'Email',
  'Referral',
  'Affiliates',
  'Other',
] as const;

export type AcquisitionChannel = 'direct' | 'organic' | 'paid' | 'social' | 'referral' | 'email';

export function acquisitionChannel(input: {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
}): AcquisitionChannel {
  const medium = (input.utmMedium ?? '').toLowerCase();
  if (medium.includes('cpc') || medium.includes('ppc') || medium.includes('paid')) return 'paid';
  if (medium.includes('email') || medium.includes('newsletter')) return 'email';
  if (medium.includes('social') || medium.includes('instagram') || medium.includes('telegram')) return 'social';
  if (input.utmSource) return 'referral';
  const domain = parseReferrerDomain(input.referrer);
  if (!domain) return 'direct';
  if (domain.includes('google') || domain.includes('bing') || domain.includes('yahoo')) return 'organic';
  if (domain.includes('instagram') || domain.includes('telegram') || domain.includes('twitter') || domain.includes('t.co'))
    return 'social';
  return 'referral';
}

export const CHANNEL_LABELS: Record<AcquisitionChannel, string> = {
  direct: 'مستقیم',
  organic: 'ارگانیک',
  paid: 'پولی',
  social: 'شبکه اجتماعی',
  referral: 'ارجاع',
  email: 'ایمیل',
};
