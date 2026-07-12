/**
 * Batch 10 — buy→rent correction self-test
 * Run: npx tsx src/intake/smart-extractor/tests/batch10-rent-intent-self-test.ts
 */
import { extractSmartFields } from '@/intake/smart-extractor/smart-field-extractor';

type Expect = {
  type: string;
  categoryIncludes?: string;
  deposit?: number | null;
  rent?: number | null;
  notSale?: boolean;
};

const CASES: Array<{ id: string; text: string; expect: Expect }> = [
  {
    id: 'r1',
    text: 'می‌خوام یه آپارتمان بخرم. راستش نه، می‌خوام رهن کنم، رهن ۵۰۰ میلیون',
    expect: { type: 'FULL_DEPOSIT', deposit: 500_000_000, notSale: true },
  },
  {
    id: 'r2',
    text: 'می‌خوام بخرم. راستش نه می‌خوام اجاره کنم، ۱۵ میلیون اجاره ماهانه',
    expect: { type: 'RENT', rent: 15_000_000, notSale: true },
  },
  {
    id: 'r3',
    text: 'خرید آپارتمان تهران. در واقع اجاره می‌خوام، ۱۰ میلیون اجاره',
    expect: { type: 'RENT', rent: 10_000_000, notSale: true },
  },
  {
    id: 'r4',
    text: 'می‌خوام بخرم ونک. راستش می‌خوام رهن کنم رهن کامل ۲۰۰ میلیون',
    expect: { type: 'FULL_DEPOSIT', deposit: 200_000_000, notSale: true },
  },
  {
    id: 'r5',
    text: 'می‌خوام بخرم. نه می‌خوام رهن کنم، رهن ۱۰۰ میلیون اجاره ۸ میلیون',
    expect: { type: 'DEPOSIT_AND_RENT', deposit: 100_000_000, rent: 8_000_000, notSale: true },
  },
  {
    id: 'r6',
    text: 'آپارتمان برای خرید سعادت آباد. راستش نه می‌خوام اجاره کنم',
    expect: { type: 'RENT', notSale: true },
  },
  {
    id: 'r7',
    text: 'می‌خوام یه واحد بخرم جردن. در واقع رهن می‌خوام ۳۰۰ میلیون',
    expect: { type: 'FULL_DEPOSIT', deposit: 300_000_000, notSale: true },
  },
  {
    id: 'r8',
    text: 'خرید ویلا شمال. راستش نه می‌خوام اجاره کنم ماهی ۲۰ میلیون',
    expect: { type: 'RENT', rent: 20_000_000, notSale: true },
  },
  {
    id: 'r9',
    text: 'می‌خوام بخرم الهیه. راستش نه، می‌خوام رهن کنم رهن ۴۰۰ میلیون',
    expect: { type: 'FULL_DEPOSIT', deposit: 400_000_000, notSale: true },
  },
  {
    id: 'r10',
    text: 'برای خرید آپارتمان. نه می‌خوام اجاره کنم ۱۲ میلیون',
    expect: { type: 'RENT', rent: 12_000_000, notSale: true },
  },
  {
    id: 'r11',
    text: 'می‌خوام بخرم پاسداران. راستش می‌خوام رهن کنم ۵۵۰ میلیون رهن',
    expect: { type: 'FULL_DEPOSIT', deposit: 550_000_000, notSale: true },
  },
  {
    id: 'r12',
    text: 'خرید آپارتمان. در واقع اجاره می‌خوام ۷ میلیون ماهانه',
    expect: { type: 'RENT', rent: 7_000_000, notSale: true },
  },
  {
    id: 'r13',
    text: 'می‌خوام بخرم. راستش نه می‌خوام رهن کنم رهن کامل ۶۰۰ میلیون',
    expect: { type: 'FULL_DEPOSIT', deposit: 600_000_000, notSale: true },
  },
  {
    id: 'guard-buy',
    text: 'آپارتمان اجاره‌ای وکیل‌آباد ۱۵ میلیون رهن ۲ میلیون اجاره راستش می‌خوام بخرم بودجه ۲ میلیارد',
    expect: { type: 'BUY', categoryIncludes: 'sale' },
  },
  {
    id: 'guard-presale',
    text: 'الان رهن‌نشین‌ام رهن ۵۰۰ میلیون اجاره ۱۵ میلیون شهرک غرب راستش می‌خوام پیش‌فروش بخرم بودجه ۳ میلیارد',
    expect: { type: 'BUY', categoryIncludes: 'pre-sale' },
  },
];

async function main() {
  let failed = 0;
  for (const c of CASES) {
    const r = await extractSmartFields(c.text, '', { useAI: false });
    const errs: string[] = [];
    if (r.transaction.type !== c.expect.type) {
      errs.push(`type=${r.transaction.type} want ${c.expect.type}`);
    }
    if (c.expect.categoryIncludes) {
      const cat = `${r.category.value}|${r.category.subcategory}`;
      if (!cat.includes(c.expect.categoryIncludes)) {
        errs.push(`cat=${cat} want includes ${c.expect.categoryIncludes}`);
      }
    }
    if (c.expect.notSale) {
      const cat = `${r.category.value}|${r.category.subcategory}`;
      if (/sale/i.test(cat) && !/pre-sale/i.test(cat)) {
        errs.push(`sale leakage cat=${cat}`);
      }
    }
    if (c.expect.deposit != null && r.budget.depositAmount !== c.expect.deposit) {
      errs.push(`dep=${r.budget.depositAmount} want ${c.expect.deposit}`);
    }
    if (c.expect.rent != null && r.budget.rentAmount !== c.expect.rent) {
      errs.push(`rent=${r.budget.rentAmount} want ${c.expect.rent}`);
    }
    if (errs.length) {
      failed += 1;
      console.error(`FAIL ${c.id}: ${errs.join('; ')}`);
    } else {
      console.log(`OK ${c.id}`);
    }
  }
  console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
  if (failed) process.exit(1);
}

void main();
