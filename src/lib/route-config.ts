/**
 * پیکربندی مسیرها - متمرکز و یکپارچه
 * این فایل نقشه‌برداری بین نماهای اپلیکیشن و الگوهای URL را مدیریت می‌کند
 */

// ثابت‌های مسیر - تمام مسیرهای اپلیکیشن
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  postNeed: '/requests/new',
  browseRequests: '/requests',
  requestDetail: '/requests/[slug]',
  browseSpecialists: '/specialists',
  specialistProfile: '/specialists/[id]',
  dashboard: '/dashboard',
  dashboardSettings: '/dashboard/settings',
  dashboardRequests: '/dashboard/requests',
  dashboardPayments: '/dashboard/payments',
  messages: '/chat',
  chatConversation: '/chat/[conversationId]',
  chatNew: '/chat/new',
  notifications: '/notifications',
  admin: '/admin',
  profile: '/dashboard/profile',
  pricing: '/pricing',
  compareSpecialists: '/compare',
  submitProposal: '/requests/[slug]/propose',
  submitReview: '/specialists/[id]/review',
  referral: '/dashboard/referral',
  notificationSettings: '/dashboard/settings/notifications',
} as const;

// نوع استخراج شده از مسیرها
export type RouteKey = keyof typeof ROUTES;

// گروه‌بندی مسیرها برای ناوبری و دسترسی
export const ROUTE_GROUPS = {
  auth: ['login', 'register'],
  marketplace: [
    'browse-requests',
    'request-detail',
    'browse-specialists',
    'specialist-profile',
    'post-need',
    'submit-proposal',
  ],
  dashboard: ['dashboard', 'profile', 'pricing', 'referral', 'notification-settings'],
  chat: ['messages'],
  admin: ['admin'],
} as const;

// کنترل دسترسی مبتنی بر نقش - هر مسیر نیازمند چه نقش‌هایی است
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

// متادیتای مسیرها - عنوان و توضیحات پیش‌فرض برای هر مسیر
export const ROUTE_METADATA: Record<string, { title: string; description: string }> = {
  home: {
    title: 'نیاز فایندر - پیدا کردن بهترین متخصص‌ها',
    description: 'نیاز خود را ثبت کنید و بهترین متخصص‌ها را در هر حوزه‌ای پیدا کنید. طراحی وب، برنامه‌نویسی، تعمیرات و صدها خدمت دیگر.',
  },
  login: {
    title: 'ورود به حساب کاربری',
    description: 'وارد حساب کاربری خود در نیاز فایندر شوید و به پروژه‌ها و پیام‌های خود دسترسی پیدا کنید.',
  },
  register: {
    title: 'ثبت‌نام در نیاز فایندر',
    description: 'در نیاز فایندر ثبت‌نام کنید و از خدمات متخصص‌های حرفه‌ای بهره‌مند شوید.',
  },
  'post-need': {
    title: 'ثبت نیاز جدید',
    description: 'نیاز خود را ثبت کنید تا بهترین متخصص‌ها به شما پیشنهاد بدهند.',
  },
  'browse-requests': {
    title: 'مرور درخواست‌های خدمات',
    description: 'درخواست‌های خدمات مختلف را مرور کنید و پروژه‌های مناسب خود را پیدا کنید.',
  },
  'request-detail': {
    title: 'جزئیات درخواست خدمات',
    description: 'جزئیات درخواست خدمات و پیشنهادهای متخصص‌ها را مشاهده کنید.',
  },
  'browse-specialists': {
    title: 'مرور متخصص‌ها',
    description: 'لیست متخصص‌های حرفه‌ای را مرور کنید و بهترین نفر را برای پروژه خود انتخاب کنید.',
  },
  'specialist-profile': {
    title: 'پروفایل متخصص',
    description: 'پروفایل متخصص، نمونه کارها، نظرات و امتیازات را مشاهده کنید.',
  },
  dashboard: {
    title: 'داشبورد',
    description: 'داشبورد مدیریت حساب کاربری و مشاهده وضعیت پروژه‌ها.',
  },
  messages: {
    title: 'پیام‌ها',
    description: 'پیام‌ها و مکالمات خود را با متخصص‌ها مدیریت کنید.',
  },
  notifications: {
    title: 'اعلان‌ها',
    description: 'اعلان‌های مربوط به پروژه‌ها، پیام‌ها و فعالیت‌های اخیر خود را مشاهده کنید.',
  },
  admin: {
    title: 'پنل مدیریت',
    description: 'پنل مدیریت سایت - مدیریت کاربران، درخواست‌ها و تنظیمات سیستم.',
  },
  profile: {
    title: 'پروفایل کاربری',
    description: 'مدیریت پروفایل کاربری و تنظیمات حساب.',
  },
  pricing: {
    title: 'تعرفه‌ها و پلن‌ها',
    description: 'تعرفه‌ها و پلن‌های اشتراک نیاز فایندر را مشاهده کنید.',
  },
  'compare-specialists': {
    title: 'مقایسه متخصص‌ها',
    description: 'متخصص‌ها را با هم مقایسه کنید و بهترین انتخاب را داشته باشید.',
  },
  referral: {
    title: 'معرفی به دوستان',
    description: 'دوستان خود را به نیاز فایندر معرفی کنید و از پاداش بهره‌مند شوید.',
  },
  'notification-settings': {
    title: 'تنظیمات اعلان‌ها',
    description: 'تنظیمات اعلان‌ها و نحوه دریافت نوتیفیکیشن‌ها را مدیریت کنید.',
  },
};

/**
 * تبدیل کلید مسیر به URL واقعی با جایگذاری پارامترها
 * @param routeKey - کلید مسیر از ROUTES
 * @param params - پارامترهای پویا برای جایگذاری
 */
export function buildRoute(
  routeKey: RouteKey,
  params?: Record<string, string>
): string {
  let route = ROUTES[routeKey];

  if (!params) return route;

  // جایگذاری تمام پارامترهای داینامیک
  for (const [key, value] of Object.entries(params)) {
    route = route.replace(`[${key}]`, encodeURIComponent(value));
  }

  return route;
}

/**
 * بررسی دسترسی کاربر به مسیر مشخص شده
 * @param routeView - نام نما/مسیر
 * @param userRole - نقش کاربر
 */
export function hasRoutePermission(routeView: string, userRole?: string): boolean {
  const requiredRoles = ROUTE_PERMISSIONS[routeView];
  if (!requiredRoles) return true; // مسیرهای بدون محدودیت
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

/**
 * دریافت گروه مسیر از نام نما
 */
export function getRouteGroup(view: string): string | null {
  for (const [group, views] of Object.entries(ROUTE_GROUPS)) {
    if (views.includes(view as typeof views[number])) {
      return group;
    }
  }
  return null;
}
