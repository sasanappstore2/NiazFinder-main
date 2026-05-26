/** Persian rule-parser fixtures (no LLM). Run via npm run test:intake-parser */
export interface ParserFixture {
  id: string;
  text: string;
  expectIntentPrefix?: string;
  expectCategoryIncludes?: string;
  expectDealType?: string;
  expectCity?: string;
}

export const PARSER_FIXTURES: ParserFixture[] = [
  {
    id: 'property-rahn-full',
    text: 'آپارتمان دو خواب رهن کامل غرب تهران تا ۲ میلیارد',
    expectIntentPrefix: 'property',
    expectDealType: 'rent_rahn_full',
    expectCity: 'تهران',
  },
  {
    id: 'property-rahn-ejare',
    text: 'رهن و اجاره آپارتمان ۹۰ متری سعادت‌آباد',
    expectIntentPrefix: 'property',
    expectDealType: 'rent_rahn_ejare',
  },
  {
    id: 'property-buy',
    text: 'میخوام آپارتمان ۱۰۰ متری در مشهد بخرم',
    expectIntentPrefix: 'property',
    expectDealType: 'buy',
    expectCity: 'مشهد',
  },
  {
    id: 'vehicle-buy',
    text: 'دنبال پژو ۲۰۶ سفید کارکرده در اصفهان',
    expectIntentPrefix: 'vehicle',
    expectCategoryIncludes: 'car',
    expectDealType: 'buy',
    expectCity: 'اصفهان',
  },
  {
    id: 'product-phone',
    text: 'گوشی آیفون ۱۳ کارکرده میخرم تهران',
    expectIntentPrefix: 'product',
    expectCategoryIncludes: 'mobile',
    expectDealType: 'buy',
  },
  {
    id: 'service-repair',
    text: 'تعمیرکار کولر گازی فوری غرب تهران',
    expectIntentPrefix: 'service',
    expectCategoryIncludes: 'repair',
    expectCity: 'تهران',
  },
  {
    id: 'job-hire',
    text: 'استخدام برنامه نویس فرانت‌اند ریموت',
    expectIntentPrefix: 'job',
    expectCategoryIncludes: 'it',
  },
  {
    id: 'property-sell',
    text: 'میفروشم ویلا ۳۰۰ متری شمال',
    expectIntentPrefix: 'property',
    expectDealType: 'sell',
  },
  {
    id: 'vehicle-sell',
    text: 'پراید ۱۳۱ مدل ۹۸ میفروشم',
    expectIntentPrefix: 'vehicle',
    expectDealType: 'sell',
  },
  {
    id: 'product-sell',
    text: 'لپ تاپ دل میفروشم',
    expectIntentPrefix: 'product',
    expectDealType: 'sell',
  },
  {
    id: 'moving-tehran',
    text: 'اسباب کشی از تهران به کرج فردا',
    expectIntentPrefix: 'service',
    expectCategoryIncludes: 'moving',
    expectCity: 'تهران',
  },
  {
    id: 'plumbing-urgent',
    text: 'لوله‌کشی فوری نشتی آب',
    expectIntentPrefix: 'service',
    expectCategoryIncludes: 'plumbing',
  },
  {
    id: 'agency-real-estate',
    text: 'آژانس املاک برای فروش آپارتمان در شیراز',
    expectCategoryIncludes: 'agency',
    expectCity: 'شیراز',
  },
  {
    id: 'pre-sale',
    text: 'پیش‌فروش واحد در پروژه جدید',
    expectCategoryIncludes: 'pre-sale',
  },
];
