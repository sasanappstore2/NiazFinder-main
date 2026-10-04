import { isCasualAgentMessage } from '@/lib/ai-agent/casual-message';

export type AgentIntent =
  | 'greeting'
  | 'category_lookup'
  | 'need_help'
  | 'post_guide'
  | 'account_wallet'
  | 'need_search'
  | 'business_search'
  | 'section_help'
  | 'product_faq'
  | 'geo_lookup'
  | 'marketplace_link'
  | 'general';

export interface IntentRouteResult {
  intent: AgentIntent;
  /** When true, skip tool rounds and answer directly. */
  skipTools: boolean;
  /** Preferred tools for this intent (hint for prompt / forced first tool). */
  preferredTools: string[];
  /** Extra system instruction appended for this turn. */
  systemHint: string;
}

const CATEGORY_RE =
  /دست[هه‌]|کتگوری|category|خودرو|ماشین|املاک|آپارتمان|اجاره|فروش|موبایل|لپ\s*تاپ|وسایل\s*نقلیه|خدمات|لوازم\s*خانگی|الکترونیک|استخدام|کاریابی|صنعتی|کارگاهی|قطعات\s*یدکی|قایق|slug\s*دسته/i;

const POST_GUIDE_RE =
  /ثبت\s*نیاز|چطور\s*نیاز|چگونه\s*نیاز|\/post|آگهی\s*بذار|آگهی\s*بگذار|نیازم\s*رو\s*ثبت|فیلدهای?\s*نیاز|چه\s*اطلاعاتی/i;

const NEED_HELP_RE =
  /کمک.*(نیاز|ثبت)|راهنما.*(سایت|نیازفایندر)|چطور.*(کار|استفاده)|راهنمایی|چه\s*کمکی|درباره\s*خودت|کی\s*هستی|چیکار\s*می‌کنی/i;

const WALLET_RE =
  /کیف\s*پول|موجودی|شارژ|حساب\s*من|وضعیت\s*حساب|هزینه\s*پیام|پیام\s*دستیار|wallet|balance/i;

const PRODUCT_FAQ_RE =
  /لید\s*(یعنی|چیست|چی|می‌خر)|خرید\s*لید|چت.*(کسب.?وکار|فروشنده)|بازار\s*نیاز|لینک\s*ثبت|ثبت\s*نیاز\s*رایگان|نقش\s*من|تفاوت\s*مشتری|پیشنهاد\s*بگیرم|بعد\s*از\s*ثبت|تازه‌?وارد|از\s*کجا\s*شروع|راهنمای\s*کوتاه|پشتیبانی|ساعت\s*کاری|اپلیکیشن|نقشه|پین\s*روی|بودجه|رهن\s*و\s*اجاره|ویرایش\s*کنم|چند\s*نیاز/i;

const NEED_LIKE_RE =
  /دنبال\s+|می‌خوام\s+|ميخوام\s+|اجاره\s+|فروش\s+|تعمیر\s+|استخدام\s+|حمل\s*بار|طراحی\s*سایت|عکاسی|معلم\s*خصوصی|پرستاری|نظافت|بیمه|کنسول\s*بازی|لپ\s*تاپ|موتورسیکلت|ویلا|دفتر\s*کار|انبار|مشارکت\s*در\s*ساخت|پیش\s*فروش/i;

const NEED_SEARCH_RE =
  /جستجو.*(نیاز|آگهی)|نیازهای?\s*(مشابه|باز)|پیدا\s*کن.*(نیاز|آگهی)|search.*need/i;

const BUSINESS_SEARCH_RE =
  /جستجو.*(کسب.?وکار|فروشنده|شرکت|مغازه)|کسب.?وکار.*(پیدا|جستجو|معرفی)|فروشنده.*(پیدا|جستجو)|پروفایل\s*کسب.?وکار|\/b\/|search.*business/i;

const SECTION_HELP_RE =
  /بخش\s*(چت|داشبورد|کیف|بازار|ثبت|پروفایل|کمک|قوانین|حریم)|چطور.*(چت|داشبورد|بازار\s*کسب|\/help|\/privacy|\/terms)|راهنمای\s*(بخش|صفحه)|این\s*صفحه\s*چی/i;

const GEO_ANALYTICAL_RE =
  /چند\s*شهر|کدام\s*شهر|چه\s*شهر|در\s*چند|کجاها|لیست\s*(?:کامل\s*)?(?:محله|شهر)|همه\s*محله/i;

/** Simple city/neighborhood lookup only — not analytical “how many cities…” questions. */
const GEO_SIMPLE_RE =
  /^(?:جستجوی\s*شهر\s+\S+|شهر\s+\S+(?:\s+رو)?(?:\s+پیدا\s*کن)?|محله\s+\S+(?:\s+\S+)?)[\s!.؟?]*$/iu;

const GEO_NATIONWIDE_NEIGHBORHOOD_RE =
  /محله\s+([^\s؟?،,]+).*(?:چند\s*شهر|کدام\s*شهر|چه\s*شهر|داریم)|(?:چند\s*شهر|کدام\s*شهر|چه\s*شهر|در\s*چند\s*شهر).*محله\s+([^\s؟?،,]+)/i;

/** User wants a deep-link to city need marketplace (optionally filtered by category). */
const MARKETPLACE_LINK_RE =
  /لینک\s*(?:صفحه\s*)?(?:نیاز|بازار)|صفحه\s*نیاز|نیازهای?\s+\S+.*شهر|شهر\s+\S+.*(?:نیاز|بازار)|بازار\s*نیاز.*(?:شهر|دسته)|آدرس\s*(?:صفحه\s*)?نیاز/i;

/**
 * Lightweight rules-based intent router (no LLM).
 * Keeps greetings and simple lookups from burning tool rounds.
 */
export function routeAgentIntent(text: string): IntentRouteResult {
  const t = text.trim();

  if (isCasualAgentMessage(t)) {
    return {
      intent: 'greeting',
      skipTools: true,
      preferredTools: [],
      systemHint:
        'کاربر احوال‌پرسی یا گپ کوتاه کرده. ابزار صدا نزن؛ پاسخ دوستانه و کوتاه فارسی بده.',
    };
  }

  if (WALLET_RE.test(t)) {
    const wantsBalance = /موجودی|چقدر|چقدره|balance|وضعیت/i.test(t);
    return {
      intent: 'account_wallet',
      skipTools: false,
      preferredTools: ['check_user_account_status'],
      systemHint: wantsBalance
        ? 'کاربر موجودی/وضعیت کیف پول می‌خواهد. حتماً check_user_account_status را صدا بزن و فقط با عدد واقعی و کوتاه (۲–۳ جمله) جواب بده. توضیح کلی تکراری درباره لید/کسب‌وکار نده.'
        : 'سوال درباره کیف پول است. check_user_account_status را صدا بزن. دقیق بگو: هزینه پیام دستیار از کیف پول مشتری؛ هزینه لید از کیف پول کسب‌وکار؛ ثبت نیاز رایگان. پاسخ کوتاه و بدون تکرار متن قبلی.',
    };
  }

  if (POST_GUIDE_RE.test(t)) {
    return {
      intent: 'post_guide',
      skipTools: false,
      preferredTools: ['explain_need_fields', 'get_site_help', 'search_site_categories'],
      systemHint:
        'کاربر راهنمای ثبت نیاز می‌خواهد. از explain_need_fields یا get_site_help استفاده کن و به /post لینک بده.',
    };
  }

  if (BUSINESS_SEARCH_RE.test(t)) {
    return {
      intent: 'business_search',
      skipTools: false,
      preferredTools: ['search_businesses_agent', 'get_public_business_profile', 'search_site_cities'],
      systemHint:
        'کاربر جستجوی کسب‌وکار می‌خواهد. از search_businesses_agent استفاده کن؛ فقط کسب‌وکارهای عمومی فعال را بگو و لینک /b/{slug} بده.',
    };
  }

  if (SECTION_HELP_RE.test(t)) {
    return {
      intent: 'section_help',
      skipTools: false,
      preferredTools: ['search_site_knowledge', 'get_site_help'],
      systemHint:
        'کاربر راهنمای بخش/صفحه سایت می‌خواهد. از search_site_knowledge یا get_site_help استفاده کن و فقط بر اساس نتیجه ابزار جواب بده.',
    };
  }

  if (MARKETPLACE_LINK_RE.test(t)) {
    return {
      intent: 'marketplace_link',
      skipTools: false,
      preferredTools: ['search_site_cities', 'search_site_categories'],
      systemHint:
        'کاربر لینک بازار نیاز می‌خواهد. شهر (و در صورت ذکر، دسته) را با ابزار پیدا کن و لینک /n/{city} یا /n/{city}/{category} بده — لیست دسته به‌جای لینک نده.',
    };
  }

  if (GEO_NATIONWIDE_NEIGHBORHOOD_RE.test(t) || (GEO_SIMPLE_RE.test(t) && !GEO_ANALYTICAL_RE.test(t))) {
    return {
      intent: 'geo_lookup',
      skipTools: false,
      preferredTools: ['search_site_cities', 'search_site_neighborhoods'],
      systemHint: GEO_NATIONWIDE_NEIGHBORHOOD_RE.test(t)
        ? 'سوال تعداد/فهرست شهرهایی است که محلهٔ مشخصی دارند. search_site_neighborhoods را با nationwide و فقط نام محله بزن.'
        : 'سوال شهر/محله ساده است. از ابزارهای geo استفاده کن و لیست کامل محله ننویس.',
    };
  }

  if (NEED_SEARCH_RE.test(t)) {
    return {
      intent: 'need_search',
      skipTools: false,
      preferredTools: ['search_needs_agent', 'search_site_cities', 'search_site_categories'],
      systemHint:
        'کاربر جستجوی نیاز می‌خواهد. از search_needs_agent با query مناسب استفاده کن.',
    };
  }

  if (NEED_LIKE_RE.test(t) && t.length < 160) {
    return {
      intent: 'post_guide',
      skipTools: false,
      preferredTools: ['search_site_categories', 'explain_need_fields', 'get_site_help'],
      systemHint:
        'کاربر نیاز واقعی بیان کرده. کوتاه بگو چطور در /post ثبت کند و در صورت نیاز دسته مرتبط را با ابزار پیدا کن.',
    };
  }

  if (NEED_HELP_RE.test(t)) {
    return {
      intent: 'need_help',
      skipTools: false,
      preferredTools: ['search_site_knowledge', 'get_site_help'],
      systemHint:
        'کاربر راهنمای کلی سایت می‌خواهد. از search_site_knowledge یا get_site_help استفاده کن و مسیر محصول را کوتاه توضیح بده.',
    };
  }

  if (PRODUCT_FAQ_RE.test(t)) {
    return {
      intent: 'product_faq',
      skipTools: false,
      preferredTools: ['search_site_knowledge', 'get_site_help'],
      systemHint:
        'سوال متداول محصول است؛ ترجیحاً search_site_knowledge یا get_site_help را صدا بزن و پاسخ کوتاه فارسی بده.',
    };
  }

  if (CATEGORY_RE.test(t) && t.length < 120) {
    return {
      intent: 'category_lookup',
      skipTools: false,
      preferredTools: ['search_site_categories', 'get_site_categories'],
      systemHint:
        'سوال درباره دسته‌بندی است. از search_site_categories یا get_site_categories استفاده کن؛ دسته اختراع نکن.',
    };
  }

  return {
    intent: 'general',
    skipTools: false,
    preferredTools: [],
    systemHint:
      'مثل یک دستیار حرفه‌ای پاسخ بده. فقط وقتی داده واقعی لازم است ابزار بزن؛ در پاسخ نهایی هرگز syntax ابزار ننویس.',
  };
}
