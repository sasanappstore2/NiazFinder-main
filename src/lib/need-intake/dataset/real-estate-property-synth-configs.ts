import type { SlugSynthConfig } from './shared/category-synth-config';
import {
  districtFor,
  pickCity,
  SYNTH_AREAS,
  SYNTH_BUDGETS,
  SYNTH_BUDGETS_BILLION,
  SYNTH_ROOMS,
} from './shared/constants';

const city = (v: number) => districtFor(pickCity(v), v);
const area = (v: number) => SYNTH_AREAS[v % SYNTH_AREAS.length];
const budget = (v: number) => SYNTH_BUDGETS[v % SYNTH_BUDGETS.length];
const billion = (v: number) => SYNTH_BUDGETS_BILLION[v % SYNTH_BUDGETS_BILLION.length];
const rooms = (v: number) => SYNTH_ROOMS[v % SYNTH_ROOMS.length];

function t(...fns: Array<(v: number) => string>): Array<(v: number) => string> {
  return fns;
}

/** Property listing slugs (excludes agency/construction/pre-sale). */
export const REAL_ESTATE_PROPERTY_SYNTH_CONFIGS: SlugSynthConfig[] = [
  {
    slug: 'apartment-sale',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'apartment',
    dealType: 'buy',
    templates: t(
      (v) => `میخوام آپارتمان ${area(v)} متری در ${city(v)} بخرم`,
      (v) => `دنبال واحد آپارتمان ${rooms(v)} خواب تا ${billion(v)} میلیارد ${city(v)}`,
      (v) => `خرید آپارتمان ${area(v)} متر ${city(v)}`,
      (v) => `نیاز دارم به آپارتمان نوساز ${city(v)}`,
      (v) => `به دنبال آپارتمان ${rooms(v)} خواب ${city(v)}`
    ),
  },
  {
    slug: 'villa-sale',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'villa',
    dealType: 'buy',
    templates: t(
      (v) => `میخوام ویلا ${area(v)} متری در ${city(v)} بخرم`,
      (v) => `دنبال خانه ویلایی ${city(v)} تا ${billion(v)} میلیارد`,
      (v) => `خرید ویلا استخردار ${city(v)}`,
      (v) => `فروش ویلا ${area(v)} متری ${city(v)}`,
      (v) => `به دنبال خانه باغ ${city(v)}`
    ),
  },
  {
    slug: 'land-sale',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'land',
    dealType: 'buy',
    templates: t(
      (v) => `میخوام زمین ${area(v)} متری در ${city(v)} بخرم`,
      (v) => `دنبال زمین مسکونی ${city(v)}`,
      (v) => `خرید کلنگی ${area(v)} متر ${city(v)}`,
      (v) => `زمین برای ساخت ${city(v)} تا ${billion(v)} میلیارد`,
      (v) => `به دنبال زمین ${city(v)}`
    ),
  },
  {
    slug: 'apartment-rent',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'apartment',
    dealType: 'rent_monthly',
    templates: t(
      (v) => `اجاره ماهانه آپارتمان ${area(v)} متری ${city(v)}`,
      (v) => `دنبال اجاره آپارتمان ${rooms(v)} خواب ${city(v)}`,
      (v) => `میخوام آپارتمان ${area(v)} متر در ${city(v)} اجاره کنم`,
      (v) => `رهن و اجاره آپارتمان ${city(v)}`,
      (v) => `به دنبال واحد اجاره‌ای ${city(v)}`
    ),
  },
  {
    slug: 'villa-rent',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'villa',
    dealType: 'rent_monthly',
    templates: t(
      (v) => `اجاره ویلا ${area(v)} متری ${city(v)}`,
      (v) => `دنبال خانه ویلایی برای اجاره ${city(v)}`,
      (v) => `میخوام ویلا ${city(v)} اجاره کنم`,
      (v) => `رهن کامل ویلا ${city(v)} تا ${billion(v)} میلیارد`,
      (v) => `اجاره خانه ${rooms(v)} خواب ${city(v)}`
    ),
  },
  {
    slug: 'land-rent',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'land',
    dealType: 'rent_monthly',
    templates: t(
      (v) => `اجاره زمین ${area(v)} متری ${city(v)}`,
      (v) => `دنبال اجاره زمین ${city(v)}`,
      (v) => `میخوام زمین ${area(v)} متر ${city(v)} اجاره کنم`,
      (v) => `رهن زمین ${city(v)}`
    ),
  },
  {
    slug: 'office-sale',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'office',
    dealType: 'buy',
    templates: t(
      (v) => `خرید دفتر کار ${area(v)} متری ${city(v)}`,
      (v) => `میخوام دفتر اداری ${city(v)} بخرم`,
      (v) => `دنبال دفتر ${area(v)} متر ${city(v)}`,
      (v) => `فروش دفتر کار ${city(v)}`
    ),
  },
  {
    slug: 'shop-sale',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'shop',
    dealType: 'buy',
    templates: t(
      (v) => `خرید مغازه ${area(v)} متری ${city(v)}`,
      (v) => `میخوام مغازه سر پیچ ${city(v)} بخرم`,
      (v) => `دنبال غرفه تجاری ${city(v)}`,
      (v) => `فروش مغازه ${city(v)}`
    ),
  },
  {
    slug: 'industrial-sale',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'industrial',
    dealType: 'buy',
    templates: t(
      (v) => `خرید سوله ${area(v)} متری ${city(v)}`,
      (v) => `میخوام ملک صنعتی ${city(v)} بخرم`,
      (v) => `دنبال انبار ${area(v)} متر ${city(v)}`,
      (v) => `فروش سوله صنعتی ${city(v)}`
    ),
  },
  {
    slug: 'office-rent',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'office',
    dealType: 'rent_monthly',
    templates: t(
      (v) => `اجاره دفتر کار ${area(v)} متری ${city(v)}`,
      (v) => `میخوام دفتر ${city(v)} اجاره کنم`,
      (v) => `دنبال دفتر اداری ${city(v)}`,
      (v) => `رهن دفتر ${area(v)} متر ${city(v)}`
    ),
  },
  {
    slug: 'shop-rent',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'shop',
    dealType: 'rent_monthly',
    templates: t(
      (v) => `اجاره مغازه ${area(v)} متری ${city(v)}`,
      (v) => `میخوام مغازه ${city(v)} اجاره کنم`,
      (v) => `دنبال غرفه تجاری ${city(v)}`,
      (v) => `رهن مغازه ${city(v)}`
    ),
  },
  {
    slug: 'industrial-rent',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'industrial',
    dealType: 'rent_monthly',
    templates: t(
      (v) => `اجاره سوله ${area(v)} متری ${city(v)}`,
      (v) => `میخوام انبار ${city(v)} اجاره کنم`,
      (v) => `دنبال ملک صنعتی ${city(v)}`,
      (v) => `رهن سوله ${city(v)}`
    ),
  },
  {
    slug: 'suite-apartment-rent',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'suite',
    dealType: 'rent_short_term',
    templates: t(
      (v) => `اجاره روزانه سوئیت ${area(v)} متری ${city(v)} برای ${rooms(v)} نفر`,
      (v) => `میخوام آپارتمان کوتاه‌مدت ${city(v)}`,
      (v) => `دنبال سوئیت شبانه ${city(v)}`,
      (v) => `اجاره شبانه واحد ${city(v)} ${budget(v)} میلیون`
    ),
  },
  {
    slug: 'villa-short-rent',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'villa-short',
    dealType: 'rent_short_term',
    templates: t(
      (v) => `اجاره روزانه ویلا ${area(v)} متری ${city(v)}`,
      (v) => `میخوام ویلا کوتاه‌مدت ${city(v)} برای ${rooms(v)} نفر`,
      (v) => `دنبال باغ ویلا اجاره شبانه ${city(v)}`,
      (v) => `ویلا روزانه ${city(v)}`
    ),
  },
  {
    slug: 'workspace-short-rent',
    vertical: 'real-estate',
    intentPrefix: 'property',
    slugIncludes: 'workspace',
    dealType: 'rent_short_term',
    templates: t(
      (v) => `اجاره روزانه دفتر کار ${city(v)}`,
      (v) => `میخوام فضای آموزشی کوتاه‌مدت ${city(v)}`,
      (v) => `دنبال دفتر روزانه ${area(v)} متر ${city(v)}`,
      (v) => `اجاره شبانه دفتر ${city(v)}`
    ),
  },
];
