/**
 * Batch 11 — rent→buy corrections + budget ranges
 * Run: npx tsx src/intake/smart-extractor/tests/batch11-budget-range-self-test.ts
 */
import { extractSmartFields } from '@/intake/smart-extractor/smart-field-extractor';

type Expect = {
  type?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  depositMin?: number;
  depositMax?: number;
  rentMin?: number;
  rentMax?: number;
  categoryIncludes?: string;
};

const CASES: Array<{ id: string; text: string; expect: Expect }> = [
  {
    id: 'buy-corr-1',
    text: 'رهن اجاره می‌خواستم ولی نه راستش می‌خوام بخرم بودجه ۲ میلیارد',
    expect: { type: 'BUY', budgetMin: 2_000_000_000, budgetMax: 2_000_000_000 },
  },
  {
    id: 'buy-corr-2',
    text: 'اجاره آپارتمان سعادت آباد. اجاره نه، خرید بودجه ۳ میلیارد',
    expect: { type: 'BUY', budgetMax: 3_000_000_000 },
  },
  {
    id: 'buy-corr-3',
    text: 'می‌خوام اجاره کنم. نه بخرم بهتره بودجه ۱.۵ میلیارد',
    expect: { type: 'BUY' },
  },
  {
    id: 'range-buy-1',
    text: 'خرید آپارتمان بین ۵۰۰ تا ۷۰۰ میلیون در ونک',
    expect: { type: 'BUY', budgetMin: 500_000_000, budgetMax: 700_000_000 },
  },
  {
    id: 'range-buy-2',
    text: 'آپارتمان برای خرید بین 2 تا 4 میلیارد در سعادت آباد',
    expect: { type: 'BUY', budgetMin: 2_000_000_000, budgetMax: 4_000_000_000 },
  },
  {
    id: 'ceil-1',
    text: 'خرید آپارتمان زیر ۵۰۰ میلیون تهران',
    expect: { type: 'BUY', budgetMin: null, budgetMax: 500_000_000 },
  },
  {
    id: 'floor-1',
    text: 'خرید آپارتمان بالای ۳۰۰ میلیون جردن',
    expect: { type: 'BUY', budgetMin: 300_000_000, budgetMax: null },
  },
  {
    id: 'ceil-b',
    text: 'خرید آپارتمان کمتر از ۲ میلیارد نیاوران',
    expect: { type: 'BUY', budgetMin: null, budgetMax: 2_000_000_000 },
  },
  {
    id: 'floor-b',
    text: 'خرید آپارتمان بیشتر از ۱ میلیارد پاسداران',
    expect: { type: 'BUY', budgetMin: 1_000_000_000, budgetMax: null },
  },
  {
    id: 'rent-range-1',
    text: 'آپارتمان اجاره رهن ۲۰۰ تا ۳۰۰ میلیون اجاره ۵ تا ۷ میلیون در سجاد',
    expect: {
      type: 'DEPOSIT_AND_RENT',
      depositMin: 200_000_000,
      depositMax: 300_000_000,
      rentMin: 5_000_000,
      rentMax: 7_000_000,
    },
  },
  {
    id: 'rent-range-2',
    text: 'رهن بین ۱۵۰ تا ۲۵۰ میلیون اجاره ماهانه ۸ تا ۱۰ میلیون احمدآباد',
    expect: { depositMin: 150_000_000, depositMax: 250_000_000 },
  },
  {
    id: 'guard-rent',
    text: 'می‌خوام یه آپارتمان بخرم. راستش نه، می‌خوام رهن کنم، رهن ۵۰۰ میلیون',
    expect: { type: 'FULL_DEPOSIT' },
  },
  {
    id: 'guard-presale',
    text: 'الان رهن‌نشین‌ام رهن ۵۰۰ میلیون اجاره ۱۵ میلیون شهرک غرب راستش می‌خوام پیش‌فروش بخرم بودجه ۳ میلیارد',
    expect: { type: 'BUY', categoryIncludes: 'pre-sale' },
  },
  {
    id: 'guard-buy8',
    text: 'آپارتمان اجاره‌ای وکیل‌آباد ۱۵ میلیون رهن ۲ میلیون اجاره راستش می‌خوام بخرم بودجه ۲ میلیارد',
    expect: { type: 'BUY' },
  },
  {
    id: 'last-wins',
    text: 'می‌خوام بخرم. راستش نه می‌خوام رهن کنم رهن ۲۰۰ میلیون. صبر کن راستش می‌خوام بخرم بودجه ۱ میلیارد',
    expect: { type: 'BUY', budgetMax: 1_000_000_000 },
  },
];

async function main() {
  let failed = 0;
  for (const c of CASES) {
    const r = await extractSmartFields(c.text, '', { useAI: false });
    const errs: string[] = [];
    if (c.expect.type && r.transaction.type !== c.expect.type) {
      errs.push(`type=${r.transaction.type} want ${c.expect.type}`);
    }
    if (c.expect.budgetMin !== undefined && r.budget.min !== c.expect.budgetMin) {
      errs.push(`min=${r.budget.min} want ${c.expect.budgetMin}`);
    }
    if (c.expect.budgetMax !== undefined && r.budget.max !== c.expect.budgetMax) {
      errs.push(`max=${r.budget.max} want ${c.expect.budgetMax}`);
    }
    if (c.expect.depositMin != null && r.budget.depositMin !== c.expect.depositMin) {
      errs.push(`depMin=${r.budget.depositMin}`);
    }
    if (c.expect.depositMax != null && r.budget.depositMax !== c.expect.depositMax) {
      errs.push(`depMax=${r.budget.depositMax}`);
    }
    if (c.expect.rentMin != null && r.budget.rentMin !== c.expect.rentMin) {
      errs.push(`rentMin=${r.budget.rentMin}`);
    }
    if (c.expect.rentMax != null && r.budget.rentMax !== c.expect.rentMax) {
      errs.push(`rentMax=${r.budget.rentMax}`);
    }
    if (c.expect.categoryIncludes) {
      const cat = `${r.category.value}|${r.category.subcategory}`;
      if (!cat.includes(c.expect.categoryIncludes)) errs.push(`cat=${cat}`);
    }
    if (errs.length) {
      failed += 1;
      console.error(`FAIL ${c.id}: ${errs.join('; ')}`);
    } else console.log(`OK ${c.id}`);
  }
  console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
  if (failed) process.exit(1);
}

void main();
