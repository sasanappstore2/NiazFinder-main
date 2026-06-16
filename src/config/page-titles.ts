/**
 * Static route → Persian page title for sr-only H1 in AppShell.
 * Marketplace (/n/*, /b/*) and listings (/v/*) set H1 in their own pages.
 */
const EXACT: Record<string, string> = {
  '/': 'نیاز فایندر — بازار خدمات و کسب‌وکار',
  '/discover': 'کشف نیازها',
  '/dashboard': 'داشبورد',
  '/messages': 'پیام‌ها',
  '/notifications': 'اعلان‌ها',
  '/bookmarks': 'نشان‌شده‌ها',
  '/pricing': 'تعرفه‌ها',
  '/faq': 'سوالات متداول',
  '/edit-profile': 'ویرایش پروفایل',
  '/chat': 'گفتگوها',
  '/chat/new': 'گفتگوی جدید',
  '/my-business': 'کسب‌وکار من',
  '/social-feed': 'فید اجتماعی',
  '/n': 'بازار نیازها',
  '/b': 'بازار کسب‌وکارها',
  '/search': 'جستجو',
  '/post': 'ثبت نیاز',
  '/create-post': 'ثبت نیاز',
  '/help': 'راهنما',
  '/privacy': 'حریم خصوصی',
  '/terms': 'قوانین استفاده',
  '/blog': 'وبلاگ',
  '/referral': 'دعوت از دوستان',
  '/notification-settings': 'تنظیمات اعلان',
  '/submit-review': 'ثبت نظر',
  '/browse': 'مرور نیازها',
  '/login': 'ورود',
  '/register': 'ثبت‌نام',
  '/dev/intake-wizard': 'آزمایش ثبت نیاز',
  '/dev/mashhad-map': 'نقشه مشهد',
  '/admin': 'پنل مدیریت',
  '/admin/users': 'مدیریت کاربران',
};

const PREFIX: { prefix: string; title: string }[] = [
  { prefix: '/dashboard/', title: 'داشبورد' },
  { prefix: '/chat/', title: 'گفتگو' },
  { prefix: '/blog/', title: 'وبلاگ' },
  { prefix: '/propose/', title: 'ارسال پیشنهاد' },
  { prefix: '/post/edit/', title: 'ویرایش نیاز' },
  { prefix: '/pro/', title: 'پنل حرفه‌ای' },
  { prefix: '/profile/', title: 'پروفایل کاربر' },
  { prefix: '/super-admin', title: 'مدیر کل' },
];

function hasOwnH1(path: string): boolean {
  return (
    path.startsWith('/n/') ||
    path.startsWith('/b/') ||
    path.startsWith('/v/') ||
    path.startsWith('/s/')
  );
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
