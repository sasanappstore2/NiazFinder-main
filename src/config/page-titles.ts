/**
 * Static route → Persian page title for sr-only H1 in AppShell.
 * Marketplace (/n/*, /b/*) and pages with visible PageChrome set H1 in their own pages.
 */
import { SITE_LABELS } from '@/config/site-labels';

const EXACT: Record<string, string> = {
  '/': SITE_LABELS.siteTagline,
  '/discover': SITE_LABELS.discover,
  '/dashboard': SITE_LABELS.dashboard,
  '/messages': SITE_LABELS.messages,
  '/notifications': SITE_LABELS.notifications,
  '/bookmarks': SITE_LABELS.bookmarks,
  '/pricing': SITE_LABELS.pricing,
  '/faq': SITE_LABELS.faq,
  '/edit-profile': SITE_LABELS.editProfile,
  '/chat': SITE_LABELS.chat,
  '/chat/new': SITE_LABELS.chatNew,
  '/my-business': SITE_LABELS.myBusiness,
  '/workspace': SITE_LABELS.workspace,
  '/f': SITE_LABELS.filing,
  '/social-feed': SITE_LABELS.socialFeed,
  '/n': SITE_LABELS.marketplaceNeeds,
  '/b': SITE_LABELS.marketplaceBusiness,
  '/search': SITE_LABELS.search,
  '/post': SITE_LABELS.postNeed,
  '/create-post': SITE_LABELS.postNeed,
  '/help': SITE_LABELS.help,
  '/privacy': SITE_LABELS.privacy,
  '/terms': SITE_LABELS.terms,
  '/blog': SITE_LABELS.blog,
  '/referral': SITE_LABELS.referral,
  '/notification-settings': SITE_LABELS.notificationSettings,
  '/submit-review': SITE_LABELS.submitReview,
  '/browse': SITE_LABELS.browse,
  '/login': SITE_LABELS.login,
  '/register': SITE_LABELS.register,
  '/dev/intake-wizard': 'آزمایش ثبت نیاز',
  '/dev/mashhad-map': 'نقشه مشهد',
  '/dev/ui-kit': 'UI Kit',
  '/admin': SITE_LABELS.admin,
  '/admin/users': SITE_LABELS.adminUsers,
};

const PREFIX: { prefix: string; title: string }[] = [
  { prefix: '/dashboard/', title: SITE_LABELS.dashboard },
  { prefix: '/chat/', title: SITE_LABELS.chat },
  { prefix: '/blog/', title: SITE_LABELS.blog },
  { prefix: '/propose/', title: SITE_LABELS.propose },
  { prefix: '/post/edit/', title: SITE_LABELS.editNeed },
  { prefix: '/pro/', title: 'پنل حرفه‌ای' },
  { prefix: '/profile/', title: SITE_LABELS.profile },
  { prefix: '/super-admin', title: SITE_LABELS.superAdmin },
];

/** Routes that render their own visible H1 (PageChrome or domain chrome). */
function hasOwnH1(path: string): boolean {
  if (
    path.startsWith('/n/') ||
    path.startsWith('/b/') ||
    path.startsWith('/v/') ||
    path.startsWith('/s/') ||
    path.startsWith('/f/')
  ) {
    return true;
  }

  if (path.startsWith('/profile/')) return true;

  const withVisibleChrome = [
    '/post',
    '/dashboard',
    '/bookmarks',
    '/notifications',
    '/edit-profile',
    '/discover',
    '/search',
    '/help',
    '/pricing',
    '/privacy',
    '/terms',
    '/faq',
    '/referral',
    '/social-feed',
    '/workspace',
    '/my-business',
  ];
  return withVisibleChrome.includes(path);
}

export function getPageTitleForPath(pathname: string): string | null {
  const path = pathname.split('?')[0] ?? pathname;
  if (hasOwnH1(path)) return null;
  if (EXACT[path]) return EXACT[path];
  for (const { prefix, title } of PREFIX) {
    if (path.startsWith(prefix)) return title;
  }
  return null;
}
