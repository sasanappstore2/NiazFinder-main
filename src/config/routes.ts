/**
 * Canonical route builder — single source of truth for ALL navigation URLs.
 *
 * URL contract (locked, Divar-inspired):
 *   /                                          — home
 *   /s/{location}                              — search root (location ∈ {iran} ∪ city slugs)
 *   /s/{location}/{category}                   — search + category
 *   /s/{location}/{parent}/{category}          — search + nested category
 *   /s/iran?cities=tehran,mashhad              — multi-city scope (Divar ?cities=)
 *   /v/{slug}/{id}                             — listing detail (Divar /v/ parity)
 *   /pro/{id}                                  — business profile (Divar /pro/ parity)
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
  COUNTRY_SLUG,
  getCitySlugsExcept,
  isCitySlug,
  isLocationSlug,
} from './locations';
import { slugifyTitle } from '@/lib/seo/slug';

// ─────────────────────────────────────────────────────────────────────────────
// Static route templates
// ─────────────────────────────────────────────────────────────────────────────

export const ROUTES = {
  home:                          '/',
  login:                         '/login',
  register:                      '/register',

  /** Search root — country (iran) or any city. */
  searchRoot:                    '/s',

  /** Listing detail — canonical: /v/{slug}/{id} (Divar /v/ parity). */
  listingDetail:               '/v/[slug]/[id]',
  /** Legacy listing detail (redirects to /v/). */
  listingDetailLegacy:         '/v/[id]',

  /** Business profile — canonical: /pro/{id} (Divar /pro/ parity). */
  proProfile:                  '/pro/[id]',

  /** @deprecated Use listingDetail — kept for redirect handlers. */
  needDetail:                  '/n/[slug]/[id]',
  needDetailLegacy:            '/n/[id]',
  needNew:                     '/post',
  needIntake:                  '/post',
  needPropose:                 '/n/[id]/propose',

  /** @deprecated Use proProfile — kept for redirect handlers. */
  businessDetail:              '/b/[id]',
  businessReview:                '/b/[id]/review',
  businessInvite:                '/b/[id]/invite',

  /** Help / support. */
  help:                          '/help',

  /** App. */
  dashboard:                     '/dashboard',
  dashboardSettings:             '/dashboard/settings',
  dashboardReferral:             '/dashboard/referral',
  dashboardNotificationSettings: '/dashboard/settings/notifications',
  chat:                          '/chat',
  chatNew:                       '/chat/new',
  chatConversation:              '/chat/[conversationId]',
  notifications:                 '/notifications',
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
  compare:                       '/compare',
} as const;

export type RouteKey = keyof typeof ROUTES;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function fillParams(template: string, params: Record<string, string>): string {
  let url = template;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`[${key}]`, encodeURIComponent(value));
  }
  return url;
}

/** Build /s/{location} prefix; falls back to /s/iran if invalid/empty. */
function locationPrefix(location?: string | null): string {
  if (!location) return `/s/${COUNTRY_SLUG}`;
  const slug = location.toLowerCase();
  return isLocationSlug(slug) ? `/s/${slug}` : `/s/${COUNTRY_SLUG}`;
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
    const prefix = locationPrefix(opts.location);
    const segments: string[] = [];

    if (opts.category) {
      const cat = opts.category.toLowerCase();
      if (isCategorySlug(cat)) {
        if (opts.parentCategory) {
          const parent = opts.parentCategory.toLowerCase();
          const catRow = getCategoryBySlug(cat);
          if (catRow && catRow.parentSlug === parent && isCategorySlug(parent)) {
            segments.push(parent, cat);
          } else {
            segments.push(cat);
          }
        } else {
          segments.push(cat);
        }
      }
    }

    const path = segments.length > 0
      ? `${prefix}/${segments.map(encodeURIComponent).join('/')}`
      : prefix;

    return `${path}${serializeFiltersString(opts.filters)}`;
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

  /** /pro/{id} — business profile (Divar /pro/ parity). */
  pro(id: string): string {
    return `/pro/${encodeURIComponent(id)}`;
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
  needIntake:         () => ROUTES.needIntake,
  needPropose:        (id: string) => `/n/${encodeURIComponent(id)}/propose`,

  /** @deprecated Alias for pro() — kept for existing callers. */
  business(id: string): string {
    return routeBuilder.pro(id);
  },
  businessReview:     (id: string) => `/b/${encodeURIComponent(id)}/review`,
  businessInvite:     (id: string) => `/b/${encodeURIComponent(id)}/invite`,
  compare:            () => ROUTES.compare,

  // ── App
  dashboard:          () => ROUTES.dashboard,
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
      filters: {
        type: 'need',
        ...(params?.search ? { q: params.search } : {}),
      },
    });
  }
  if (view === 'browse-specialists') {
    return routeBuilder.search({
      filters: {
        type: 'business',
        ...(params?.search ? { q: params.search } : {}),
      },
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
    case 'admin':                return routeBuilder.admin();
    case 'profile':              return routeBuilder.dashboard();
    case 'pricing':              return routeBuilder.pricing();
    case 'compare-specialists':  return routeBuilder.compare();
    case 'referral':             return routeBuilder.referral();
    case 'notification-settings':return routeBuilder.notificationSettings();
    case 'help':                 return routeBuilder.help();
    default:                     return '/';
  }
}

// Re-exports for consumers that still depend on these names
export type { BrowseFilters, ListingType, SortKey };
export { LEGACY_VIEW_PATHS } from './_legacy-view-paths';

export function buildRoute(routeKey: RouteKey, params?: Record<string, string>): string {
  const template = ROUTES[routeKey];
  if (!params) return template;
  return fillParams(template, params);
}
