import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import type { TeacherGateOptions } from './teacher-gate';
import {
  districtFor,
  pickCity,
  SYNTH_AREAS,
  SYNTH_BUDGETS,
  SYNTH_BUDGETS_BILLION,
  SYNTH_ROOMS,
} from './constants';

export interface SlugSynthConfig {
  slug: string;
  vertical: ClassifierVertical;
  intentPrefix?: string;
  slugIncludes?: string;
  dealType?: string;
  minConfidence?: number;
  templates: Array<(v: number) => string>;
}

function t(...fns: Array<(v: number) => string>): Array<(v: number) => string> {
  return fns;
}

const city = (v: number) => districtFor(pickCity(v), v);
const area = (v: number) => SYNTH_AREAS[v % SYNTH_AREAS.length];
const budget = (v: number) => SYNTH_BUDGETS[v % SYNTH_BUDGETS.length];
const billion = (v: number) => SYNTH_BUDGETS_BILLION[v % SYNTH_BUDGETS_BILLION.length];
const rooms = (v: number) => SYNTH_ROOMS[v % SYNTH_ROOMS.length];

/** Per-slug Persian templates verified against rules teacher. */
export const SLUG_SYNTH_CONFIGS: SlugSynthConfig[] = [
  // ── Vehicles ──
  {
    slug: 'car-ride',
    vertical: 'vehicles',
    intentPrefix: 'vehicle',
    slugIncludes: 'car',
    templates: t(
      (v) => `میخوام خودرو سواری ${['پژو ۲۰۶', 'سمند', 'تیبا', 'دنا', 'رانا'][v % 5]} در ${city(v)} بخرم`,
      (v) => `دنبال ماشین سواری کارکرده تا ${budget(v)} میلیون ${city(v)}`,
      (v) => `خرید خودرو ${['سفید', 'مشکی', 'نو'][v % 3]} ${city(v)}`,
      (v) => `پژو پارس مدل ${88 + (v % 10)} کم کار ${city(v)}`
    ),
  },
  {
    slug: 'car-heavy',
    vertical: 'vehicles',
    intentPrefix: 'vehicle',
    slugIncludes: 'car',
    templates: t(
      (v) => `خرید کامیون ${['۶ تن', '۱۰ تن', 'کمرشکن'][v % 3]} ${city(v)}`,
      (v) => `دنبال ماشین سنگین ${['کامیونت', 'کامیون', 'تریلی'][v % 3]} کارکرده`,
      (v) => `فروش کامیون ${['بنز', 'ولوو', 'اف'][v % 3]} ${city(v)}`
    ),
  },
  {
    slug: 'car-classic',
    vertical: 'vehicles',
    intentPrefix: 'vehicle',
    slugIncludes: 'car',
    templates: t(
      (v) => `خرید خودرو کلاسیک ${['پاژن', 'پیکان', 'ژیان'][v % 3]}`,
      (v) => `ماشین کلاسیک دست ساز ${city(v)}`,
      (v) => `فروش خودرو کلاسیک ${['کاپری', 'موستانگ'][v % 2]}`
    ),
  },
  {
    slug: 'car-rental',
    vertical: 'vehicles',
    intentPrefix: 'vehicle',
    slugIncludes: 'car',
    templates: t(
      (v) => `اجاره خودرو سواری برای ${['سفر', 'عروسی', 'کار'][v % 3]} ${city(v)}`,
      (v) => `کرایه ماشین روزانه ${city(v)}`,
      (v) => `اجاره ماشین بدون راننده ${city(v)}`
    ),
  },
  {
    slug: 'motorcycle',
    vertical: 'vehicles',
    intentPrefix: 'vehicle',
    slugIncludes: 'motorcycle',
    templates: t(
      (v) => `موتور ${['هوندا', 'یاماها', 'بنلی'][v % 3]} کارکرده ${city(v)}`,
      (v) => `خرید موتورسیکلت ${['۱۲۵', '۲۵۰', '۴۰۰'][v % 3]} سی‌سی`,
      (v) => `فروش موتور ${['کبیر', 'تریل', 'کویر'][v % 3]} ${city(v)}`
    ),
  },
  {
    slug: 'spare-parts',
    vertical: 'vehicles',
    intentPrefix: 'vehicle',
    slugIncludes: 'spare',
    templates: t(
      (v) => `قطعه یدکی ${['پراید', 'پژو', 'سمند'][v % 3]} اورجینال`,
      (v) => `لوازم یدکی خودرو ${['گیربکس', 'لنت', 'سپر'][v % 3]}`,
      (v) => `فروش قطعات یدکی ${['ایسوزو', 'تویوتا', 'هیوندای'][v % 3]}`
    ),
  },
  {
    slug: 'boat',
    vertical: 'vehicles',
    intentPrefix: 'vehicle',
    slugIncludes: 'boat',
    templates: t(
      (v) => `قایق تفریحی ${['دست دوم', 'نو', 'با موتور'][v % 3]} ${city(v)}`,
      (v) => `خرید قایق ماهیگیری ${['چوبی', 'فایبر'][v % 2]}`,
      (v) => `فروش قایق ${budget(v)} میلیون ${city(v)}`
    ),
  },

  // ── Electronics ──
  {
    slug: 'mobile-phone',
    vertical: 'products',
    intentPrefix: 'product',
    slugIncludes: 'mobile',
    templates: t(
      (v) => `گوشی ${['آیفون', 'سامسونگ', 'شیائومی'][v % 3]} ${['کارکرده', 'نو', 'گارانتی'][v % 3]} ${city(v)}`,
      (v) => `خرید موبایل ${['s24', '۱۳', 'a54'][v % 3]} تا ${budget(v)} میلیون`,
      (v) => `فروش گوشی ${['اپل', 'سامسونگ'][v % 2]} ${city(v)}`
    ),
  },
  {
    slug: 'tablet',
    vertical: 'products',
    intentPrefix: 'product',
    slugIncludes: 'tablet',
    templates: t(
      (v) => `تبلت ${['سامسونگ', 'اپل', 'لنوو'][v % 3]} برای خرید`,
      (v) => `خرید تبلت ${['ipad', 'galaxy tab'][v % 2]} ${city(v)}`,
      (v) => `فروش تبلت دست دوم ${budget(v)} میلیون`
    ),
  },
  {
    slug: 'mobile-accessories',
    vertical: 'products',
    intentPrefix: 'product',
    slugIncludes: 'mobile',
    templates: t(
      (v) => `قاب گوشی ${['آیفون', 'سامسونگ'][v % 2]} اورجینال`,
      (v) => `خرید هندزفری ${['بلوتوث', 'سیمی', 'بی‌سیم'][v % 3]}`,
      (v) => `لوازم جانبی موبایل ${['شارژر', 'کابل', 'پاوربانک'][v % 3]}`
    ),
  },
  {
    slug: 'desktop-computer',
    vertical: 'products',
    intentPrefix: 'product',
    slugIncludes: 'desktop',
    templates: t(
      (v) => `کامپیوتر رومیزی ${['گیمینگ', 'اداری', 'کار'][v % 3]} ${city(v)}`,
      (v) => `خرید سیستم ${['core i5', 'i7', 'ryzen'][v % 3]}`,
      (v) => `فروش کیس کامل ${budget(v)} میلیون`
    ),
  },
  {
    slug: 'laptop',
    vertical: 'products',
    intentPrefix: 'product',
    slugIncludes: 'laptop',
    templates: t(
      (v) => `لپ تاپ ${['دل', 'لنوو', 'ایسوس', 'macbook'][v % 4]} ${['کارکرده', 'نو'][v % 2]}`,
      (v) => `خرید لپتاپ ${city(v)} تا ${budget(v)} میلیون`,
      (v) => `فروش لپ تاپ ${['گیمینگ', 'سبک', 'اداری'][v % 3]}`
    ),
  },
  {
    slug: 'computer-parts',
    vertical: 'products',
    intentPrefix: 'product',
    slugIncludes: 'computer',
    templates: t(
      (v) => `قطعات کامپیوتر ${['رم', 'کارت گرافیک', 'مادربرد'][v % 3]}`,
      (v) => `خرید ${['rtx', 'gtx', 'rx'][v % 3]} کارکرده`,
      (v) => `فروش قطعات pc ${city(v)}`
    ),
  },
  {
    slug: 'game-console',
    vertical: 'products',
    intentPrefix: 'product',
    slugIncludes: 'game',
    templates: t(
      (v) => `کنسول ${['ps5', 'ps4', 'xbox'][v % 3]} ${['دست دوم', 'نو'][v % 2]}`,
      (v) => `میخوام یک دسته پلی استیشن بخر`,
      (v) => `فروش کنسول بازی ${budget(v)} میلیون`
    ),
  },
  {
    slug: 'audio-video',
    vertical: 'products',
    intentPrefix: 'product',
    templates: t(
      (v) => `تلویزیون ${['سامسونگ', 'ال‌جی', 'sony'][v % 3]} ${area(v)} اینچ`,
      (v) => `خرید ساندبار ${city(v)}`,
      (v) => `فروش سیستم صوتی خانگی`
    ),
  },
  {
    slug: 'camera',
    vertical: 'products',
    intentPrefix: 'product',
    slugIncludes: 'camera',
    templates: t(
      (v) => `دوربین ${['کانن', 'nikon', 'sony'][v % 3]} دست دوم`,
      (v) => `خرید دوربین عکاسی ${city(v)}`,
      (v) => `فروش لنز ${['۵۰mm', '۲۴-۷۰', '۷۰-۲۰۰'][v % 3]}`
    ),
  },

  // ── Home appliances ──
  {
    slug: 'refrigerator',
    vertical: 'products',
    slugIncludes: 'refrigerator',
    templates: t(
      (v) => `یخچال ${['ساید', 'دوقلو', 'ساده'][v % 3]} ${['سامسونگ', 'ال‌جی', 'دوو'][v % 3]} کارکرده`,
      (v) => `خرید یخچال ${city(v)}`,
      (v) => `فروش یخچال ${budget(v)} میلیون`
    ),
  },
  {
    slug: 'washing-machine',
    vertical: 'products',
    slugIncludes: 'washing',
    templates: t(
      (v) => `ماشین لباسشویی ${['۷', '۸', '۹'][v % 3]} کیلو ${city(v)}`,
      (v) => `خرید ماشین شستشو ${['سامسونگ', 'بوش'][v % 2]}`,
      (v) => `فروش ماشین لباسشویی دست دوم`
    ),
  },
  {
    slug: 'stove-microwave',
    vertical: 'products',
    templates: t(
      (v) => `اجاق گاز ${['رومیزی', 'صندوقی', 'توکار'][v % 3]} ${city(v)}`,
      (v) => `مایکروویو ${['سامسونگ', 'ال‌جی', 'پانasonic'][v % 3]} کارکرده`,
      (v) => `فروش اجاق و مایکروویو`
    ),
  },
  {
    slug: 'cooking-utensils',
    vertical: 'products',
    templates: t(
      (v) => `ظروف ${['گرانیتی', 'استیل', 'چدن'][v % 3]} نو`,
      (v) => `خرید سرویس قابلمه ${city(v)}`,
      (v) => `فروش ظروف آشپزخانه`
    ),
  },
  {
    slug: 'sofa-chair',
    vertical: 'products',
    slugIncludes: 'sofa',
    templates: t(
      (v) => `مبل ${['راحتی', '۷ نفره', 'چرم'][v % 3]} دست دوم ${city(v)}`,
      (v) => `خرید مبلمان ${city(v)}`,
      (v) => `فروش کاناپه ${budget(v)} میلیون`
    ),
  },
  {
    slug: 'table-closet',
    vertical: 'products',
    templates: t(
      (v) => `میز ${['نهارخوری', 'تحریر', 'کنسول'][v % 3]} ${city(v)}`,
      (v) => `کمد دیواری ${rooms(v)} درب`,
      (v) => `فروش میز و کمد`
    ),
  },
  {
    slug: 'lighting',
    vertical: 'products',
    templates: t(
      (v) => `لوستر ${['کریستال', 'مدرن', 'کلاسیک'][v % 3]} ${city(v)}`,
      (v) => `خرید چراغ ${['دیواری', 'رومیزی', 'سقفی'][v % 3]}`,
      (v) => `فروش روشنایی دکور`
    ),
  },
  {
    slug: 'decorative-art',
    vertical: 'products',
    templates: t(
      (v) => `تابلو نقاشی ${['دست ساز', 'چاپ', 'مدرن'][v % 3]}`,
      (v) => `آینه دکوراتیو ${city(v)}`,
      (v) => `فروش مجسمه و تزیینات`
    ),
  },
  {
    slug: 'rugs',
    vertical: 'products',
    templates: t(
      (v) => `فرش ${['دستباف', 'ماشینی', '700 شانه'][v % 3]} ${city(v)}`,
      (v) => `گلیم ${['کردی', 'ترکمن', 'افشاری'][v % 3]}`,
      (v) => `فروش فرش ${area(v)} متری`
    ),
  },
  {
    slug: 'building-industrial',
    vertical: 'products',
    templates: t(
      (v) => `ابزار ${['برقی', 'دستی', 'ساختمانی'][v % 3]} ${city(v)}`,
      (v) => `خرید دریل و پیچ گوشتی صنعتی`,
      (v) => `فروش ابزار آلات ساختمانی`
    ),
  },

  // ── Personal items ──
  {
    slug: 'clothing',
    vertical: 'products',
    slugIncludes: 'clothing',
    templates: t(
      (v) => `کت و شلوار ${['مردانه', 'زنانه', 'رسمی'][v % 3]} دست دوم`,
      (v) => `لباس ${['مجلسی', 'اسپرت', 'زمستانی'][v % 3]} ${city(v)}`,
      (v) => `فروش پوشاک ${budget(v)} هزار تومان`
    ),
  },
  {
    slug: 'jewelry-watches',
    vertical: 'products',
    slugIncludes: 'jewelry',
    templates: t(
      (v) => `ساعت ${['رولکس', 'کاسیو', 'تیسوت'][v % 3]} ${['اصل', 'کارکرده'][v % 2]}`,
      (v) => `فروش انگشتر طلا ${city(v)}`,
      (v) => `خرید ساعت مچی ${budget(v)} میلیون`
    ),
  },
  {
    slug: 'cosmetics-health',
    vertical: 'products',
    templates: t(
      (v) => `لوازم آرایشی ${['اصل', 'نو', 'ست'][v % 3]}`,
      (v) => `عطر ${['مردانه', 'زنانه'][v % 2]} ${city(v)}`,
      (v) => `فروش محصولات آرایشی`
    ),
  },
  {
    slug: 'kids-baby',
    vertical: 'products',
    templates: t(
      (v) => `کالسکه ${['نو', 'دست دوم'][v % 2]} ${city(v)}`,
      (v) => `لباس بچه ${['نوزاد', 'دخترانه', 'پسرانه'][v % 3]}`,
      (v) => `فروش اسباب بازی کودک`
    ),
  },

  // ── Entertainment ──
  {
    slug: 'books',
    vertical: 'products',
    templates: t(
      (v) => `کتاب ${['رمان', 'درسی', 'تخصصی'][v % 3]} ${city(v)}`,
      (v) => `خرید کتاب ${['فلسفه', 'کودک', 'تاریخ'][v % 3]}`,
      (v) => `فروش کتاب دست دوم`
    ),
  },
  {
    slug: 'tickets',
    vertical: 'products',
    slugIncludes: 'ticket',
    templates: t(
      (v) => `بلیط ${['کنسرت', 'فوتبال', 'تئاتر'][v % 3]} ${city(v)}`,
      (v) => `خرید بلیط ${['VIP', 'جایگاه'][v % 2]}`,
      (v) => `فروش بلیط رویداد`
    ),
  },
  {
    slug: 'tours',
    vertical: 'products',
    templates: t(
      (v) => `تور ${['کیش', 'شیراز', 'مشهد'][v % 3]} ${rooms(v)} شب`,
      (v) => `خرید تور مسافرتی ${city(v)}`,
      (v) => `فروش پکیج سفر`
    ),
  },
  {
    slug: 'sports-fitness',
    vertical: 'products',
    templates: t(
      (v) => `دمبل و وزنه ${city(v)}`,
      (v) => `دوچرخه ${['کوهستان', 'شهری', 'حرفه‌ای'][v % 3]} فروشی`,
      (v) => `خرید تجهیزات ورزشی ${budget(v)} میلیون`
    ),
  },
  {
    slug: 'pets',
    vertical: 'products',
    slugIncludes: 'pet',
    templates: t(
      (v) => `گربه ${['پرشین', 'شیری', 'بچه'][v % 3]} فروشی`,
      (v) => `سگ ${['ژرمن', 'هاسکی', 'پودل'][v % 3]} ${city(v)}`,
      (v) => `فروش ${['طوطی', 'ماهی', 'همster'][v % 3]}`
    ),
  },
  {
    slug: 'musical-instruments',
    vertical: 'products',
    templates: t(
      (v) => `گیتار ${['کلاسیک', 'الکتریک', 'آکوستیک'][v % 3]} ${city(v)}`,
      (v) => `پیانو ${['دیجیتال', 'آکوستیک'][v % 2]} فروشی`,
      (v) => `خرید ساز موسیقی ${budget(v)} میلیون`
    ),
  },

  // ── Services ──
  {
    slug: 'cleaning',
    vertical: 'services',
    intentPrefix: 'service',
    slugIncludes: 'cleaning',
    templates: t(
      (v) => `نظافتچی منزل ${['هفتگی', 'ماهانه', 'یکبار'][v % 3]} ${city(v)}`,
      (v) => `خدمات نظافت ${['راه پله', 'ویلا', 'آپارتمان'][v % 3]}`,
      (v) => `نظافت فوری ${city(v)}`
    ),
  },
  {
    slug: 'repairs',
    vertical: 'services',
    intentPrefix: 'service',
    slugIncludes: 'repair',
    templates: t(
      (v) => `تعمیرکار ${['کولر گازی', 'یخچال', 'ماشین لباسشویی'][v % 3]} ${city(v)}`,
      (v) => `تعمیر ${['لوازم خانگی', 'پکیج', 'آبگرمکن'][v % 3]} فوری`,
      (v) => `نیاز به تعمیرکار ${city(v)}`
    ),
  },
  {
    slug: 'plumbing',
    vertical: 'services',
    intentPrefix: 'service',
    slugIncludes: 'plumbing',
    templates: t(
      (v) => `لوله‌کشی فوری نشتی آب ${city(v)}`,
      (v) => `تاسیسات ${['فاضلاب', 'آب', 'گاز'][v % 3]}`,
      (v) => `لوله کش ${city(v)}`
    ),
  },
  {
    slug: 'moving',
    vertical: 'services',
    intentPrefix: 'service',
    slugIncludes: 'moving',
    templates: t(
      (v) => `اسباب کشی از ${city(v)} به کرج`,
      (v) => `باربری ${['درون شهری', 'بین شهری'][v % 2]}`,
      (v) => `وانت بار ${city(v)} دربستی`
    ),
  },
  {
    slug: 'electrical',
    vertical: 'services',
    intentPrefix: 'service',
    slugIncludes: 'electrical',
    templates: t(
      (v) => `برقکار برای سیم کشی ${['ساختمان', 'آپارتمان', 'ویلا'][v % 3]}`,
      (v) => `برق کاری ${city(v)} فوری`,
      (v) => `نصب ${['لوستر', 'پریز', 'کولر'][v % 3]}`
    ),
  },
  {
    slug: 'painting',
    vertical: 'services',
    intentPrefix: 'service',
    slugIncludes: 'painting',
    templates: t(
      (v) => `نقاش ساختمان آپارتمان ${area(v)} متری`,
      (v) => `نقاشی ${['دیوار', 'ساختمان', 'اتاق'][v % 3]} ${city(v)}`,
      (v) => `کاغذ دیواری ${city(v)}`
    ),
  },
  {
    slug: 'medical-health',
    vertical: 'services',
    slugIncludes: 'medical',
    templates: t(
      (v) => `ویزیت پزشک ${['پوست', 'داخلی', 'ارتوپد'][v % 3]}`,
      (v) => `خدمات درمانی ${city(v)}`,
      (v) => `پرستار در منزل ${city(v)}`
    ),
  },
  {
    slug: 'legal-services',
    vertical: 'services',
    slugIncludes: 'legal',
    templates: t(
      (v) => `وکیل ${['ملکی', 'کیفری', 'طلاق'][v % 3]} ${city(v)}`,
      (v) => `مشاوره حقوقی ${['قرارداد', 'ثبت شرکت'][v % 2]}`,
      (v) => `نیاز به وکیل ${city(v)}`
    ),
  },
  {
    slug: 'it-services',
    vertical: 'services',
    slugIncludes: 'it-services',
    templates: t(
      (v) => `طراحی سایت ${['فروشگاهی', 'شرکتی', 'شخصی'][v % 3]} با سئو`,
      (v) => `برنامه نویس ${['وب', 'موبایل', 'وردپرس'][v % 3]} پروژه`,
      (v) => `خدمات فناوری ${city(v)}`
    ),
  },
  {
    slug: 'transportation',
    vertical: 'services',
    templates: t(
      (v) => `حمل بار ${['سبک', 'سنگین', 'یخچالی'][v % 3]} ${city(v)}`,
      (v) => `خدمات حمل و نقل ${city(v)}`,
      (v) => `پیک موتوری ${city(v)}`
    ),
  },
  {
    slug: 'beauty-health',
    vertical: 'services',
    slugIncludes: 'beauty',
    templates: t(
      (v) => `آرایشگر ${['عروس', 'مردانه', 'زنانه'][v % 3]} ${city(v)}`,
      (v) => `خدمات زیبایی ${['ناخن', 'مژه', 'پوست'][v % 3]}`,
      (v) => `سالن زیبایی ${city(v)}`
    ),
  },
  {
    slug: 'events-catering',
    vertical: 'services',
    templates: t(
      (v) => `پذیرایی ${['عروسی', 'تولد', 'همایش'][v % 3]} ${city(v)}`,
      (v) => `تشریفات مراسم ${city(v)}`,
      (v) => `پذیرایی ${rooms(v)} نفر`
    ),
  },
  {
    slug: 'education',
    vertical: 'services',
    slugIncludes: 'education',
    templates: t(
      (v) => `معلم خصوصی ${['ریاضی', 'فیزیک', 'زبان'][v % 3]} دبیرستان`,
      (v) => `کلاس ${['آیلتس', 'کنکور', 'برنامه نویسی'][v % 3]} ${city(v)}`,
      (v) => `آموزش ${['پیانو', 'نقاشی', 'خوشنویسی'][v % 3]}`
    ),
  },

  // ── Jobs ──
  {
    slug: 'admin-management',
    vertical: 'jobs',
    intentPrefix: 'job',
    slugIncludes: 'admin',
    templates: t(
      (v) => `استخدام ${['منشی', 'کارشناس اداری', 'مسئول دفتر'][v % 3]} ${city(v)}`,
      (v) => `نیاز به نیروی اداری با سابقه`,
      (v) => `جذب ${['حسابدار', 'بایگانی', 'پذیرش'][v % 3]}`
    ),
  },
  {
    slug: 'it',
    vertical: 'jobs',
    intentPrefix: 'job',
    slugIncludes: 'it',
    templates: t(
      (v) => `استخدام برنامه نویس ${['فرانت', 'بک', 'فول استک'][v % 3]} ${['ریموت', city(v)][v % 2]}`,
      (v) => `جذب ${['devops', 'دیتا', 'امنیت'][v % 3]}`,
      (v) => `نیاز به developer ${city(v)}`
    ),
  },
  {
    slug: 'finance-legal',
    vertical: 'jobs',
    intentPrefix: 'job',
    templates: t(
      (v) => `استخدام ${['حسابدار', 'حسابرس', 'کارشناس مالی'][v % 3]}`,
      (v) => `جذب ${['حقوقی', 'قراردادها'][v % 2]} ${city(v)}`,
      (v) => `نیاز به کارشناس مالی`
    ),
  },
  {
    slug: 'marketing-sales',
    vertical: 'jobs',
    intentPrefix: 'job',
    slugIncludes: 'marketing',
    templates: t(
      (v) => `استخدام کارشناس بازاریابی دیجیتال ${city(v)}`,
      (v) => `جذب ${['فروش', 'سئو', 'محتوا'][v % 3]}`,
      (v) => `نیاز به بازاریاب ${city(v)}`
    ),
  },
  {
    slug: 'engineering',
    vertical: 'jobs',
    intentPrefix: 'job',
    slugIncludes: 'engineering',
    templates: t(
      (v) => `استخدام مهندس ${['برق', 'مکانیک', 'عمران'][v % 3]}`,
      (v) => `جذب مهندس ${['صنایع', 'کامپیوتر'][v % 2]} ${city(v)}`,
      (v) => `نیاز به مهندس ${city(v)}`
    ),
  },
  {
    slug: 'art-media',
    vertical: 'jobs',
    intentPrefix: 'job',
    templates: t(
      (v) => `استخدام ${['گرافیست', 'تدوینگر', 'عکاس'][v % 3]}`,
      (v) => `جذب ${['نویسنده', 'کارگردان'][v % 2]} ${city(v)}`,
      (v) => `نیاز به طراح گرافیک`
    ),
  },
  {
    slug: 'health-beauty',
    vertical: 'jobs',
    intentPrefix: 'job',
    templates: t(
      (v) => `استخدام ${['پرستار', 'منشی پزشک', 'تکنسین'][v % 3]}`,
      (v) => `جذب آرایشگر ${city(v)}`,
      (v) => `نیاز به پرسنل درمان`
    ),
  },

  // ── Social ──
  {
    slug: 'cultural-artistic',
    vertical: 'social',
    templates: t(
      (v) => `رویداد فرهنگی ${['نمایش', 'کنسرت', 'نقاشی'][v % 3]} ${city(v)}`,
      (v) => `برنامه ${['هنری', 'ادبی', 'سینما'][v % 3]}`,
      (v) => `جشنواره فرهنگی ${city(v)}`
    ),
  },
  {
    slug: 'conference',
    vertical: 'social',
    slugIncludes: 'conference',
    templates: t(
      (v) => `همایش ${['استارتاپ', 'فناوری', 'کسب و کار'][v % 3]} ثبت نام`,
      (v) => `کنفرانس ${city(v)}`,
      (v) => `سمینار ${['مدیریت', 'بازاریابی'][v % 2]}`
    ),
  },
  {
    slug: 'sporting',
    vertical: 'social',
    templates: t(
      (v) => `مسابقه ${['فوتبال', 'والیبال', 'دو'][v % 3]} ${city(v)}`,
      (v) => `رویداد ورزشی ${city(v)}`,
      (v) => `ثبت نام تورنمنت ${['شطرنج', 'تنیس'][v % 2]}`
    ),
  },
  {
    slug: 'volunteering',
    vertical: 'social',
    templates: t(
      (v) => `داوطلب کمک در ${['جمع‌آوری', 'امداد', 'آموزش'][v % 3]}`,
      (v) => `فعالیت داوطلبانه ${city(v)}`,
      (v) => `نیاز به داوطلب ${['محیط زیست', 'کودکان'][v % 2]}`
    ),
  },
  {
    slug: 'lost-found',
    vertical: 'social',
    slugIncludes: 'lost',
    templates: t(
      (v) => `گم کردم ${['کیف', 'گوشی', 'مدارک'][v % 3]} در ${city(v)}`,
      (v) => `پیدا شد ${['سگ', 'گربه', 'کلید'][v % 3]} ${city(v)}`,
      (v) => `گم‌شده در مترو ${city(v)}`,
    ),
  },

  // ── Real estate services ──
  {
    slug: 'agency-services',
    vertical: 'real-estate',
    slugIncludes: 'agency',
    templates: t(
      (v) => `آژانس املاک برای ${['فروش', 'اجاره', 'خرید'][v % 3]} آپارتمان ${city(v)}`,
      (v) => `مشاور املاک ${city(v)}`,
      (v) => `خدمات آژانس املاک ${city(v)}`
    ),
  },
  {
    slug: 'construction-partnership',
    vertical: 'real-estate',
    slugIncludes: 'construction-partnership',
    intentPrefix: 'real_estate',
    templates: t(
      (v) => `مشارکت در ساخت ${['ویلا', 'آپارتمان', 'زمین'][v % 3]} ${area(v)} متر ${city(v)}`,
      (v) => `زمین ${area(v)} متری برای مشارکت در ساخت عرض ${rooms(v)} ${city(v)}`,
      (v) => `دنبال شریک ساخت ${city(v)}`
    ),
  },
  {
    slug: 'pre-sale-services',
    vertical: 'real-estate',
    slugIncludes: 'pre-sale',
    templates: t(
      (v) => `پیش‌فروش واحد در پروژه جدید ${city(v)}`,
      (v) => `خرید پیش فروش آپارتمان ${city(v)}`,
      (v) => `پروژه پیش‌فروش ${area(v)} متری ${city(v)}`
    ),
  },
];

export function gateOptionsForConfig(config: SlugSynthConfig): TeacherGateOptions {
  return {
    expectedSlug: config.slug,
    slugIncludes: config.slugIncludes ?? config.slug,
    intentPrefix: config.intentPrefix,
    dealType: config.dealType,
    minConfidence: config.minConfidence ?? 0.5,
    vertical: config.vertical,
    idPrefix: `synth-${config.vertical}`,
    tags: [config.vertical, config.slug],
  };
}

export function configsForVertical(vertical: ClassifierVertical): SlugSynthConfig[] {
  return SLUG_SYNTH_CONFIGS.filter((c) => c.vertical === vertical);
}

export const SYNTH_VERTICAL_TARGETS: Record<ClassifierVertical, number> = {
  'real-estate': 2500,
  vehicles: 1500,
  products: 2000,
  services: 1200,
  jobs: 800,
  social: 500,
};
