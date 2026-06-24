/**
 * Builds, per leaf category, a set of intent-aware Persian exemplar strings to
 * embed for semantic retrieval.
 *
 * The category's MEANING is defined by intent as much as by subject:
 *   - refrigerator (product, buy/sell)  vs  refrigerator-repair (service, fix)
 *   - apartment-sale (buy/sell)          vs  apartment-rent (rent/deposit)
 * A title alone ("یخچال", "آپارتمان") is ambiguous, so we weave in
 * intent phrasings ("تعمیر یخچال خراب", "اجاره آپارتمان") that match how users
 * actually phrase the need. Rule packs are NOT used — they are synthetic and
 * even mislabeled (repair packs contain buy-phrases), which would poison recall.
 */
import { CANONICAL_CATEGORIES, getCategoryPath } from '@/config/categories';
import {
  CURATED_CATEGORY_SEEDS,
  type CategorySeed,
} from '@/intake/rules/seeds/category-seeds';

export interface CategoryExemplars {
  slug: string;
  title: string;
  vertical: string;
  exemplars: string[];
}

type IntentKind =
  | 'estate-sale'
  | 'estate-rent'
  | 'estate-short-rent'
  | 'estate-service'
  | 'repair'
  | 'service'
  | 'job'
  | 'vehicle-buy'
  | 'vehicle-rent'
  | 'product'
  | 'event'
  | 'social';

const seedBySlug = new Map<string, CategorySeed>(
  CURATED_CATEGORY_SEEDS.map((s) => [s.slug, s])
);

/**
 * Hand-tuned exemplars for heterogeneous / hard categories where the generic
 * intent templates misfire (social mix, events, job fields, close real-estate).
 */
const SLUG_EXEMPLAR_OVERRIDES: Record<string, string[]> = {
  // social (mixed bag — generic templates fail badly here)
  'lost-found': [
    'گم شد', 'گمشده', 'مفقود شد', 'پیدا کردم', 'کیف پولم را گم کردم', 'سگم گم شده', 'مدارکم را پیدا کردم',
    'گربه‌ام گم شده', 'حیوان خانگیم گم شده دنبالش می‌گردم', 'گوشیم رو جا گذاشتم کسی پیدا نکرده',
    'گمشده پیدا شد خبر بدید', 'اگه کسی دیدش لطفا خبر بده مژدگانی میدم',
  ],
  volunteering: [
    'کار داوطلبانه', 'جذب داوطلب', 'فعالیت داوطلبانه', 'کمک داوطلبانه به نیازمندان', 'گروه داوطلبان',
    'یه خیریه هستیم چند تا نیروی داوطلب میخوایم', 'برای بسته‌بندی و توزیع کمک به نیازمندا کسی هست بیاد',
    'دنبال داوطلب برای کار خیر می‌گردیم', 'نیروی داوطلب بدون دستمزد برای موسسه خیریه می‌خواهیم',
  ],
  conference: [
    'همایش', 'کنفرانس', 'سمینار', 'برگزاری همایش', 'وبینار تخصصی', 'گردهمایی علمی',
    'می‌خواهیم یک همایش برگزار کنیم با حدود ۲۰۰ نفر', 'دنبال کسی هستیم که سالن و پذیرایی و ثبت‌نام همایش را هماهنگ کند',
    'برگزاری سمینار تخصصی با سخنران و سالن کنفرانس', 'نیاز به برگزارکننده همایش و کنفرانس داریم',
  ],
  sporting: [
    'رویداد ورزشی', 'مسابقه ورزشی', 'تورنمنت', 'لیگ و دوره ورزشی', 'همایش ورزشی',
    'می‌خواهیم یک رویداد ورزشی برگزار کنیم', 'مسابقه فوتسال با جایزه برگزار می‌کنیم دنبال هماهنگ‌کننده زمین و داور هستیم',
    'برگزاری تورنمنت و لیگ محلی با داور و زمین بازی', 'دنبال برگزارکننده مسابقات ورزشی محلی هستیم',
  ],
  'cultural-artistic': [
    'رویداد فرهنگی', 'برنامه هنری', 'نمایشگاه فرهنگی', 'جشنواره فرهنگی هنری', 'کارگاه هنری',
    'برگزاری نمایشگاه نقاشی و هنری', 'دنبال برگزارکننده جشنواره فرهنگی محلی هستیم',
    'کارگاه آموزش هنر و موسیقی برگزار می‌کنیم نیاز به فضا و مدرس داریم',
  ],
  // entertainment events
  tickets: ['بلیط', 'خرید بلیط کنسرت', 'رزرو بلیط', 'بلیط مسابقه و تئاتر'],
  tours: [
    'تور مسافرتی', 'تور گردشگری', 'رزرو تور', 'تور تفریحی',
    'دنبال یک تور گردشگری خوب با قیمت مناسب هستم', 'تور خانوادگی به همراه اقامت و گردشگری می‌خواهم',
    'رزرو تور مسافرتی برای آخر هفته', 'تور زیارتی یا سیاحتی با راهنما می‌خواهم',
  ],
  pets: ['حیوان خانگی', 'سگ و گربه', 'فروش توله سگ', 'خرید گربه', 'پرنده و ماهی'],
  books: ['کتاب', 'خرید کتاب', 'کتاب دست دوم', 'رمان و کتاب درسی'],
  'sports-fitness': ['لوازم ورزشی', 'تجهیزات بدنسازی', 'دوچرخه و تردمیل', 'وسایل ورزشی'],
  'musical-instruments': ['ساز و آلات موسیقی', 'خرید گیتار', 'پیانو', 'سنتور و ویولن'],
  // jobs (field of work, hiring or seeking)
  it: ['استخدام برنامه‌نویس', 'استخدام نیروی فناوری اطلاعات', 'کار در حوزه IT و نرم‌افزار', 'جذب توسعه‌دهنده'],
  'admin-management': ['استخدام نیروی اداری', 'منشی و کارمند اداری', 'مدیر دفتر', 'کارشناس اداری'],
  'finance-legal': ['استخدام حسابدار', 'کارشناس مالی و حقوقی', 'حسابدار و امور مالی', 'مشاور حقوقی شرکت'],
  'marketing-sales': ['استخدام کارشناس فروش', 'بازاریاب و فروشنده', 'کارشناس مارکتینگ', 'نیروی فروش'],
  engineering: ['استخدام مهندس', 'مهندس عمران و مکانیک', 'کارشناس فنی و مهندسی', 'نیروی مهندسی'],
  'art-media': ['استخدام در حوزه هنر و رسانه', 'گرافیست و تدوینگر', 'عکاس و تولید محتوا'],
  'health-beauty': ['استخدام در حوزه درمانی و زیبایی', 'پرستار و آرایشگر', 'کادر درمان و سالن زیبایی'],

  // personal-items — distinct from generic "product" template by adding real shopper phrasing
  clothing: [
    'خرید لباس', 'پوشاک مردانه و زنانه', 'شلوار جین می‌خرم', 'هودی دخترونه می‌خواهم',
    'لباس بچگانه می‌خرم', 'پیراهن و کت شلوار مردانه', 'لباس مجلسی زنانه می‌خواهم', 'کفش و پوشاک نو یا دست دوم',
  ],
  'jewelry-watches': [
    'خرید جواهرات', 'ساعت و طلا و جواهر', 'حلقه نامزدی می‌خواهم بخرم', 'دستبند و گردنبند طلا',
    'انگشتر و ست نامزدی', 'ساعت مردانه یا زنانه می‌خرم', 'جواهرات زینتی برای هدیه',
  ],
  'cosmetics-health': [
    'خرید آرایشی و بهداشتی', 'کرم ضدآفتاب می‌خواهم بخرم', 'محصولات پوست و مو', 'لوازم آرایشی اورجینال',
    'عطر و ادکلن می‌خرم', 'کرم و لوسیون مراقبت پوست', 'محصولات بهداشتی و زیبایی پوست',
  ],
  'kids-baby': [
    'لوازم کودک و نوزاد', 'کالسکه و تخت بچه می‌خرم', 'شیردوش و چارپایه شیردهی می‌خواهم بخرم',
    'صندلی غذاخوری کودک می‌خرم', 'لباس و وسایل نوزاد', 'سرویس خواب و اسباب‌بازی کودک',
  ],

  // vehicles — disambiguate body-type / use-case, not just "vehicle"
  'car-ride': [
    'خرید خودرو سواری', 'ماشین شخصی می‌خواهم بخرم', 'یک ماشین معمولی برای رفت‌وآمد روزانه می‌خواهم',
    'چهار چرخ و یک فرمون، نه وانت نه کامیون', 'پراید یا پژو دست دوم می‌خرم', 'خودرو سواری خانوادگی',
  ],
  'car-heavy': [
    'خرید کامیون و خودرو سنگین', 'کامیون کشنده می‌خواهم بخرم', 'وانت و کامیونت کاری',
    'ماشین سنگین برای حمل بار بین‌شهری', 'اتوبوس و مینی‌بوس و خودرو سنگین',
  ],
  'car-classic': [
    'خرید خودرو کلاسیک', 'ماشین قدیمی و کلکسیونی می‌خواهم', 'خودروی نیم‌قرنه و عتیقه برای نگهداری',
    'ماشین موزه‌ای نه برای استفاده روزمره', 'خرید و فروش خودرو کلاسیک و کلکسیونی',
  ],
  'car-rental': [
    'اجاره خودرو', 'کرایه ماشین می‌خواهم', 'ماشین مدل بالا برای چند روز اجاره می‌کنم',
    'شرکت معتبر اجاره خودرو با بیمه کامل می‌خواهم', 'اجاره ماشین برای سفر یا مسافرت',
  ],
  motorcycle: [
    'خرید موتورسیکلت', 'موتور دست دوم تمیز می‌خواهم بخرم', 'موتورسیکلت هوندا یا بنلی',
    'خرید و فروش موتور', 'موتورسیکلت صفر یا کارکرده',
  ],
  'spare-parts': [
    'خرید قطعات یدکی خودرو', 'لنت ترمز و فیلتر هوا می‌خواهم', 'قطعه اصلی برای ماشین می‌خرم',
    'یدکی پراید یا پژو', 'قطعات موتور و گیربکس خودرو',
  ],
  boat: ['خرید قایق', 'قایق موتوری یا بادی می‌خواهم بخرم', 'فروش قایق و شناور'],
};

/** Per-leaf symptom/colloquial phrasings for repair categories (vs. their product sibling). */
const REPAIR_SLUG_SYMPTOMS: Record<string, string[]> = {
  'ac-repair': ['کولر گازی روشن نمیشه', 'اسپلیت سرما نمیده', 'کولر آب میریزه', 'تعمیرکار کولر می‌خواهم بیاید درستش کند'],
  'refrigerator-repair': ['یخچال سرد نمی‌کند', 'فریزر یخ نمی‌زند', 'یخچالم صدا میدهد و خراب شده', 'یک تعمیرکار یخچال می‌خواهم بیاید'],
  'laundry-dishwasher-repair': ['ماشین لباسشویی آب نمی‌کشد', 'ظرفشویی روشن نمیشه', 'لباسشویی چرخش نمی‌کند و خراب شده', 'تعمیرکار ماشین ظرفشویی یا لباسشویی می‌خواهم'],
  'cooking-appliance-repair': ['اجاق گاز شعله نمی‌گیرد', 'فر روشن نمیشه', 'مایکروویو گرم نمی‌کند و خراب شده', 'تعمیرکار اجاق و فر می‌خواهم'],
  'water-heater-boiler-repair': ['آبگرمکن آب گرم نمی‌کند', 'پکیج خراب شده و گرم نمیشه', 'شوفاژ سرد است و کار نمی‌کند', 'تعمیرکار پکیج و آبگرمکن می‌خواهم'],
  'small-appliance-repair': ['جاروبرقی مکش ندارد', 'سشوار کار نمی‌کند', 'چرخ‌گوشت خراب شده روشن نمیشه', 'تعمیرکار لوازم کوچک خانگی می‌خواهم'],
  'tv-audio-repair': ['تلویزیون قاط زده خودش خاموش میشه', 'صدا ندارد یا تصویرش پرشه', 'تلویزیون روشن نمیشه', 'یک استاد کاربلد تلویزیون می‌خواهم بیاید'],
  'computer-laptop-repair': ['کامپیوتر ویروسی شده و کند شده', 'لپ‌تاپ روشن نمیشه', 'سیستم هنگ می‌کند و بالا نمی‌آید', 'تعمیرکار کامپیوتر و لپ‌تاپ می‌خواهم'],
  'mobile-tablet-repair': ['صفحه گوشی شکسته است', 'تاچ گوشی کار نمی‌کند', 'گوشی روشن نمیشه باید تعمیر شود', 'تعمیرکار موبایل و تبلت می‌خواهم بیاید یا ببرم پیشش'],
  'camera-cctv-repair': ['دوربین مداربسته تصویر نمیدهد و سیاه شده', 'دوربین‌های امنیتی شب‌ها واضح نیست', 'سیستم نظارتی خراب شده', 'تعمیرکار دوربین مداربسته می‌خواهم'],
  'printer-office-repair': ['پرینتر کاغذ نمی‌کشد', 'تونر روی کاغذ نمی‌چسبد و پاک می‌شود', 'دستگاه فکس یا کپی خراب شده', 'تعمیرکار پرینتر و ماشین‌های اداری می‌خواهم'],
  'vehicle-repair': ['ماشینم روغن می‌سوزاند و دود می‌کند', 'خودرو استارت نمی‌خورد', 'موتور ماشین صدا می‌دهد و خراب شده', 'یک مکانیک خوب می‌خواهم بیاید درستش کند'],
  'motorcycle-repair': ['موتور روشن نمیشه', 'موتورسیکلت استارت نمی‌خورد', 'باتری موتور خرابه یا کاربراتور گرفته', 'استادکار موتورسیکلت می‌خواهم'],
  'bicycle-repair': ['دنده دوچرخه خوب عوض نمی‌شود', 'ترمز عقب دوچرخه شل شده', 'زنجیر دوچرخه پاره شده', 'تعمیرکار دوچرخه می‌خواهم'],
  'door-window-glass-repair': ['شیشه پنجره شکسته است', 'در خانه جمع نمی‌شود یا لولایش خراب شده', 'یراق در و پنجره خراب شده', 'تعمیرکار در و پنجره و شیشه می‌خواهم'],
  'furniture-wood-repair': ['پایه مبل شکسته است', 'کابینت چوبی خراب شده و لولایش افتاده', 'تعمیر و روکوب مبلمان چوبی می‌خواهم', 'نجار برای تعمیر اثاثیه چوبی می‌خواهم'],
  'carpet-rug-repair': ['فرش پاره شده و نیاز به رفو دارد', 'گلیم سوراخ شده', 'شستشو و تعمیر فرش می‌خواهم', 'فرش‌شویی و رفوگری'],
  'roofing-waterproofing-repair': ['پشت‌بام چکه می‌کند', 'سقف نم دارد و آب می‌دهد', 'ایزوگام پشت‌بام خراب شده', 'تعمیرکار سقف و ایزوگام می‌خواهم'],
  'elevator-repair': ['آسانسور بین طبقات می‌ایستد', 'آسانسور صدا می‌دهد و کار نمی‌کند', 'سرویس و تعمیر آسانسور می‌خواهم'],
  'water-pump-repair': ['پمپ آب روشن نمیشه', 'موتورخانه آب فشار ندارد', 'پمپ آب صدا می‌دهد و خراب شده', 'تعمیرکار پمپ آب می‌خواهم'],
  'generator-ups-repair': ['موتور برق روشن نمیشه', 'یوپیاس کار نمی‌کند و شارژ نگه نمی‌دارد', 'برق اضطراری قطع و وصل می‌شود', 'تعمیرکار موتور برق و یوپیاس می‌خواهم'],
  'watch-jewelry-repair': ['ساعتم کار نمی‌کند و عقربه‌هایش ایستاده', 'بند ساعت پاره شده', 'نگین جواهر افتاده باید تعمیر شود', 'تعمیرکار ساعت و جواهرات می‌خواهم نه خرید'],
  'locksmith-repair': ['کلید در قفل شکسته است', 'قفل در باز نمی‌شود', 'کلیدساز برای باز کردن یا تعمیر قفل می‌خواهم'],
  'sewing-machine-repair': ['چرخ خیاطی کار نمی‌کند', 'نخ چرخ خیاطی گیر می‌کند', 'تعمیرکار چرخ خیاطی می‌خواهم'],
  'musical-instrument-repair': ['سیم گیتار پاره شده باید تعمیر شود', 'کلید پیانو صدا نمی‌دهد', 'ساز موسیقی خراب شده باید کوک یا تعمیر شود نه خرید', 'تعمیرکار ساز موسیقی می‌خواهم'],
  'medical-equipment-repair': ['دستگاه فشارخون کار نمی‌کند', 'ویلچر یا تجهیزات پزشکی خراب شده', 'تعمیرکار تجهیزات پزشکی می‌خواهم'],
  'industrial-machinery-repair': ['ماشین‌آلات صنعتی کارخانه خراب شده', 'دستگاه تولید کار نمی‌کند', 'تعمیرکار ماشین‌آلات صنعتی می‌خواهم'],
  'fitness-equipment-repair': ['تردمیل روشن نمیشه', 'دستگاه بدنسازی خراب شده', 'تعمیرکار تجهیزات ورزشی می‌خواهم'],
  'general-handyman-repair': ['چند کار خرابی کوچک در خانه دارم که نیاز به تعمیر دارد', 'یک تعمیرکار همه‌کاره می‌خواهم برای کارهای متفرقه خانه'],
};

function leafCategorySlugs(): string[] {
  const hasChild = new Set<string>();
  for (const c of CANONICAL_CATEGORIES) if (c.parentSlug) hasChild.add(c.parentSlug);
  return CANONICAL_CATEGORIES.filter(
    (c) => c.depth === 2 || (c.depth === 1 && !hasChild.has(c.slug))
  ).map((c) => c.slug);
}

function classify(slug: string, vertical: string, parentTitle: string): IntentKind {
  if (vertical === 'services') {
    return parentTitle.includes('تعمیر') ? 'repair' : 'service';
  }
  if (vertical === 'jobs') return 'job';
  if (vertical === 'social') return 'social';
  if (vertical === 'entertainment') {
    if (slug === 'tickets' || slug === 'tours') return 'event';
    return 'product';
  }
  if (vertical === 'vehicles') {
    return slug.includes('rental') ? 'vehicle-rent' : 'vehicle-buy';
  }
  if (vertical === 'real-estate') {
    if (parentTitle.includes('کوتاه')) return 'estate-short-rent';
    if (parentTitle.includes('فروش')) return 'estate-sale';
    if (parentTitle.includes('اجاره')) return 'estate-rent';
    return 'estate-service';
  }
  // electronics, home-appliances, personal-items
  return 'product';
}

function intentExemplars(kind: IntentKind, t: string): string[] {
  switch (kind) {
    case 'repair':
      return [`تعمیر ${t}`, `${t} خراب شده`, `${t} کار نمی‌کند`, `تعمیرکار ${t}`, `سرویس و تعمیر ${t}`];
    case 'service':
      return [`${t}`, `نیاز به ${t} دارم`, `درخواست خدمات ${t}`, `${t} حرفه‌ای می‌خواهم`];
    case 'job':
      return [`استخدام ${t}`, `نیرو برای ${t} استخدام می‌کنیم`, `دنبال کار در حوزه ${t}`, `جذب ${t}`];
    case 'estate-sale':
      return [`خرید ${t}`, `فروش ${t}`, `${t} برای فروش`, `${t} می‌خرم`];
    case 'estate-rent':
      return [`اجاره ${t}`, `رهن و اجاره ${t}`, `رهن ${t}`, `${t} اجاره‌ای می‌خواهم`];
    case 'estate-short-rent':
      return [`اجاره روزانه ${t}`, `اجاره کوتاه‌مدت ${t}`, `${t} برای چند روز`, `سوئیت روزانه ${t}`];
    case 'estate-service':
      return [`${t}`, `خدمات املاک ${t}`, `${t} ملکی`];
    case 'vehicle-buy':
      return [`خرید ${t}`, `فروش ${t}`, `${t} دست دوم`, `${t} صفر`];
    case 'vehicle-rent':
      return [`اجاره ${t}`, `کرایه ${t}`, `${t} اجاره‌ای`];
    case 'event':
      return [`${t}`, `خرید ${t}`, `رزرو ${t}`];
    case 'social':
      return [`${t}`, `${t}`];
    case 'product':
    default:
      return [`خرید ${t}`, `فروش ${t}`, `${t} نو`, `${t} دست دوم`, `${t} می‌خواهم`];
  }
}

function uniqueTrimmed(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.replace(/\s+/g, ' ').trim();
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

const MAX_EXEMPLARS = 18;

export function buildCategoryExemplars(): CategoryExemplars[] {
  const out: CategoryExemplars[] = [];

  for (const slug of leafCategorySlugs()) {
    const path = getCategoryPath(slug);
    if (!path.length) continue;
    const vertical = path[0]?.slug ?? '';
    const leaf = path[path.length - 1]!;
    const parentTitle = path.length >= 2 ? path[path.length - 2]!.title : '';
    const sectionTitle = path[0]?.title ?? '';
    const leafTitle = leaf.title;

    const kind = classify(slug, vertical, parentTitle);
    const exemplars: string[] = [];

    // Hand-tuned overrides take precedence for hard/heterogeneous categories.
    const override = SLUG_EXEMPLAR_OVERRIDES[slug];
    if (override) exemplars.push(...override);

    // Symptom/colloquial phrasings for repair leaves — these are what actually
    // disambiguate a repair request from its product-category sibling.
    const symptoms = REPAIR_SLUG_SYMPTOMS[slug];
    if (symptoms) exemplars.push(...symptoms);

    // Intent-aware phrasings on the leaf subject (the strongest signal).
    exemplars.push(...intentExemplars(kind, leafTitle));

    // Context phrase so vague leaves (سواری، صنعتی) carry their section/parent.
    exemplars.push([sectionTitle, parentTitle, leafTitle].filter(Boolean).join(' '));
    if (leaf.englishTitle) exemplars.push(leaf.englishTitle);

    // Curated seed keywords (real user words) — combined with intent for clarity.
    const seed = seedBySlug.get(slug);
    if (seed) {
      const intentWord =
        kind === 'repair'
          ? 'تعمیر'
          : kind === 'estate-rent' || kind === 'vehicle-rent' || kind === 'estate-short-rent'
            ? 'اجاره'
            : kind === 'estate-sale' || kind === 'vehicle-buy' || kind === 'product'
              ? 'خرید'
              : '';
      for (const kw of seed.keywords.slice(0, 5)) {
        exemplars.push(intentWord ? `${intentWord} ${kw}` : kw);
      }
      for (const svc of (seed.services ?? []).slice(0, 3)) exemplars.push(svc);
    }

    out.push({
      slug,
      title: leafTitle,
      vertical,
      exemplars: uniqueTrimmed(exemplars).slice(0, MAX_EXEMPLARS),
    });
  }

  return out;
}
