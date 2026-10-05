import {
  DEAL_TYPE_PROPERTY,
  DEED_TYPE,
  PROPERTY_KIND,
} from '@/config/category-filters/options';

export type PostDecisionQuestion =
  | {
      type: 'choice';
      instructions: string;
      criteria: Record<string, string>;
    }
  | {
      type: 'noul';
      instructions: string;
      criteria?: { false?: string; true?: string };
    }
  | {
      type: 'score';
      instructions: string;
      criteria: string[];
    };

export interface PostDecisionQuestionContext {
  categoryCandidates?: Array<{ slug: string; label: string }>;
  neighborhoodCandidates?: Array<{ slug: string; label: string }>;
  includePropertyFields?: boolean;
}

function criteriaFromOptions(
  options: readonly { value: string; label: string }[],
  unknownLabel = 'در متن ذکر نشده؛ حدس نزن'
): Record<string, string> {
  return Object.fromEntries([
    ...options.map((option) => [
      option.value,
      `کاربر به ${option.label} اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.`,
    ] as const),
    ['unknown', unknownLabel],
  ]);
}

const TRI_STATE = {
  yes: 'کاربر وجود این ویژگی را صریحاً می‌خواهد یا آن را موجود اعلام می‌کند.',
  no: 'کاربر صریحاً نبودن یا نخواستن این ویژگی را بیان می‌کند.',
  unknown: 'این ویژگی در متن ذکر نشده یا عبارت مبهم است؛ unknown را انتخاب کن.',
} as const;

/**
 * Short Persian distinctions for the app's real-estate leaf categories.
 * Labels alone are ambiguous in the catalog (e.g. apartment-sale and
 * apartment-rent share the same display title), so Si needs explicit
 * property + transaction/service semantics for each option.
 */
const PROPERTY_CATEGORY_MEANINGS: Readonly<Record<string, string>> = {
  'apartment-sale': 'خرید آپارتمان یا واحد مسکونی؛ فروش، نه اجاره.',
  'apartment-rent': 'اجارهٔ بلندمدت آپارتمان مسکونی؛ نه اقامت شبانه.',
  'villa-sale': 'خرید خانهٔ مستقل، ویلایی یا باغ‌ویلا.',
  'villa-rent': 'اجارهٔ بلندمدت خانه یا ویلای مستقل؛ نه سفر چندروزه.',
  'land-sale': 'خرید زمین، قطعه زمین یا ملک کلنگی.',
  'land-rent': 'اجارهٔ زمین یا ملک کلنگی.',
  'office-sale': 'خرید دفتر کار، واحد اداری یا مطب.',
  'office-rent': 'اجارهٔ بلندمدت دفتر کار، واحد اداری یا مطب.',
  'shop-sale': 'خرید مغازه، فروشگاه، واحد تجاری یا غرفه.',
  'shop-rent': 'اجارهٔ بلندمدت مغازه، فروشگاه، واحد تجاری یا غرفه.',
  'industrial-sale': 'خرید سوله، کارخانه یا ملک صنعتی.',
  'industrial-rent': 'اجارهٔ بلندمدت سوله، کارخانه یا ملک صنعتی.',
  'suite-apartment-rent': 'اقامت کوتاه‌مدت یا شبانه در سوئیت/آپارتمان مبله.',
  'villa-short-rent': 'اجارهٔ کوتاه‌مدت یا تفریحی ویلا و باغ.',
  'workspace-short-rent': 'اجارهٔ کوتاه‌مدت فضای کار، جلسه یا آموزش.',
  'agency-services': 'خدمت مشاور املاک برای یافتن ملک یا واسطه‌گری؛ نه خود ملک.',
  'construction-partnership': 'مشارکت در ساخت یا همکاری سازنده روی زمین/پروژه.',
  'pre-sale-services': 'پیش‌خرید یا پیش‌فروش واحد در حال ساخت.',
};

export function buildPropertyCategoryCriteria(
  categoryCandidates: Array<{ slug: string; label: string }>,
): Record<string, string> {
  return Object.fromEntries([
    ...categoryCandidates.map((candidate) => [
      candidate.slug,
      PROPERTY_CATEGORY_MEANINGS[candidate.slug] ?? `مسیر ${candidate.label}؛ فقط اگر متن نیاز با آن سازگار است.`,
    ] as const),
    ['unknown', 'نوع ملک یا معامله/خدمت از متن روشن نیست؛ شهر، محله، متراژ یا بودجه به‌تنهایی کافی نیست؛ حدس نزن.'],
  ]);
}

/**
 * One fixed question factory for the /post Si call. The option values come
 * from the same registry used by the existing intake form.
 */
export function buildPostDecisionQuestions(
  context: PostDecisionQuestionContext = {}
): Record<string, PostDecisionQuestion> {
  const questions: Record<string, PostDecisionQuestion> = {
    transaction_type: {
      type: 'choice',
      instructions:
        'نوع معامله را از متن نیاز مشخص کن. فقط گزینه‌ای را انتخاب کن که شواهد روشن دارد؛ اگر نوع معامله گفته نشده unknown را انتخاب کن.',
      criteria: criteriaFromOptions(DEAL_TYPE_PROPERTY),
    },
    property_kind: {
      type: 'choice',
      instructions:
        'نوع ملک را از متن فارسی تشخیص بده. بین آپارتمان، خانه/ویلا، زمین، دفتر کار، مغازه و صنعتی انتخاب کن؛ اگر روشن نیست unknown.',
      criteria: criteriaFromOptions(PROPERTY_KIND),
    },
    deed_type: {
      type: 'choice',
      instructions:
        'اگر متن نوع سند ملک را گفته است همان را انتخاب کن؛ وکالتی، تک‌برگ و مشاعی را با هم اشتباه نکن. در غیر این صورت unknown.',
      criteria: criteriaFromOptions(DEED_TYPE),
    },
    usage: {
      type: 'choice',
      instructions:
        'کاربری یا استفادهٔ موردنظر را از متن تشخیص بده. سالن/آرایشگاه/مزون را beauty_business، دفتر/کار اداری را office_business، سکونت را residential و فضای تجاری عمومی را commercial بزن؛ در غیر این صورت unknown.',
      criteria: {
        beauty_business: 'سالن، آرایشگاه، مزون یا کسب‌وکار زیبایی.',
        office_business: 'دفتر کار، شرکت، فعالیت اداری یا مطب.',
        residential: 'برای سکونت، خانه یا استفادهٔ مسکونی.',
        commercial: 'مغازه، فروشگاه یا فضای کسب‌وکار تجاری بدون نشانهٔ اداری.',
        unknown: 'کاربری روشن نیست؛ حدس نزن.',
      },
    },
    parking: {
      type: 'choice',
      instructions: 'وضعیت پارکینگ را سه‌حالته تشخیص بده و ذکر نشدن را unknown نگه دار.',
      criteria: TRI_STATE,
    },
    elevator: {
      type: 'choice',
      instructions: 'وضعیت آسانسور را سه‌حالته تشخیص بده و ذکر نشدن را unknown نگه دار.',
      criteria: TRI_STATE,
    },
    storage: {
      type: 'choice',
      instructions: 'وضعیت انباری را سه‌حالته تشخیص بده و ذکر نشدن را unknown نگه دار.',
      criteria: TRI_STATE,
    },
  };

  const categoryCandidates = (context.categoryCandidates ?? []).slice(0, 8);
  if (categoryCandidates.length >= 2) {
    questions.category_candidate = {
      type: 'choice',
      instructions:
        'دسته را فقط از شواهد نوع ملک و معامله/خدمت تعیین کن؛ اجارهٔ بلندمدت با اقامت کوتاه‌مدت فرق دارد. اگر مبهم است unknown؛ گزینه‌ای نساز.',
      criteria: buildPropertyCategoryCriteria(categoryCandidates),
    };
  }

  const neighborhoodCandidates = [
    ...new Map(
      (context.neighborhoodCandidates ?? [])
        .filter((candidate) => candidate.slug.trim() && candidate.label.trim())
        .map((candidate) => [candidate.slug, candidate]),
    ).values(),
  ].slice(0, 8);
  if (neighborhoodCandidates.length >= 2) {
    questions.neighborhood_candidate = {
      type: 'choice',
      instructions:
        'محله را فقط از میان گزینه‌های محدودشده به شهر انتخاب‌شده مشخص کن. عبارت مکانی باید واقعاً در متن باشد؛ نام محله را از بودجه، نوع ملک یا حدس نساز. اگر متن دو سوی یک محدوده را می‌گوید یا هیچ گزینه‌ای روشن نیست، unknown را انتخاب کن.',
      criteria: Object.fromEntries([
        ...neighborhoodCandidates.map((candidate) => [
          candidate.slug,
          `نام کاتالوگی محله: ${candidate.label}. فقط وقتی انتخاب کن که عبارت مکانی متن به همین گزینه بخورد.`,
        ] as const),
        ['unknown', 'هیچ گزینه‌ای از متن روشن نیست، نام صرفاً مشابه است، یا متن بین دو محدوده را توصیف می‌کند؛ حدس نزن.'],
      ]),
    };
  }

  if (context.includePropertyFields === false) {
    delete questions.property_kind;
    delete questions.deed_type;
    delete questions.usage;
    delete questions.parking;
    delete questions.elevator;
    delete questions.storage;
  }

  return questions;
}
