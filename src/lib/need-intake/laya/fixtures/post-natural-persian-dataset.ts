export interface PostNaturalExpected {
  area?: number;
  rooms?: number;
  budgetMin?: number;
  budgetMax?: number;
  rahnAmount?: number;
  monthlyRent?: number;
  transactionType?: string;
  propertyKind?: string;
  city?: string;
  neighborhood?: string;
  amenities?: string[];
  amenitiesExcluded?: string[];
  categoryIncludes?: string[];
  unknown?: string[];
}

export interface PostNaturalDatasetCase {
  id: string;
  text: string;
  expected: PostNaturalExpected;
}

/**
 * Small, reviewable Persian acceptance set for the /post hybrid extractor.
 * These are intentionally varied: colloquial spelling, Persian/Latin digits,
 * omitted fields, negatives, ranges, sales, rent, services, and office needs.
 */
export const POST_NATURAL_PERSIAN_DATASET: PostNaturalDatasetCase[] = [
  {
    id: 'mashhad-shop-joined-neighborhood-and-rent',
    text: 'من یک مغازه میخوام برای لوازم آرایشی محدوده فرامرزعباسی ۱ ملیارد رهن دارم ۲۰۰ میلیون اجاره',
    expected: {
      transactionType: 'DEPOSIT_AND_RENT',
      propertyKind: 'shop',
      city: 'مشهد',
      neighborhood: 'فرامرزعباسی',
      rahnAmount: 1_000_000_000,
      monthlyRent: 200_000_000,
      categoryIncludes: ['shop-rent'],
      unknown: ['budgetMax'],
    },
  },
  {
    id: 'mashhad-mezon-root-services-hint',
    text: 'یک واحد برای مزون میخوام حاشیه فردوسی بین ثمانه و مهدی حداکثر ۱۰۰ میلیون اجاره سیصد میلیون رهن میخوام قرارداد ۲ ساله بنویسم',
    expected: {
      transactionType: 'DEPOSIT_AND_RENT',
      propertyKind: 'shop',
      monthlyRent: 100_000_000,
      rahnAmount: 300_000_000,
      categoryIncludes: ['shop-rent'],
      unknown: ['budgetMax', 'area'],
    },
  },
  {
    id: 'main-mashhad-salon',
    text: 'یک محیط حدود ۱۳۵ متری حوالی فردوسی مشهد برای سالن آرایش می‌خوام، اجاره باشه، پارکینگ و آسانسور داشته باشه، تا ۸۰۰ میلیون رهن و ۵۰ میلیون اجاره.',
    expected: {
      area: 135,
      rahnAmount: 800_000_000,
      monthlyRent: 50_000_000,
      transactionType: 'DEPOSIT_AND_RENT',
      propertyKind: 'shop',
      city: 'مشهد',
      neighborhood: 'فردوسی',
      amenities: ['parking', 'elevator'],
      categoryIncludes: ['shop-rent'],
    },
  },
  {
    id: 'apartment-rent-mashhad',
    text: 'آپارتمان ۱۳۵ متری فردوسی مشهد برای اجاره می‌خوام، دو خواب با پارکینگ.',
    expected: { area: 135, rooms: 2, transactionType: 'RENT', propertyKind: 'apartment', city: 'مشهد', neighborhood: 'فردوسی', amenities: ['parking'] },
  },
  {
    id: 'tehran-buy',
    text: 'یک آپارتمان ۸۰ متری در پونک تهران برای خرید، حداقل دو خواب و آسانسور.',
    expected: { area: 80, rooms: 2, transactionType: 'BUY', propertyKind: 'apartment', city: 'تهران', neighborhood: 'پونک', amenities: ['elevator'] },
  },
  {
    id: 'villa-sale',
    text: 'ویلای ۲۵۰ متری حوالی لاهیجان برای فروش می‌خواهم، تا ۱۲ میلیارد بودجه.',
    expected: { area: 250, transactionType: 'BUY', propertyKind: 'villa', city: 'لاهیجان', budgetMax: 12_000_000_000 },
  },
  {
    id: 'shop-sale',
    text: 'مغازه ۷۰ متری در احمدآباد مشهد برای خرید با بودجه ۶ میلیارد.',
    expected: { area: 70, transactionType: 'BUY', propertyKind: 'shop', city: 'مشهد', neighborhood: 'احمدآباد', budgetMax: 6_000_000_000 },
  },
  {
    id: 'office-rent',
    text: 'دفتر کار حدود ۱۱۰ متر در سجاد مشهد اجاره‌ای، سه اتاق و پارکینگ لازم دارم.',
    expected: { area: 110, transactionType: 'RENT', propertyKind: 'office', city: 'مشهد', neighborhood: 'سجاد', amenities: ['parking'] },
  },
  {
    id: 'land-sale',
    text: 'زمین ۴۰۰ متری در اطراف شیراز برای ساخت ویلا می‌خرم، حداکثر ۴ میلیارد.',
    expected: { area: 400, transactionType: 'BUY', propertyKind: 'land', city: 'شیراز', budgetMax: 4_000_000_000 },
  },
  {
    id: 'full-deposit',
    text: 'خانه دو خوابه در گیشا تهران می‌خوام، ۵۰۰ میلیون رهن کامل.',
    expected: { rooms: 2, transactionType: 'FULL_DEPOSIT', propertyKind: 'apartment', city: 'تهران', neighborhood: 'گیشا', rahnAmount: 500_000_000 },
  },
  {
    id: 'rent-and-deposit-words',
    text: 'یه واحد صد متری در وکیل‌آباد مشهد برای رهن و اجاره، ۳۰۰ میلیون رهن و ماهی بیست تومن.',
    expected: { area: 100, transactionType: 'DEPOSIT_AND_RENT', propertyKind: 'apartment', city: 'مشهد', neighborhood: 'وکیل‌آباد', rahnAmount: 300_000_000, monthlyRent: 20_000_000 },
  },
  {
    id: 'area-range',
    text: 'آپارتمان بین ۱۲۰ تا ۱۵۰ متر در سعادت‌آباد تهران برای خرید.',
    expected: { transactionType: 'BUY', propertyKind: 'apartment', city: 'تهران', neighborhood: 'سعادت‌آباد', categoryIncludes: ['apartment-sale'], unknown: ['area'] },
  },
  {
    id: 'no-parking',
    text: 'دفتر اداری ۹۰ متری در تبریز می‌خوام، پارکینگ نمی‌خوام و اجاره‌ای باشه.',
    expected: { area: 90, transactionType: 'RENT', propertyKind: 'office', city: 'تبریز', amenitiesExcluded: ['parking'] },
  },
  {
    id: 'no-elevator',
    text: 'خانه ۷۵ متری در کرج می‌خوام، آسانسور نمی‌خوام، برای خرید.',
    expected: { area: 75, transactionType: 'BUY', propertyKind: 'apartment', city: 'کرج', amenitiesExcluded: ['elevator'] },
  },
  {
    id: 'one-bedroom',
    text: 'یک آپارتمان نقلی یک خواب نزدیک میدان ونک تهران برای اجاره.',
    expected: { transactionType: 'RENT', propertyKind: 'apartment', city: 'تهران', neighborhood: 'ونک', area: 50 },
  },
  {
    id: 'office-deed',
    text: 'دفتر ۶۵ متری در یوسف‌آباد با سند تک برگ برای خرید می‌خواهم.',
    expected: { area: 65, transactionType: 'BUY', propertyKind: 'office', neighborhood: 'یوسف‌آباد', unknown: ['city'] },
  },
  {
    id: 'attorney-deed',
    text: 'مغازه ۴۵ متری وکالتی در رشت برای فروش پیدا کن.',
    expected: { area: 45, transactionType: 'SELL', propertyKind: 'shop', city: 'رشت' },
  },
  {
    id: 'studio',
    text: 'سوئیت حدود ۴۰ متری در قم برای اجاره ماهی ۸ میلیون.',
    expected: { area: 40, transactionType: 'RENT', city: 'قم', monthlyRent: 8_000_000 },
  },
  {
    id: 'minimum-budget',
    text: 'آپارتمان در الهیه تهران می‌خواهم، حداقل ۱۰ میلیارد بودجه و سه خواب.',
    expected: { rooms: 3, propertyKind: 'apartment', city: 'تهران', neighborhood: 'الهیه', budgetMin: 10_000_000_000, unknown: ['transactionType'] },
  },
  {
    id: 'budget-billion',
    text: 'برای خرید یک خانه در اصفهان تا ۸ میلیارد تومان کنار گذاشته‌ام.',
    expected: { transactionType: 'BUY', propertyKind: 'apartment', city: 'اصفهان', budgetMax: 8_000_000_000 },
  },
  {
    id: 'english-digits',
    text: 'واحد 95 متری در مرزداران تهران برای خرید می‌خوام، دو خواب و انباری.',
    expected: { area: 95, rooms: 2, transactionType: 'BUY', propertyKind: 'apartment', city: 'تهران', neighborhood: 'مرزداران', amenities: ['storage'] },
  },
  {
    id: 'arabic-digits',
    text: 'آپارتمان ١٢٠ متری در شیراز برای اجاره با آسانسور.',
    expected: { area: 120, transactionType: 'RENT', propertyKind: 'apartment', city: 'شیراز', amenities: ['elevator'] },
  },
  {
    id: 'commercial-unknown',
    text: 'یه فضای تجاری حدود ۷۰ متر در اهواز لازم دارم.',
    expected: { area: 70, city: 'اهواز', unknown: ['transactionType', 'propertyKind'] },
  },
  {
    id: 'beauty-business',
    text: 'برای آرایشگاه یک جای ۸۰ متری اطراف هفت‌تیر تهران می‌خواهم.',
    expected: { area: 80, propertyKind: 'shop', city: 'تهران', neighborhood: 'هفت‌تیر', unknown: ['transactionType'] },
  },
  {
    id: 'salon-monthly',
    text: 'سالن زیبایی ۱۲۰ متری در مشهد، اجاره ماهانه تا ۳۰ میلیون.',
    expected: { area: 120, propertyKind: 'shop', city: 'مشهد', transactionType: 'RENT', monthlyRent: 30_000_000 },
  },
  {
    id: 'warehouse-rent',
    text: 'سوله ۵۰۰ متری در شهرک صنعتی کرج برای اجاره، حداقل ۱۰ کامیون جا شود.',
    expected: { area: 500, propertyKind: 'industrial', city: 'کرج', transactionType: 'RENT' },
  },
  {
    id: 'house-rent',
    text: 'خانه حیاط‌دار ۱۸۰ متری در رشت برای اجاره می‌خواهم، پارکینگ داشته باشد.',
    expected: { area: 180, propertyKind: 'apartment', city: 'رشت', transactionType: 'RENT', amenities: ['parking'] },
  },
  {
    id: 'buy-with-range',
    text: 'خونه ۱۰۰ تا ۱۲۰ متری در اصفهان می‌خوام برای خرید.',
    expected: { transactionType: 'BUY', propertyKind: 'apartment', city: 'اصفهان', unknown: ['area'] },
  },
  {
    id: 'monthly-rent-colloquial',
    text: 'یه خونه دو خوابه تو نارمک تهران می‌خوام، ماهی چهل تومن اجاره.',
    expected: { rooms: 2, propertyKind: 'apartment', city: 'تهران', neighborhood: 'نارمک', transactionType: 'RENT', monthlyRent: 40_000_000 },
  },
  {
    id: 'deposit-colloquial',
    text: 'واحد ۶۰ متری توی پیروزی تهران، رهنش پانصد میلیونه و اجاره نداره.',
    expected: { area: 60, propertyKind: 'apartment', city: 'تهران', neighborhood: 'پیروزی', transactionType: 'FULL_DEPOSIT', rahnAmount: 500_000_000 },
  },
  {
    id: 'furnished',
    text: 'آپارتمان مبله ۷۰ متری در کیش برای اجاره کوتاه‌مدت می‌خواهم.',
    expected: { area: 70, propertyKind: 'apartment', transactionType: 'DAILY_RENT', city: 'کیش' },
  },
  {
    id: 'office-purchase',
    text: 'دفتر اداری ۱۵۰ متر با آسانسور در اصفهان برای خرید، سند رسمی.',
    expected: { area: 150, propertyKind: 'office', transactionType: 'BUY', city: 'اصفهان', amenities: ['elevator'] },
  },
  {
    id: 'shop-rent-budget',
    text: 'مغازه ۳۵ متری در انقلاب تهران اجاره می‌خوام، ماهی ۲۵ میلیون.',
    expected: { area: 35, propertyKind: 'shop', transactionType: 'RENT', city: 'تهران', neighborhood: 'انقلاب', monthlyRent: 25_000_000 },
  },
  {
    id: 'land-tehran',
    text: 'زمین ۳۰۰ متر حوالی شهریار برای خرید با بودجه ۳ میلیارد.',
    expected: { area: 300, propertyKind: 'land', transactionType: 'BUY', city: 'شهریار', budgetMax: 3_000_000_000 },
  },
  {
    id: 'apartment-unknown-transaction',
    text: 'آپارتمان ۹۰ متری در جردن تهران با دو خواب و پارکینگ.',
    expected: { area: 90, rooms: 2, propertyKind: 'apartment', city: 'تهران', neighborhood: 'جردن', amenities: ['parking'], unknown: ['transactionType'] },
  },
  {
    id: 'vila-misspelling',
    text: 'ویلای ۲۰۰ متری اطراف رامسر میخوام، خرید یا رهن فرقی نداره.',
    expected: { area: 200, propertyKind: 'villa', city: 'رامسر', unknown: ['transactionType'] },
  },
  {
    id: 'minimum-area',
    text: 'دفتر کار حداقل ۸۰ متر در مرکز شهر تبریز برای اجاره.',
    expected: { area: 80, propertyKind: 'office', city: 'تبریز', transactionType: 'RENT' },
  },
  {
    id: 'maximum-area',
    text: 'مغازه حداکثر ۵۰ متر در بلوار کشاورز تهران برای اجاره.',
    expected: { area: 50, propertyKind: 'shop', city: 'تهران', transactionType: 'RENT' },
  },
  {
    id: 'four-plus-rooms',
    text: 'خانه بزرگ چهار خواب در فرمانیه تهران برای خرید.',
    expected: { rooms: 4, propertyKind: 'apartment', city: 'تهران', neighborhood: 'فرمانیه', transactionType: 'BUY' },
  },
  {
    id: 'storage-positive',
    text: 'آپارتمان ۸۵ متری در مشهد برای خرید، انباری و آسانسور داشته باشد.',
    expected: { area: 85, propertyKind: 'apartment', city: 'مشهد', transactionType: 'BUY', amenities: ['storage', 'elevator'] },
  },
  {
    id: 'storage-negative',
    text: 'آپارتمان ۷۰ متری در کرج برای اجاره، انباری لازم نیست.',
    expected: { area: 70, propertyKind: 'apartment', city: 'کرج', transactionType: 'RENT', unknown: ['storage'] },
  },
  {
    id: 'power-of-attorney',
    text: 'دفتر ۴۰ متری با سند وکالتی در اصفهان برای خرید می‌خواهم.',
    expected: { area: 40, propertyKind: 'office', city: 'اصفهان', transactionType: 'BUY' },
  },
  {
    id: 'rahn-rent-english',
    text: 'واحد ۱۱۰ متری در صادقیه تهران، 1 میلیارد رهن و 35 میلیون اجاره.',
    expected: { area: 110, propertyKind: 'apartment', city: 'تهران', neighborhood: 'صادقیه', transactionType: 'DEPOSIT_AND_RENT', rahnAmount: 1_000_000_000, monthlyRent: 35_000_000 },
  },
  {
    id: 'short-rent',
    text: 'آپارتمان ۶۰ متری در مشهد برای اجاره روزانه می‌خواهم.',
    expected: { area: 60, propertyKind: 'apartment', city: 'مشهد', transactionType: 'DAILY_RENT' },
  },
  {
    id: 'service-repair',
    text: 'برای تعمیر کولر گازی در تهران یک تعمیرکار مطمئن می‌خواهم.',
    expected: { city: 'تهران', categoryIncludes: ['ac-repair'], unknown: ['area', 'transactionType'] },
  },
  {
    id: 'service-cleaning',
    text: 'نظافتچی برای دفتر کار در شیراز لازم دارم، فوری.',
    expected: { city: 'شیراز', categoryIncludes: ['cleaning'], unknown: ['area', 'transactionType'] },
  },
  {
    id: 'service-lawyer',
    text: 'برای پرونده ملکی در مشهد وکیل پایه یک می‌خواهم.',
    expected: { city: 'مشهد', categoryIncludes: ['legal-services'], unknown: ['area', 'transactionType'] },
  },
  {
    id: 'service-photographer',
    text: 'عکاس برای مراسم عروسی در اصفهان می‌خواهم.',
    expected: { city: 'اصفهان', unknown: ['area', 'transactionType'] },
  },
  {
    id: 'typo-colloquial',
    text: 'یه اپارتمان حدود ۷۸ متری توی مشهد میخام، اسانسور و پارکینگ داشته باشه برای اجاره.',
    expected: { area: 78, city: 'مشهد', propertyKind: 'apartment', transactionType: 'RENT', amenities: ['parking'] },
  },
  {
    id: 'no-city',
    text: 'یک دفتر ۱۰۰ متری برای خرید می‌خواهم، سه خواب لازم نیست.',
    expected: { area: 100, propertyKind: 'office', transactionType: 'BUY', unknown: ['city', 'rooms'] },
  },
  {
    id: 'no-numeric',
    text: 'مغازه مناسب برای اجاره در مرکز شهر می‌خواهم، عدد بودجه را بعداً می‌گویم.',
    expected: { propertyKind: 'shop', transactionType: 'RENT', unknown: ['area', 'budgetMax', 'city'] },
  },
  {
    id: 'house-with-amenities',
    text: 'خانه ۱۴۰ متری در گلبهار مشهد برای خرید با پارکینگ، آسانسور و انباری.',
    expected: { area: 140, propertyKind: 'apartment', transactionType: 'BUY', city: 'مشهد', neighborhood: 'گلبهار', amenities: ['parking', 'elevator', 'storage'] },
  },
  {
    id: 'office-range-budget',
    text: 'دفتر ۱۲۰ تا ۱۵۰ متری در ونک برای اجاره، ماهی حداکثر ۶۰ میلیون.',
    expected: { propertyKind: 'office', transactionType: 'RENT', neighborhood: 'ونک', monthlyRent: 60_000_000, unknown: ['area'] },
  },
  {
    id: 'sale-million',
    text: 'آپارتمان ۷۰ متری در قاسم‌آباد مشهد برای فروش، حدود ۴ میلیارد تومان.',
    expected: { area: 70, propertyKind: 'apartment', transactionType: 'SELL', city: 'مشهد', neighborhood: 'قاسم‌آباد', budgetMax: 4_000_000_000 },
  },
  {
    id: 'land-no-city',
    text: 'زمین حداقل ۵۰۰ متر برای خرید و ساخت باغ می‌خواهم.',
    expected: { area: 500, propertyKind: 'land', transactionType: 'BUY', unknown: ['city'] },
  },
  {
    id: 'rental-no-amenity',
    text: 'واحد مسکونی برای اجاره در تهران می‌خواهم، امکانات خاصی مهم نیست.',
    expected: { propertyKind: 'apartment', transactionType: 'RENT', city: 'تهران', unknown: ['area', 'parking', 'elevator', 'storage'] },
  },
];
