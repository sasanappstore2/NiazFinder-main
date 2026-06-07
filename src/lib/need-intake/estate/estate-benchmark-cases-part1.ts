import type { EstateBenchmarkCase, EstateExpected } from '@/lib/need-intake/estate/estate-parse-result';

type CaseDef = [string, EstateExpected, string?];

function build(group: EstateBenchmarkCase['group'], defs: CaseDef[]): EstateBenchmarkCase[] {
  return defs.map(([input, expected, notes], i) => ({
    id: `${group}-${String(i + 1).padStart(2, '0')}`,
    group,
    input,
    expected,
    notes,
  }));
}

const A: CaseDef[] = [
  ['یک آپارتمان ۷۰ متری در تهران برای خرید می‌خوام', { category: 'estate', intent: 'buy', property_type: 'apartment', location: { city: 'تهران' }, area: { exact: 70 } }],
  ['دنبال اجاره مغازه ۴۰ متری در اصفهان هستم', { category: 'estate', intent: 'rent', property_type: 'shop', location: { city: 'اصفهان' }, area: { exact: 40 } }],
  ['زمین ۳۰۰ متری در شیراز برای خرید می‌خوام', { category: 'estate', intent: 'buy', property_type: 'land', location: { city: 'شیراز' }, area: { exact: 300 } }],
  ['آپارتمان ۲ خوابه در مشهد رهن کامل می‌خوام', { category: 'estate', intent: 'full_mortgage', property_type: 'apartment', location: { city: 'مشهد' }, rooms: 2 }],
  ['دفتر ۶۰ متری در کرج برای اجاره می‌خوام', { category: 'estate', intent: 'rent', property_type: 'office', location: { city: 'کرج' }, area: { exact: 60 } }],
  ['ویلای ۲۰۰ متری در رشت می‌خوام بخرم', { category: 'estate', intent: 'buy', property_type: 'villa', location: { city: 'رشت' }, area: { exact: 200 } }],
  ['آپارتمان ۳ خوابه ۱۱۰ متری در تبریز اجاره می‌خوام', { category: 'estate', intent: 'rent', property_type: 'apartment', location: { city: 'تبریز' }, rooms: 3, area: { exact: 110 } }],
  ['مغازه ۳۰ متری در بازار اراک می‌خوام بخرم', { category: 'estate', intent: 'buy', property_type: 'shop', location: { city: 'اراک' }, area: { exact: 30 } }],
  ['خانه ۱۵۰ متری در اهواز برای خرید', { category: 'estate', intent: 'buy', property_type: ['apartment', 'house'], location: { city: 'اهواز' }, area: { exact: 150 } }],
  ['زمین تجاری ۵۰۰ متری در قم', { category: 'estate', intent: ['buy', null], property_type: 'land', location: { city: 'قم' }, area: { exact: 500 } }],
  ['آپارتمان ۸۰ متری تهران رهن و اجاره', { category: 'estate', intent: 'rent_mortgage', property_type: 'apartment', location: { city: 'تهران' }, area: { exact: 80 } }],
  ['پنت‌هاوس در شمال تهران برای خرید', { category: 'estate', intent: 'buy', property_type: 'apartment', location: { city: 'تهران' } }],
  ['سوله ۱۰۰۰ متری در شهرک صنعتی کرج', { category: 'estate', property_type: 'warehouse', location: { city: 'کرج' }, area: { exact: 1000 } }],
  ['دفتر ۴۵ متری تهران خیابان ولیعصر اجاره', { category: 'estate', intent: 'rent', property_type: 'office', location: { city: 'تهران' }, area: { exact: 45 } }],
  ['آپارتمان نوساز ۹۵ متری در تهران', { category: 'estate', property_type: 'apartment', location: { city: 'تهران' }, area: { exact: 95 }, features: { building_age_max: 2 } }],
];

const B: CaseDef[] = [
  ['خونه‌ای تو جردن داری؟ ۱۰۰ تا ۱۲۰ متر', { category: 'estate', property_type: ['apartment', 'house'], location: { city: 'تهران', neighborhood: 'جردن' }, area: { min: 100, max: 120 }, must_clarify: ['intent'] }],
  ['دنبال یه جا واسه کار تو کرج میگردم', { category: 'estate', intent: 'rent', property_type: 'office', location: { city: 'کرج' } }],
  ['۵۰ تومن دارم اجاره چی میتونم بگیرم شمال تهران', { category: 'estate', intent: 'rent', location: { city: 'تهران' }, must_clarify: ['property_type'] }],
  ['ویلا اجاره بده نزدیک دریا', { category: 'estate', intent: 'rent', property_type: 'villa', location: { needs_clarification: true, ambiguous: true }, must_clarify: ['location.city'] }],
  ['سازنده‌ام دنبال زمین کلنگی میگردم تهران', { category: 'estate', intent: 'buy', property_type: 'land', location: { city: 'تهران' } }],
  ['میخوام با سازنده شریک بشم خونه‌م رو نو کنم', { category: 'estate', intent: 'partnership', property_type: ['apartment', 'house'] }],
  ['بدو بدو باید تا آخر ماه یه جا پیدا کنم', { category: 'estate', urgency: 'urgent', must_clarify: ['intent', 'property_type', 'location.city'] }],
  ['آپارتمانی هست رهن کنم؟ تو فاز ۲ اندیشه', { category: 'estate', intent: ['full_mortgage', 'rent_mortgage'], property_type: 'apartment', location: { city: 'تهران' } }],
  ['یه واحد تو برج می‌خوام، پول دارم', { category: 'estate', intent: 'buy', property_type: 'apartment' }],
  ['مغازه واگذار می‌کنی؟', { category: 'estate', intent: ['lease_out', 'sell'], property_type: 'shop' }],
  ['جاهای ارزون تهران کجاست که آپارتمان بگیرم؟', { category: 'estate', intent: 'buy', property_type: 'apartment', location: { city: 'تهران' } }],
  ['خونه ای که بشه توش کسب و کار داشت', { category: 'estate', property_type: ['mixed', 'shop', 'house'] }],
  ['دارم دنبال یه جای درست حسابی می‌گردم واسه باز کردن کلینیک', { category: 'estate', intent: 'rent', property_type: ['office', 'shop'] }],
  ['یه مکان واسه پارکینگ ماشین‌ام می‌خوام', { category: 'estate', property_type: ['warehouse', 'shop', null], must_clarify: ['property_type'] }],
  ['جای خوبی بلد هستی تو تهران بخرم مستغل باشه؟', { category: 'estate', intent: 'investment', location: { city: 'تهران' } }],
  ['اجاره دادنی داری؟ دو خوابه', { category: 'estate', intent: 'lease_out', rooms: 2 }],
  ['آپارتمانی هست تو منطقه ۵ اجاره بدم ۳۰۰ میلیون؟', { category: 'estate', intent: 'lease_out', property_type: 'apartment', location: { city: 'تهران' } }],
  ['دنبال دفتر موقت یه ماهه می‌گردم', { category: 'estate', intent: 'rent', property_type: 'office' }],
  ['یه چیزی تو بلوار فرحزادی نظیر این دارید؟', { category: 'estate', location: { city: 'تهران', neighborhood: 'فرحزادی' }, must_clarify: ['intent'] }],
  ['کارگاهی داری ۵۰۰ متری بالای تهران؟', { category: 'estate', property_type: 'warehouse', area: { exact: 500 }, location: { city: 'تهران' } }],
];

const C: CaseDef[] = [
  ['اجاره آپارتمان در شمال می‌خوام', { category: 'estate', intent: 'rent', property_type: 'apartment', location: { needs_clarification: true, ambiguous: true }, must_clarify: ['location.city'] }],
  ['دنبال خونه در ولنجک هستم', { category: 'estate', location: { city: 'تهران', neighborhood: 'ولنجک' }, must_clarify: ['intent'] }],
  ['مغازه تو بازار می‌خوام', { category: 'estate', property_type: 'shop', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['آپارتمان نزدیک دانشگاه می‌خوام', { category: 'estate', property_type: 'apartment', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['خونه بزرگ در اطراف تهران می‌خوام', { category: 'estate', location: { city: 'تهران', needs_clarification: true }, must_clarify: ['location.neighborhood'] }],
  ['اجاره مسکونی می‌خوام منطقه خوب', { category: 'estate', intent: 'rent', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['زمین تو شهرک می‌خوام', { category: 'estate', property_type: 'land', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['آپارتمان تو خیابان اصلی', { category: 'estate', property_type: 'apartment', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['جنوب شهر دنبال مغازه‌ام', { category: 'estate', property_type: 'shop', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['نزدیک مترو آپارتمان می‌خوام', { category: 'estate', property_type: 'apartment', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['منطقه ۱ یا ۲ می‌خوام', { category: 'estate', location: { needs_clarification: true }, must_clarify: ['location.city', 'intent'] }],
  ['آپارتمان در غرب تهران', { category: 'estate', property_type: 'apartment', location: { city: 'تهران' } }],
  ['ویلا کنار جاده چالوس', { category: 'estate', property_type: 'villa', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['خونه نزدیک پارک', { category: 'estate', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['مغازه تو پاساژ', { category: 'estate', property_type: 'shop', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['آپارتمان محله آروم', { category: 'estate', property_type: 'apartment', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['خونه در ییلاق', { category: 'estate', location: { needs_clarification: true, ambiguous: true }, must_clarify: ['location.city'] }],
  ['زمین بیرون شهر', { category: 'estate', property_type: 'land', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['ملک تو بافت مرکزی', { category: 'estate', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
  ['نزدیک فرودگاه دفتر می‌خوام', { category: 'estate', property_type: 'office', location: { needs_clarification: true }, must_clarify: ['location.city'] }],
];

const D: CaseDef[] = [
  ['می‌خوام رهن بدم', { category: 'estate', intent: ['lease_out', 'full_mortgage'], must_clarify: ['property_type', 'location.city'] }],
  ['دنبال ملک هستم', { category: 'estate', must_clarify: ['intent', 'property_type', 'location.city'] }],
  ['یه چیز خوب تو تهران', { category: 'estate', location: { city: 'تهران' }, must_clarify: ['intent', 'property_type'] }],
  ['رهن اجاره می‌خوام', { category: 'estate', intent: 'rent_mortgage', must_clarify: ['property_type', 'budget'] }],
  ['خرید می‌خوام', { category: 'estate', intent: 'buy', must_clarify: ['property_type', 'location.city'] }],
  ['ملک تجاری', { category: 'estate', property_type: ['shop', 'office', 'mixed'], must_clarify: ['intent', 'location.city'] }],
  ['دارم دنبال جایی می‌گردم', { category: 'estate', must_clarify: ['intent', 'property_type'] }],
  ['پیش‌خرید', { category: 'estate', intent: 'pre_purchase', must_clarify: ['property_type', 'location.city'] }],
  ['مشارکت', { category: 'estate', intent: 'partnership', must_clarify: ['location.city', 'area'] }],
  ['اجاره بدم', { category: 'estate', intent: 'lease_out', must_clarify: ['property_type', 'location.city'] }],
  ['ملک کلنگی', { category: 'estate', property_type: 'land', intent: 'buy', must_clarify: ['location.city'] }],
  ['سرمایه‌گذاری', { category: 'estate', intent: 'investment', must_clarify: ['property_type', 'location.city'] }],
  ['یه واحد', { category: 'estate', must_clarify: ['intent', 'location.city'] }],
  ['یه ملک برای بچه‌ام', { category: 'estate', must_clarify: ['intent', 'property_type'] }],
  ['ملک جهیزیه', { category: 'estate', intent: 'buy', must_clarify: ['property_type', 'location.city'] }],
];

export const ESTATE_BENCHMARK_CASES: EstateBenchmarkCase[] = [
  ...build('A', A),
  ...build('B', B),
  ...build('C', C),
  ...build('D', D),
];
