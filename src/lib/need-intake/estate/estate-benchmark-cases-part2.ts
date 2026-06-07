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

const E: CaseDef[] = [
  ['آپارتمان ۸۰ تا ۱۰۰ متر با پارکینگ و آسانسور، ترجیحاً جنوبی، طبقه ۳ به بالا، منطقه یک تهران. بودجه ۵ تا ۶ میلیارد', { category: 'estate', intent: 'buy', property_type: 'apartment', location: { city: 'تهران' }, area: { min: 80, max: 100 }, features: { parking: true, elevator: true, direction: 'south' } }],
  ['مشارکت در ساخت. زمین ۲۰۰ متری دارم تو اصفهان خیابان چهارباغ. ۵۰-۵۰ می‌خوام. آپارتمان می‌زنیم', { category: 'estate', intent: 'partnership', property_type: 'land', location: { city: 'اصفهان' }, area: { exact: 200 } }],
  ['اجاره بلندمدت. آپارتمان مبله، ۲ خواب، تهران، نزدیک مترو، برای ۶ ماه', { category: 'estate', intent: 'rent', property_type: 'apartment', location: { city: 'تهران' }, rooms: 2, features: { furnished: true } }],
  ['دنبال آپارتمان ۳ خوابه ۱۲۰ تا ۱۵۰ متر در شمال تهران، حداکثر ۵ سال، طبقه بالا، با انباری و پارکینگ. رهن ۵۰۰ میلیون اجاره ۸ میلیون', { category: 'estate', intent: 'rent_mortgage', property_type: 'apartment', location: { city: 'تهران' }, rooms: 3, area: { min: 120, max: 150 }, budget: { mortgage: { amount: 500_000_000 }, rent: { amount: 8_000_000 } }, features: { storage: true, parking: true } }],
  ['پیش‌خرید آپارتمان ۲ خوابه در برج نیمه‌کاره در کرج. پول نقد دارم ولی تحویل زود می‌خوام حداکثر ۱ سال دیگه', { category: 'estate', intent: 'pre_purchase', property_type: 'apartment', location: { city: 'کرج' }, rooms: 2 }],
  ['ویلای اجاره‌ای برای تعطیلات نوروز، ۳ خواب، کنار دریا، ماهانه نه روزانه', { category: 'estate', intent: 'rent', property_type: 'villa', rooms: 3 }],
  ['کارگاه ۵۰۰ تا ۸۰۰ متر با برق صنعتی و بارانداز، بیرون تهران ولی نزدیک جاده قم', { category: 'estate', property_type: 'warehouse', area: { min: 500, max: 800 }, location: { city: 'تهران' } }],
  ['دنبال خرید آپارتمان برای سرمایه‌گذاری. شمال تهران. ۲ خواب کافیه. باید اجاره‌پذیر باشه. ۴ تا ۵ میلیارد', { category: 'estate', intent: 'investment', property_type: 'apartment', location: { city: 'تهران' }, rooms: 2 }],
  ['زمین مسکونی با جواز ساخت، تهران، منطقه ۵ یا ۲۲، ۲۰۰ تا ۳۰۰ متر', { category: 'estate', property_type: 'land', location: { city: 'تهران' }, area: { min: 200, max: 300 } }],
  ['خانه کلنگی داری با متراژ بالای ۲۵۰ متر زمین؟ تهران قدیم، می‌خوام بکوبم بزنم برج', { category: 'estate', intent: 'buy', property_type: 'land', location: { city: 'تهران' }, area: { min: 250 } }],
  ['دفتر اداری ۱۰۰ تا ۱۵۰ متر، برج تجاری، تهران مرکز، با پارکینگ جداگانه', { category: 'estate', intent: ['buy', 'rent'], property_type: 'office', location: { city: 'تهران' }, area: { min: 100, max: 150 }, features: { parking: true } }],
  ['مغازه تو مرکز خرید اجاره می‌خوام. حداقل ۶۰ متر. ویترین‌دار باشه', { category: 'estate', intent: 'rent', property_type: 'shop', area: { min: 60 } }],
  ['اجاره آپارتمان ۱۸۰ متری، ۳ خوابه، مبله کامل، شمال تهران، اجاره ماهانه ۲۰ میلیون', { category: 'estate', intent: 'rent', property_type: 'apartment', location: { city: 'تهران' }, rooms: 3, area: { exact: 180 }, budget: { rent: { amount: 20_000_000 } }, features: { furnished: true } }],
  ['خرید آپارتمان ۲ خوابه تهران. سند شخصی بخوام. وام‌دار نباشه. زیر ۳.۵ میلیارد', { category: 'estate', intent: 'buy', property_type: 'apartment', location: { city: 'تهران' }, rooms: 2, features: { document_type: 'shakhsi' } }],
  ['مشارکت می‌دم. ۴۰۰ متر زمین ۸ متری بر دارم. تهران، محله نازی‌آباد', { category: 'estate', intent: 'partnership', property_type: 'land', location: { city: 'تهران' }, area: { exact: 400 } }],
  ['آپارتمان تجاری-مسکونی می‌خوام. همکف مغازه، بالاش مسکونی. تبریز مرکز', { category: 'estate', property_type: 'mixed', location: { city: 'تبریز' } }],
  ['رهن کامل آپارتمان. ۱۵۰ تا ۲۰۰ میلیون رهن. هر جایی از تهران قبوله', { category: 'estate', intent: 'full_mortgage', property_type: 'apartment', location: { city: 'تهران' } }],
  ['اجاره انبار بزرگ. ۲۰۰۰ متر. ارتفاع مناسب. نزدیک جاده لجستیک', { category: 'estate', intent: 'rent', property_type: 'warehouse', area: { exact: 2000 } }],
  ['خرید ملک در کیش برای سرمایه‌گذاری. آپارتمان کوچک کافیه', { category: 'estate', intent: 'investment', property_type: 'apartment', location: { city: 'کیش' } }],
  ['زمین باغ نزدیک تهران برای ساخت ویلا. ۱۰۰۰ تا ۲۰۰۰ متر', { category: 'estate', intent: 'buy', property_type: 'land', location: { city: 'تهران' }, area: { min: 1000, max: 2000 } }],
];

const F: CaseDef[] = [
  ['آپارتمان ۷۰ متری تهران. ۵۰۰ تومن داری؟', { category: 'estate', intent: 'rent', property_type: 'apartment', location: { city: 'تهران' }, area: { exact: 70 }, budget: { rent: { amount: 500_000 } } }],
  ['خونه می‌خوام. ۵۰۰ تومن دارم', { category: 'estate', intent: 'buy', budget: { purchase_price: { max: 500_000_000 } } }],
  ['رهن ۳۰۰ اجاره ۵', { category: 'estate', intent: 'rent_mortgage', budget: { mortgage: { amount: 300_000_000 }, rent: { amount: 5_000_000 } } }],
  ['نهصد میلیون بودجه دارم', { category: 'estate', budget: { purchase_price: { max: 900_000_000 } } }],
  ['یه و نیم میلیارد', { category: 'estate', budget: { purchase_price: { max: 1_500_000_000 } } }],
  ['زیر دو میلیارد', { category: 'estate', budget: { purchase_price: { max: 2_000_000_000 } } }],
  ['پانصد تومن ودیعه', { category: 'estate', intent: ['full_mortgage', 'rent_mortgage'], budget: { mortgage: { amount: 500_000_000 } } }],
  ['۲۰۰ تا ۳۰۰', { category: 'estate', must_clarify: ['intent'] }],
  ['بیست و پنج میلیون اجاره', { category: 'estate', intent: 'rent', budget: { rent: { amount: 25_000_000 } } }],
  ['رهن ۵۰۰ اجاره ندارم', { category: 'estate', intent: 'full_mortgage', budget: { mortgage: { amount: 500_000_000 } } }],
  ['قیمتش ۶ تومنه', { category: 'estate', budget: { purchase_price: { max: 6_000_000_000 } } }],
  ['هر متری ۵۰ تومن', { category: 'estate', intent: 'buy' }],
  ['اجاره ماهیانه ۸ میلیون', { category: 'estate', intent: 'rent', budget: { rent: { amount: 8_000_000 } } }],
  ['تا ۱.۵ تومن', { category: 'estate', budget: { purchase_price: { max: 1_500_000_000 } } }],
  ['بیست ملیون تومن اجاره', { category: 'estate', intent: 'rent', budget: { rent: { amount: 20_000_000 } } }],
  ['رهن ۲۰۰ و اجاره ۴', { category: 'estate', intent: 'rent_mortgage', budget: { mortgage: { amount: 200_000_000 }, rent: { amount: 4_000_000 } } }],
  ['قیمت توافقیه', { category: 'estate', must_clarify: ['budget'] }],
  ['هر چی بشه', { category: 'estate', must_clarify: ['budget', 'intent'] }],
  ['نهصد و پنجاه میلیون', { category: 'estate', budget: { purchase_price: { max: 950_000_000 } } }],
  ['سیصد و پنجاه', { category: 'estate', must_clarify: ['intent'] }],
];

const G: CaseDef[] = [
  ['ملک کلنگی می‌خوام', { category: 'estate', intent: 'buy', property_type: 'land' }],
  ['پیش‌خرید می‌کنم', { category: 'estate', intent: 'pre_purchase' }],
  ['خانه مبله می‌خوام', { category: 'estate', features: { furnished: true } }],
  ['بهم‌پیوسته می‌خوام', { category: 'estate', property_type: 'apartment' }],
  ['خانه‌مانی می‌خوام', { category: 'estate', intent: 'rent', property_type: ['apartment', 'house'] }],
  ['تجاری-مسکونی', { category: 'estate', property_type: 'mixed' }],
  ['آپارتمان نقلی', { category: 'estate', property_type: 'apartment', area: { max: 50 } }],
  ['جابجایی داری؟', { category: 'estate', intent: 'swap' }],
  ['خانه ویلایی', { category: 'estate', property_type: 'house' }],
  ['زمین مسکونی با جواز', { category: 'estate', property_type: 'land', intent: 'buy' }],
  ['سند وقفی نمیخوام', { category: 'estate', features: { document_type: 'shakhsi' } }],
  ['تجاری ورودی می‌خوام', { category: 'estate', property_type: 'shop' }],
  ['برج خوب تهران', { category: 'estate', property_type: 'apartment', location: { city: 'تهران' } }],
  ['واحد بر خیابان', { category: 'estate', property_type: ['shop', 'office'] }],
  ['ملک اداری', { category: 'estate', property_type: 'office' }],
  ['مغازه کیوسکی', { category: 'estate', property_type: 'shop' }],
  ['آپارتمان مسکونی خالص', { category: 'estate', property_type: 'apartment' }],
  ['ملک با پایان کار', { category: 'estate', intent: 'buy' }],
  ['نوساز می‌خوام', { category: 'estate', features: { building_age_max: 2 } }],
  ['واحد بانکی', { category: 'estate', property_type: ['office', 'shop'] }],
];

const H: CaseDef[] = [
  ['نه خرید نه اجاره، یه چیزی بین اینها', { category: 'estate', intent: ['full_mortgage', 'rent_mortgage', null], must_clarify: ['intent'] }],
  ['هر چی ارزون‌تره', { category: 'estate', must_clarify: ['intent', 'budget'] }],
  ['دفتر یا خونه، هرکدوم که بشه', { category: 'estate', property_type: ['office', 'apartment', 'house'] }],
  ['می‌خوام بخرم بعداً اجاره بدم', { category: 'estate', intent: 'investment' }],
  ['برادرم میخواد بخره ولی پول کمه', { category: 'estate', intent: 'buy', must_clarify: ['budget'] }],
  ['یه چیز شبیه به این ولی بزرگ‌تر', { category: 'estate', must_clarify: ['property_type'] }],
  ['ملکی که همسایه‌های خوب داشته باشه', { category: 'estate', must_not_clarify: ['features'] }],
  ['آپارتمان یا خونه، فرقی نمی‌کنه', { category: 'estate', property_type: ['apartment', 'house'] }],
  ['می‌خوام اجاره بدم ولی نمی‌دونم بخرم یا نه', { category: 'estate', must_clarify: ['intent'] }],
  ['ملک نه چندان گرون', { category: 'estate', must_clarify: ['budget'] }],
  ['یه جایی که بشه کار و زندگی کرد', { category: 'estate', property_type: ['mixed', 'apartment'] }],
  ['ملکم رو تبدیل به پول کنم', { category: 'estate', intent: 'sell' }],
  ['با وام می‌خرم', { category: 'estate', intent: 'buy' }],
  ['اجاره دادنی ندارن؟', { category: 'estate', intent: 'lease_out' }],
  ['می‌خوام ملک بگیرم بدم کسی کار کنه', { category: 'estate', intent: ['lease_out', 'rent'], property_type: ['shop', 'office'] }],
];

const I: CaseDef[] = [
  ['می‌خوام موبایل بخرم', { category: 'out_of_scope' }],
  ['نیاز به تعمیرکار دارم', { category: 'out_of_scope' }],
  ['دنبال مکانیک هستم', { category: 'out_of_scope' }],
  ['آشپز خوب برای مهمانی', { category: 'out_of_scope' }],
  ['لپ‌تاپ دست دوم می‌خوام', { category: 'out_of_scope' }],
  ['سفر کیش ارزون', { category: 'out_of_scope' }],
  ['کتاب ریاضی دانشگاهی', { category: 'out_of_scope' }],
  ['بیمه ماشینم تموم شده', { category: 'out_of_scope' }],
  ['می‌خوام وام بگیرم', { category: 'out_of_scope' }],
  ['آموزش نرم‌افزار حسابداری', { category: 'out_of_scope' }],
];

export const ESTATE_BENCHMARK_CASES_PART2: EstateBenchmarkCase[] = [
  ...build('E', E),
  ...build('F', F),
  ...build('G', G),
  ...build('H', H),
  ...build('I', I),
];
