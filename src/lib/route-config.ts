/**
 * @deprecated Use `@/config/routes` (`routeBuilder`, `ROUTES`) instead.
 */
export {
  routeBuilder,
  ROUTES,
  buildRoute,
  legacyViewToPath,
  LEGACY_VIEW_PATHS,
  type RouteKey,
} from '@/config/routes';

import { routeBuilder } from '@/config/routes';

export const ROUTE_GROUPS = {
  auth: ['login', 'register'],
  marketplace: ['need', 'business', 'post-need'],
  dashboard: ['dashboard', 'profile', 'pricing', 'referral', 'notification-settings'],
  chat: ['messages'],
  admin: ['admin'],
} as const;

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  admin: ['ADMIN', 'SUPER_ADMIN'],
  dashboard: ['CLIENT', 'SPECIALIST', 'ADMIN', 'SUPER_ADMIN'],
  'submit-proposal': ['SPECIALIST'],
  'post-need': ['CLIENT', 'ADMIN', 'SUPER_ADMIN'],
  profile: ['CLIENT', 'SPECIALIST', 'ADMIN', 'SUPER_ADMIN'],
  referral: ['CLIENT', 'SPECIALIST', 'ADMIN', 'SUPER_ADMIN'],
  'notification-settings': ['CLIENT', 'SPECIALIST', 'ADMIN', 'SUPER_ADMIN'],
  messages: ['CLIENT', 'SPECIALIST', 'ADMIN', 'SUPER_ADMIN'],
};

export const ROUTE_METADATA: Record<string, { title: string; description: string }> = {
  home: {
    title: 'نیاز فایندر - پیدا کردن بهترین متخصص‌ها',
    description: 'نیاز خود را ثبت کنید و بهترین متخصص‌ها را در هر حوزه‌ای پیدا کنید.',
  },
  login: { title: 'ورود به حساب کاربری', description: 'وارد حساب کاربری خود شوید.' },
  register: { title: 'ثبت‌نام', description: 'ثبت‌نام در نیاز فایندر.' },
  'post-need': { title: 'ثبت نیاز جدید', description: 'نیاز خود را ثبت کنید.' },
  'browse-requests': { title: 'مرور نیازها', description: 'نیازهای ثبت‌شده را مرور کنید.' },
  'browse-specialists': { title: 'مرور کسب‌وکارها', description: 'کسب‌وکارها را مرور کنید.' },
};

export function hasRoutePermission(routeView: string, userRole?: string): boolean {
  const requiredRoles = ROUTE_PERMISSIONS[routeView];
  if (!requiredRoles) return true;
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

export function getRouteGroup(view: string): string | null {
  for (const [group, views] of Object.entries(ROUTE_GROUPS)) {
    if ((views as readonly string[]).includes(view)) return group;
  }
  return null;
}

/** @deprecated */
export function buildRouteFromConfig(
  routeKey: string,
  _params?: Record<string, string>
): string {
  const templates: Record<string, string> = {
    postNeed: routeBuilder.needNew(),
    browseRequests: routeBuilder.browseAll({ type: 'need' }),
    browseSpecialists: routeBuilder.browseAll({ type: 'business' }),
    messages: routeBuilder.chat(),
  };
  return templates[routeKey] ?? routeBuilder.home();
}
