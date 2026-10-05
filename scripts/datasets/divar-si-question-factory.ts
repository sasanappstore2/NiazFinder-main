import { CANONICAL_CATEGORIES, getCategoryPath } from '@/config/categories';
import { DEAL_TYPE_PROPERTY, DEED_TYPE, PROPERTY_KIND } from '@/config/category-filters/options';
import {
  buildPostDecisionQuestions,
  buildPropertyCategoryCriteria,
  type PostDecisionQuestion,
} from '@/lib/need-intake/si/post-decision-questions';
import { extractPostNaturalFields } from '@/lib/need-intake/si/post-natural-extractor';

export type DivarSiQuestions = Record<string, PostDecisionQuestion>;

const OFFER_CATEGORY_MEANINGS: Readonly<Record<string, string>> = {
  'apartment-sale': 'فروش آپارتمان یا واحد مسکونی.',
  'apartment-rent': 'اجارهٔ بلندمدت آپارتمان مسکونی؛ نه شبانه.',
  'villa-sale': 'فروش خانهٔ مستقل، ویلا یا باغ‌ویلا.',
  'villa-rent': 'اجارهٔ بلندمدت خانه یا ویلای مستقل.',
  'land-sale': 'فروش زمین، قطعه زمین یا ملک کلنگی.',
  'land-rent': 'اجارهٔ زمین یا ملک کلنگی.',
  'office-sale': 'فروش دفتر کار، واحد اداری یا مطب.',
  'office-rent': 'اجارهٔ بلندمدت دفتر کار یا واحد اداری.',
  'shop-sale': 'فروش مغازه، فروشگاه، غرفه یا واحد تجاری.',
  'shop-rent': 'اجارهٔ بلندمدت مغازه یا واحد تجاری.',
  'industrial-sale': 'فروش سوله، کارخانه یا ملک صنعتی.',
  'industrial-rent': 'اجارهٔ بلندمدت سوله یا ملک صنعتی.',
  'suite-apartment-rent': 'اجارهٔ شبانه یا کوتاه‌مدت سوئیت/آپارتمان مبله.',
  'villa-short-rent': 'اجارهٔ کوتاه‌مدت یا تفریحی ویلا و باغ.',
  'workspace-short-rent': 'اجارهٔ کوتاه‌مدت فضای کار یا جلسه.',
  'pre-sale-services': 'پیش‌فروش ملک یا واحد در حال ساخت.',
  'construction-partnership': 'مشارکت در ساخت زمین یا پروژه.',
  'agency-services': 'خدمت آژانس املاک؛ نه عرضهٔ مستقیم ملک.',
};

const OFFER_PROPERTY_MEANINGS: Readonly<Record<string, string>> = {
  apartment: 'آپارتمان یا واحد مسکونی در ساختمان چندواحدی، برج یا مجتمع مسکونی.',
  villa: 'خانهٔ مستقل، ویلایی، باغ‌ویلا یا ملک با حیاط مستقل.',
  land: 'زمین، قطعهٔ زمین یا ملک کلنگی که موضوع اصلی آگهی خود زمین است.',
  office: 'دفتر اداری، دفتر کار، مطب یا واحدی که صریحاً برای کار اداری عرضه شده است.',
  shop: 'مغازه، فروشگاه، واحد تجاری، پاساژ یا محل کسبی که موضوع اصلی آگهی است.',
  industrial: 'کارخانه، کارگاه، سوله، انبار صنعتی یا فضای تولیدی/صنعتی.',
};

const OFFER_TRANSACTION_MEANINGS: Readonly<Record<string, string>> = {
  buy: 'آگهی عرضهٔ یک ملک برای فروش است؛ معاملهٔ متناظر از دید متقاضی خرید است. نشانه‌هایی مانند «فروش»، «فروشی»، «به فروش می‌رسد» یا قیمت فروش را ببین.',
  sell: 'فقط اگر متن از دید نویسنده صریحاً درخواست فروش یا واگذاری ملک خودش را مطرح کند؛ صرف آگهیِ ملکی که برای فروش عرضه شده را sell نزن.',
  rent_monthly: 'آگهی اجارهٔ معمولی یا بلندمدت است و نشانهٔ کوتاه‌مدت، رهن کامل یا ترکیب رهن‌واجاره ندارد.',
  rent_rahn_full: 'آگهی صریحاً رهن کامل یا اجاره با ودیعهٔ کامل را عرضه می‌کند و اجارهٔ ماهانه ندارد.',
  rent_rahn_ejare: 'آگهی هم‌زمان ودیعه/رهن و مبلغ اجارهٔ ماهانه را عرضه می‌کند.',
  rent_short_term: 'آگهی اقامت کوتاه‌مدت، شبانه، روزانه، چندروزه، مبلهٔ موقت یا اجارهٔ تفریحی را عرضه می‌کند.',
  unknown: 'متن برای تشخیص نوع معامله کافی یا صریح نیست؛ از نوع ملک، محله، متراژ یا یک عددِ بی‌واحد حدس نزن.',
};

function offerCriteria(options: readonly { value: string; label: string }[]): Record<string, string> {
  return Object.fromEntries([
    ...options.map(({ value, label }) => [value, `متن آگهی صریحاً به ${label} اشاره می‌کند.`] as const),
    ['unknown', 'نوع ملک یا معامله در آگهی روشن نیست؛ فقط از روی شهر، محله، متراژ یا قیمت حدس نزن.'],
  ]);
}

/** Fixed post-need question set for the separately generated hypothetical text. */
export function buildDivarSiBatchQuestions(): DivarSiQuestions {
  const candidates = CANONICAL_CATEGORIES
    .filter((category) => category.depth === 2 && getCategoryPath(category.slug)[0]?.slug === 'real-estate')
    .map((category) => ({
      slug: category.slug,
      label: getCategoryPath(category.slug).map((node) => node.title).join(' / '),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  if (candidates.length < 2) {
    throw new Error('The property category catalog is incomplete for the Divar batch question set.');
  }

  const questions = buildPostDecisionQuestions({ includePropertyFields: true });
  questions.category_candidate = {
    type: 'choice',
    instructions:
      'دسته را از ترکیب نوع ملک و نوع معامله/خدمت در متن نیاز تشخیص بده. شهر، محله، متراژ یا بودجه به‌تنهایی نوع معامله را مشخص نمی‌کند. اجارهٔ معمولی را از اقامت چندروزه جدا کن؛ اگر نوع ملک یا معامله روشن نیست unknown را انتخاب کن.',
    criteria: buildPropertyCategoryCriteria(candidates),
  };
  return questions;
}

/**
 * Offer-side extraction questions. These are intentionally distinct from the
 * post-need schema above: an ad is supply, not a seeker's intent.
 */
export function buildDivarOfferInspectionQuestions(): DivarSiQuestions {
  const questions = buildDivarSiBatchQuestions();
  const candidates = CANONICAL_CATEGORIES
    .filter((category) => category.depth === 2 && getCategoryPath(category.slug)[0]?.slug === 'real-estate')
    .map((category) => ({
      slug: category.slug,
      label: getCategoryPath(category.slug).map((node) => node.title).join(' / '),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const categoryQuestion = questions.category_candidate;
  if (categoryQuestion?.type === 'choice') {
    categoryQuestion.instructions = 'دستهٔ عرضه را فقط از نوع ملک و معاملهٔ گفته‌شده در خود آگهی تعیین کن. فروش، اجارهٔ بلندمدت، کوتاه‌مدت، پیش‌فروش، مشارکت و خدمت آژانس را جدا کن؛ اگر مبهم است unknown.';
    categoryQuestion.criteria = Object.fromEntries([
      ...candidates.map(({ slug, label }) => [
        slug,
        OFFER_CATEGORY_MEANINGS[slug] ?? `عرضهٔ ملک در مسیر ${label}.`,
      ] as const),
      ['unknown', 'نوع ملک یا معامله از آگهی روشن نیست؛ حدس نزن.'],
    ]);
  }
  for (const [key, question] of Object.entries(questions)) {
    if (question.type !== 'choice') continue;
    if (key === 'transaction_type') {
      question.instructions = 'نوع معامله‌ای را که آگهی‌دهنده عرضه می‌کند از متن آگهی مشخص کن؛ خرید/فروش، اجاره، رهن یا رهن‌واجاره را با هم اشتباه نگیر. اگر روشن نیست unknown.';
      question.criteria = Object.fromEntries([
        ...DEAL_TYPE_PROPERTY.map(({ value, label }) => [
          value,
          OFFER_TRANSACTION_MEANINGS[value] ?? `آگهی صریحاً نوع معاملهٔ «${label}» را عرضه می‌کند.`,
        ] as const),
        ['unknown', OFFER_TRANSACTION_MEANINGS.unknown] as const,
      ]);
    } else if (key === 'property_kind') {
      question.instructions = 'نوع ملکی را که در آگهی عرضه شده از خود متن تشخیص بده؛ اگر نوع ملک روشن نیست unknown.';
      question.criteria = Object.fromEntries([
        ...PROPERTY_KIND.map(({ value, label }) => [
          value,
          OFFER_PROPERTY_MEANINGS[value] ?? `متن آگهی صریحاً ${label} را به عنوان ملک عرضه‌شده مشخص می‌کند.`,
        ] as const),
        ['unknown', 'نوع ملک صریح یا قابل‌تفکیک نیست؛ از محله، متراژ، قیمت یا امکانات حدس نزن.'] as const,
      ]);
    } else if (key === 'deed_type') {
      question.instructions = 'فقط اگر متن آگهی نوع سند را صریحاً گفته همان را انتخاب کن؛ نوع سند ذکر نشده یا مبهم است، unknown.';
      question.criteria = offerCriteria(DEED_TYPE);
    } else if (key === 'usage') {
      question.instructions = 'کاربری یا فعالیتی را که متن آگهی صریحاً برای این ملک ذکر می‌کند انتخاب کن؛ از نوع ملک یا محله کاربری نساز و اگر ذکر نشده unknown.';
    } else if (['parking', 'elevator', 'storage'].includes(key)) {
      const feature = key === 'parking' ? 'پارکینگ' : key === 'elevator' ? 'آسانسور' : 'انباری';
      question.instructions = `وضعیت ${feature} را فقط از گفتهٔ صریح آگهی استخراج کن: yes یعنی وجودش ذکر شده، no یعنی نبودش صریحاً ذکر شده، و ذکرنشدن یعنی unknown.`;
      question.criteria = {
        yes: `آگهی صریحاً می‌گوید ملک ${feature} دارد.`,
        no: `آگهی صریحاً می‌گوید ملک ${feature} ندارد.`,
        unknown: `دربارهٔ ${feature} چیزی گفته نشده یا عبارت مبهم است؛ حدس نزن.`,
      };
    }
  }
  return questions;
}

/**
 * Build the same candidate-scoped question set used by /post. A category
 * question is included only when deterministic parsing leaves multiple valid
 * real-estate leaves; a singleton remains a rules result, not fake model
 * evidence, and an empty candidate set is never expanded to all categories.
 */
export function buildDivarSiQuestionsForText(text: string): DivarSiQuestions {
  const parsed = extractPostNaturalFields(text);
  return buildDivarSiQuestionsForCandidates(parsed.categoryCandidates);
}

export function buildDivarSiQuestionsForCandidates(
  candidates: Array<{ slug: string; label: string }>,
  includePropertyFields = true,
): DivarSiQuestions {
  const categoryCandidates = candidates.filter(
    (candidate) => getCategoryPath(candidate.slug)[0]?.slug === 'real-estate'
  );
  return buildPostDecisionQuestions({
    categoryCandidates,
    includePropertyFields,
  });
}
