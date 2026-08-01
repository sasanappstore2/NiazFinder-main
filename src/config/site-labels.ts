/**
 * Canonical Persian labels — single source of truth for nav, breadcrumbs, page titles, and UI copy.
 * Import SITE_LABELS everywhere instead of hardcoding strings.
 */
export const SITE_LABELS = {
  home: 'صفحه اصلی',
  siteName: 'نیاز فایندر',
  siteTagline: 'نیاز فایندر — بازار خدمات و کسب‌وکار',

  /** Short nav label for need marketplace tab */
  needsNav: 'نیازها',
  /** Full marketplace title (pages, breadcrumbs, SEO) */
  marketplaceNeeds: 'بازار نیازها',
  /** Short nav label for business marketplace tab */
  businessNav: 'کسب‌وکارها',
  marketplaceBusiness: 'بازار کسب‌وکارها',

  postNeed: 'ثبت نیاز',
  postNeedNew: 'ثبت نیاز جدید',
  editNeed: 'ویرایش نیاز',

  dashboard: 'داشبورد',
  profile: 'پروفایل',
  profileNav: 'پروفایل',
  editProfile: 'ویرایش پروفایل',

  messages: 'پیام‌ها',
  chat: 'گفتگوها',
  chatNew: 'گفتگوی جدید',

  notifications: 'اعلان‌ها',
  bookmarks: 'علاقه‌مندی‌ها',

  search: 'جستجو',
  discover: 'کشف نیازها',
  browse: 'مرور نیازها',

  pricing: 'تعرفه‌ها',
  faq: 'سوالات متداول',
  help: 'راهنما',
  support: 'پشتیبانی',
  privacy: 'حریم خصوصی',
  terms: 'قوانین استفاده',

  myBusiness: 'کسب‌وکار من',
  workspace: 'میزکار املاک',
  filing: 'فایلینگ املاک',
  socialFeed: 'فید اجتماعی',
  referral: 'دعوت از دوستان',

  login: 'ورود',
  register: 'ثبت‌نام',
  blog: 'وبلاگ',

  listingDetail: 'جزئیات آگهی',
  businessProfile: 'پروفایل کسب‌وکار',
  propose: 'ارسال پیشنهاد',
  submitReview: 'ثبت نظر',
  notificationSettings: 'تنظیمات اعلان',

  superAdmin: 'مدیر کل',
  admin: 'پنل مدیریت',
  adminUsers: 'مدیریت کاربران',

  countryWide: 'سراسر ایران',
} as const;

export type SiteLabelKey = keyof typeof SITE_LABELS;

/** Nav tab titles (tooltips / aria) */
export const SITE_NAV_TITLES = {
  needs: 'مرور و جستجوی نیازها',
  business: 'مرور و جستجوی کسب‌وکارها',
  postNeed: 'ثبت نیاز جدید',
  messages: 'پیام‌ها و مکاتبات',
  profile: 'داشبورد و پروفایل کاربری',
} as const;
