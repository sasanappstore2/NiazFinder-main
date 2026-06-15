/**
 * Canonical route builder — single source of truth for ALL navigation URLs.
 *
 * URL contract (NiazFinder):
 *   /n/{location}                              — needs marketplace
 *   /b/{location}                              — businesses marketplace
 *   /n|b/{location}/{category}                 — category browse
 *   /v/{slug}/{id}                             — need listing detail
 *   /b/{profileSlug}                           — business public profile
 *   /s/**                                      — legacy → 301 to /n or /b
 *   /post                                      — post a need
 *   /chat, /chat/new, /chat/{convId}           — chat
 *   /help                                      — support
 *
 * Legacy aliases (301-redirected):
 *   /n/{slug}/{id}  →  /v/{slug}/{id}
 *   /b/{id}         →  /pro/{id}
 *   /browse/...     →  /s/...
 *
 * Filters live ONLY in query params (kebab-case for parity with Divar):
 *   ?type, ?q, ?cities, ?provinces, ?price, ?verified, ?has-photo, ?urgent,
 *   ?recent, ?sort, ?status
 *
 * IMPORTANT: NEVER hardcode marketplace paths in components — always go through
 * `routeBuilder`. This guarantees URL consistency across the app, easy refactor,
 * and clean SEO canonicalisation.
 */

import type { BrowseFilters, ListingType, SortKey } from '@/lib/filters/parser';
import { serializeFiltersString } from '@/lib/filters/parser';
import { getCategoryBySlug, isCategorySlug } from './categories';
import {
  isAncestorOccupation,
  isOccupationSlug,
  isPickableOccupationSlug,
} from './business-occupations';
import {
  isAncestorOnlineStore,
  isOnlineStoreSlug,
  isPickableOnlineStoreSlug,
} from './online-stores';
import {
  COUNTRY_SLUG,
  getCitySlugsExcept,
  isCitySlug,
  isLocationSlug,
} from './locations';
import { slugifyTitle } from '@/lib/seo/slug';
import {
  type BrowseMarket,
  isMarketplaceLocationSegment,
  marketFromListingType,
  marketplaceLocationPrefix,
  MARKET_PREFIX,
} from './market-routes';

// ─────────────────────────────────────────────────────────────────────────────
// Static route templates
// ─────────────────────────────────────────────────────────────────────────────

export const ROUTES = {
  home:                          '/',
  login:                         '/login',
  register:                      '/register',

  /** @deprecated Legacy — redirects to /n/iran */
  searchRoot:                    '/s',
  needMarketRoot:                '/n',
  businessMarketRoot:            '/b',

  /** Listing detail — canonical: /v/{slug}/{id} (Divar /v/ parity). */
  listingDetail:               '/v/[slug]/[id]',
  /** Legacy listing detail (redirects to /v/). */
  listingDetailLegacy:         '/v/[id]',

  /** Business profile — canonical: /pro/{id} (Divar /pro/ parity). */
  proProfile:                  '/pro/[id]',
  /** Business owner edit panel — /pro/{id}/edit */
  proEdit:                     '/pro/[id]/edit',

  /** @deprecated Use listingDetail — kept for redirect handlers. */
  needDetail:                  '/n/[slug]/[id]',
  needDetailLegacy:            '/n/[id]',
  needNew:                     '/post',
  needEdit:                    '/post/edit/[id]',
  needIntake:                  '/post',
  needPropose:                 '/n/[id]/propose',

  /** @deprecated Use proProfile — kept for redirect handlers. */
  businessDetail:              '/b/[id]',
  businessReview:                '/b/[id]/review',
  businessInvite:                '/b/[id]/invite',

  /** Help / support. */
  help:                          '/help',

  /** Business owner manage panel (onboarding + edit). */
  myBusiness:                    '/my-business',

  /** App. */
  dashboard:                     '/dashboard',
  dashboardSettings:             '/dashboard/settings',
  dashboardReferral:             '/dashboard/referral',
  dashboardNotificationSettings: '/dashboard/settings/notifications',
  chat:                          '/chat',
  chatNew:                       '/chat/new',
  chatConversation:              '/chat/[conversationId]',
  notifications:                 '/notifications',
  bookmarks:                     '/bookmarks',
  admin:                         '/admin',
  adminUsers:                    '/admin/users',
  superAdmin:                    '/super-admin',
  profile:                       '/profile/[id]',
  editProfile:                   '/edit-profile',
  pricing:                       '/pricing',
  referral:                      '/referral',
  notificationSettings:          '/notification-settings',
  socialFeed:                    '/social-feed',
  discover:                      '/discover',
  createPost:                    '/create-post',
  submitReview:                  '/submit-review',
} as const;

export type RouteKey = keyof typeof ROUTES;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function fillParams(template: string, params: Record<string, string>): string {
  let url = template;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`[${key}]`, encodeURIComponent(String(value)));
  }
  return url;
}

function resolveMarketFromOpts(opts: SearchUrlOptions): BrowseMarket {
  if (opts.market) return opts.market;
  return marketFromListingType(opts.filters?.type);
}

function filtersForMarket(
  filters: Partial<BrowseFilters> | undefined,
  market: BrowseMarket
): Partial<BrowseFilters> | undefined {
  if (!filters) return undefined;
  const next = { ...filters };
  const implied = marketFromListingType(next.type);
  if (next.type === implied || next.type === 'all') {
    const { type: _t, ...rest } = next;
    return Object.keys(rest).length ? rest : undefined;
  }
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route builder (the ONE entrypoint for all marketplace URLs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for the unified `search()` builder.
 * - `location`  defaults to country (`iran`) when omitted
 * - `category`  may be top-level OR nested; the builder verifies parent-child
 *               relationship to decide between flat vs nested URL
 * - `parentCategory` (optional) hint to force the `/{loc}/{parent}/{cat}` form
 *   when the parent is a real ancestor in the canonical tree
 */
export interface SearchUrlOptions {
  location?: string | null;
  category?: string | null;
  parentCategory?: string | null;
  /** Defaults from filters.type or `need`. */
  market?: BrowseMarket;
  filters?: Partial<BrowseFilters>;
}

export const routeBuilder = {
  // ── Static
  home:               () => ROUTES.home,
  login:              () => ROUTES.login,
  register:           () => ROUTES.register,
  help:               () => ROUTES.help,

  // ── Search / browse (Divar /s/iran style) ─────────────────────────────────
  /**
   * Universal search URL builder.
   *
   * Examples:
   *   search()                                       → /s/iran
   *   search({ filters:{type:'need'} })              → /s/iran?type=need
   *   search({ location:'mashhad' })                 → /s/mashhad
   *   search({ location:'iran', category:'real-estate' })       → /s/iran/real-estate
   *   search({ location:'mashhad', parentCategory:'real-estate', category:'residential-sale' })
   *                                                  → /s/mashhad/real-estate/residential-sale
   *   search({ filters:{cities:['tehran','mashhad']} })
   *                                                  → /s/iran?cities=tehran,mashhad
   */
  search(opts: SearchUrlOptions = {}): string {
    const market = resolveMarketFromOpts(opts);
    const prefix = marketplaceLocationPrefix(opts.location, market);
    const segments: string[] = [];

    if (opts.category) {
      const cat = opts.category.toLowerCase();
      const parent = opts.parentCategory?.toLowerCase();

      if (market === 'business' && (isOccupationSlug(cat) || isOnlineStoreSlug(cat))) {
        if (parent && (isAncestorOccupation(parent, cat) || isAncestorOnlineStore(parent, cat))) {
          segments.push(parent, cat);
        } else {
          segments.push(cat);
        }
      } else if (isCategorySlug(cat)) {
        if (parent) {
          const catRow = getCategoryBySlug(cat);
          if (catRow && catRow.parentSlug === parent && isCategorySlug(parent)) {
            segments.push(parent, cat);
          } else {
            segments.push(cat);
          }
        } else {
          segments.push(cat);
        }
      } else if (
        market === 'business' &&
        (isPickableOccupationSlug(cat) || isPickableOnlineStoreSlug(cat))
      ) {
        segments.push(cat);
      }
    }

    const path = segments.length > 0
      ? `${prefix}/${segments.map(encodeURIComponent).join('/')}`
      : prefix;

    return `${path}${serializeFiltersString(filtersForMarket(opts.filters, market))}`;
  },

  // ── Back-compat shortcuts (mapped onto search()) ──────────────────────────
  /** /s/iran?[filters] — search across all of Iran. */
  browseAll(filters?: Partial<BrowseFilters>): string {
    return routeBuilder.search({ filters });
  },

  /** /s/iran/{category}?[filters] */
  browse(category: string, filters?: Partial<BrowseFilters>): string {
    return routeBuilder.search({ category, filters });
  },

  /** /s/iran/{parent}/{category}?[filters] (validates parent is real ancestor). */
  browseNested(parent: string, category: string, filters?: Partial<BrowseFilters>): string {
    return routeBuilder.search({ parentCategory: parent, category, filters });
  },

  /** /s/{city}/{category}?[filters] — falls back to ?cities= when city unknown. */
  cityBrowse(city: string, category: string, filters?: Partial<BrowseFilters>): string {
    if (!isCitySlug(city)) {
      return routeBuilder.search({
        category,
        filters: { ...filters, cities: [city] },
      });
    }
    return routeBuilder.search({ location: city, category, filters });
  },

  /**
   * Multi-city search on /s/iran?cities=a,b,c — Divar parity.
   * Example: searchCities(['tehran','mashhad']) → /s/iran?cities=tehran,mashhad
   */
  searchCities(cities: string[], opts: Omit<SearchUrlOptions, 'location' | 'filters'> & { filters?: Partial<BrowseFilters> } = {}): string {
    return routeBuilder.search({
      ...opts,
      location: COUNTRY_SLUG,
      filters: { ...opts.filters, cities },
    });
  },

  /**
   * All cities except the given ones — Divar "all except mashhad" pattern.
   * Example: searchAllExcept('mashhad', { category: 'real-estate' })
   */
  searchAllExcept(excludedCity: string, opts: Omit<SearchUrlOptions, 'location' | 'filters'> & { filters?: Partial<BrowseFilters> } = {}): string {
    return routeBuilder.search({
      ...opts,
      location: COUNTRY_SLUG,
      filters: { ...opts.filters, cities: getCitySlugsExcept(excludedCity) },
    });
  },

  // ── Detail pages (Divar /v/ + /pro/) ──────────────────────────────────────
  /**
   * /v/{slug}/{id} — canonical listing URL (pass `title` for SEO slug).
   * Without title, returns legacy /v/{id} which redirects to canonical.
   */
  listing(id: string, title?: string | null): string {
    if (title) {
      const slug = slugifyTitle(title);
      return `/v/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`;
    }
    return `/v/${encodeURIComponent(id)}`;
  },

  /** /b/{profileSlug} — public business profile. */
  businessProfile(
    slug: string,
    opts?: { from?: string; tab?: string; /** @deprecated use vitrineCategory */ category?: string; vitrineCategory?: string }
  ): string {
    const base = `/b/${encodeURIComponent(slug)}`;
    const params = new URLSearchParams();
    if (opts?.tab) params.set('tab', opts.tab);
    const vitrine = opts?.vitrineCategory ?? opts?.category;
    if (vitrine) params.set('vitrineCategory', vitrine);
    if (opts?.from) params.set('from', opts.from);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  },

  /** Products tab on business profile (avoids legacy ?category= marketplace redirects). */
  businessVitrine(profileSlug: string, vitrineCategoryId?: string): string {
    return routeBuilder.businessProfile(profileSlug, {
      tab: 'products',
      vitrineCategory: vitrineCategoryId,
    });
  },

  /** /b/{profileSlug}/p/{offerId} — product detail on business profile. */
  businessProduct(profileSlug: string, offerId: string): string {
    return `/b/${encodeURIComponent(profileSlug)}/p/${encodeURIComponent(offerId)}`;
  },

  /** @deprecated Use businessProfile(slug) — /pro kept for redirects. */
  pro(id: string): string {
    return `/pro/${encodeURIComponent(id)}`;
  },

  /** /pro/{id}/edit — business owner management panel. */
  businessEdit(slug: string): string {
    return fillParams(ROUTES.proEdit, { id: slug });
  },

  /**
   * SEO business profile: /{city}/{category}/{slug}
   * Example: /tehran/dentist/dr-nikbakht
   */
  businessSeo(city: string, category: string, slug: string): string {
    return `/${encodeURIComponent(city)}/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`;
  },

  /** @deprecated Alias for listing() — kept for existing callers. */
  need(id: string, title?: string | null): string {
    return routeBuilder.listing(id, title);
  },
  needNew:            () => ROUTES.needNew,
  needEdit:           (id: string) => `/post/edit/${encodeURIComponent(id)}`,
  needIntake:         () => ROUTES.needIntake,
  needPropose:        (id: string) => `/propose/${encodeURIComponent(id)}`,

  /** Business profile by user id — callers should prefer businessProfile(slug). */
  business(id: string, opts?: { from?: string }): string {
    return routeBuilder.pro(id);
  },
  businessReview:     (id: string) => `/b/${encodeURIComponent(id)}/review`,
  businessInvite:     (id: string) => `/b/${encodeURIComponent(id)}/invite`,

  // ── App
  myBusiness:         () => ROUTES.myBusiness,
  dashboard:          () => ROUTES.dashboard,
  dashboardTab:       (tab: string) =>
    `${ROUTES.dashboard}?tab=${encodeURIComponent(tab)}`,
  chat:               () => ROUTES.chat,
  chatNew:            () => ROUTES.chatNew,
  chatWithUser:       (
    userId: string,
    opts?: { requestId?: string; returnTo?: string }
  ) => {
    const params = new URLSearchParams({ userId });
    if (opts?.requestId) params.set('requestId', opts.requestId);
    if (opts?.returnTo) params.set('returnTo', opts.returnTo);
    return `${ROUTES.chatNew}?${params.toString()}`;
  },
  chatConversation:   (conversationId: string) =>
    fillParams(ROUTES.chatConversation, { conversationId }),
  notifications:      () => ROUTES.notifications,
  bookmarks:          () => ROUTES.bookmarks,
  admin:              () => ROUTES.admin,
  adminUsers:         () => ROUTES.adminUsers,
  superAdmin:         () => ROUTES.superAdmin,
  profile:            (id: string) => fillParams(ROUTES.profile, { id }),
  editProfile:        () => ROUTES.editProfile,
  pricing:            () => ROUTES.pricing,
  referral:           () => ROUTES.referral,
  notificationSettings: () => ROUTES.notificationSettings,
  socialFeed:         () => ROUTES.socialFeed,
  discover:           () => ROUTES.discover,
  createPost:         () => ROUTES.createPost,
  submitReview:       () => ROUTES.submitReview,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Legacy SPA-view → canonical path migration (used by old `navigateTo` callers)
// ─────────────────────────────────────────────────────────────────────────────

export function legacyViewToPath(view: string, params?: Record<string, string>): string {
  if (view === 'request-detail' && params?.id) return routeBuilder.need(params.id, params.title);
  if (view === 'specialist-profile' && params?.id) return routeBuilder.business(params.id);
  if (view === 'submit-proposal' && (params?.requestId || params?.id)) {
    return routeBuilder.needPropose(params.requestId ?? params.id!);
  }
  if (view === 'submit-review' && params?.id) return routeBuilder.businessReview(params.id);

  if (view === 'browse-requests') {
    return routeBuilder.search({
      market: 'need',
      ...(params?.search ? { filters: { q: params.search } } : {}),
    });
  }
  if (view === 'browse-specialists') {
    return routeBuilder.search({
      market: 'business',
      ...(params?.search ? { filters: { q: params.search } } : {}),
    });
  }

  switch (view) {
    case 'home':                 return routeBuilder.home();
    case 'login':                return routeBuilder.login();
    case 'register':             return routeBuilder.register();
    case 'post-need':            return routeBuilder.needNew();
    case 'dashboard':            return routeBuilder.dashboard();
    case 'messages':             return routeBuilder.chat();
    case 'notifications':        return routeBuilder.notifications();
    case 'bookmarks':            return routeBuilder.bookmarks();
    case 'admin':                return routeBuilder.admin();
    case 'profile':              return routeBuilder.dashboard();
    case 'pricing':              return routeBuilder.pricing();
    case 'compare-specialists':
      return routeBuilder.search({ market: 'business' });
    case 'referral':             return routeBuilder.referral();
    case 'notification-settings':return routeBuilder.notificationSettings();
    case 'help':                 return routeBuilder.help();
    default:                     return '/';
  }
}

// Re-exports for consumers that still depend on these names
export type { BrowseFilters, ListingType, SortKey };
export type { BrowseMarket } from './market-routes';
export { MARKET_PREFIX, marketFromListingType } from './market-routes';
export { LEGACY_VIEW_PATHS } from './_legacy-view-paths';

export function buildRoute(routeKey: RouteKey, params?: Record<string, string>): string {
  const template = ROUTES[routeKey];
  if (!params) return template;
  return fillParams(template, params);
}

/** `/b/{profileSlug}/p/{offerId}` — public product detail (immersive; no mobile bottom nav). */
const BUSINESS_PRODUCT_DETAIL_PATH = /^\/b\/[^/]+\/p\/[^/]+\/?$/;

export function isBusinessProductDetailPath(pathname: string): boolean {
  return BUSINESS_PRODUCT_DETAIL_PATH.test(pathname);
}

const BUSINESS_PUBLIC_PROFILE_PATH = /^\/b\/[^/]+\/?$/;

/** Public business profile (`/b/{slug}`), not product detail. */
export function isBusinessPublicProfilePath(pathname: string): boolean {
  return BUSINESS_PUBLIC_PROFILE_PATH.test(pathname);
}

/** Profile pages that use full-bleed brand aura (excludes marketplace + product detail). */
export function isBusinessProfileAuraPath(pathname: string): boolean {
  if (isBusinessProductDetailPath(pathname)) return false;
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'b' && parts.length === 2) {
    if (isMarketplaceLocationSegment(parts[1]!)) return false;
    return true;
  }
  return parts.length === 3;
}
