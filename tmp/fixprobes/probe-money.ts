import { extractPostNaturalFields } from '@/lib/need-intake/laya/post-natural-extractor';
import { parseMillionTomanFromPhrase } from '@/lib/need-intake/parse-persian-amount';

function show(label: string, text: string) {
  const r = extractPostNaturalFields(text);
  const e = r.entities as Record<string, unknown>;
  console.log(label, JSON.stringify({
    budgetMax: e.budgetMax ?? null,
    rahnAmount: e.rahnAmount ?? null,
    monthlyRent: e.monthlyRent ?? null,
    transactionType: e.transactionType ?? null,
    propertyKind: e.propertyKind ?? null,
    categoryCandidates: r.categoryCandidates.map((c) => c.slug),
  }));
}

// bucket 1: sale budget > 5e9 typed digits (c20261001-4)
console.log('parseMillionTomanFromPhrase 5000:', parseMillionTomanFromPhrase('5000'));
console.log('parseMillionTomanFromPhrase 5001:', parseMillionTomanFromPhrase('5001'));
console.log('parseMillionTomanFromPhrase 34643:', parseMillionTomanFromPhrase('۳۴۶۴۳'));
console.log('parseMillionTomanFromPhrase سه هزار (word, capped):', parseMillionTomanFromPhrase('سه هزار'));
show('budget-cap:', 'دنبال خرید آپارتمان 248 متر  خاوران تهران هستم با بودجه ۳۴۶۴۳ میلیون');

// bucket 2: rahn/rent swap (c20261001-0, c20261001-19, c20261001-2)
show('rahn-swap-0:', '۹۸ متر آپارتمان میخوام یافت آباد شمالی، ۱۲۴۷ میلیون رهن ۶۵ میلیون اجاره');
show('rahn-swap-19:', '۱۴۰ متر آپارتمان دنبالش هستم تو یاخجی آباد، 1176 میلیون تومن رهن ۷۴ میلیون اجاره');
show('rahn-swap-2:', '۲۱۳ متر آپارتمان میخوام توی حسینیه، ۸۲۴ میلیون رهن 29 میلیون تومن اجاره');
show('rahn-swap-8:', '90 متر آپارتمان نیاز مندم نزدیک شهرک پیروزی، ۸۷ میلیون رهن ۹۳ میلیون اجاره');

// bucket 3: تومان scale
show('toman-scale:', 'رهن کامل ۵۰ تومان اجاره ندارم');
show('toman-scale-budget:', 'خرید آپارتمان با بودجه ۸۰۰ تومان');
show('toman-literal:', 'رهن ۵۰۰۰۰۰۰۰ تومان اجاره ندارم');

// bucket 13: DAILY_RENT false positive (شبیری)
show('daily-rent-fix:', '131 متر آپارتمان می‌خواهم نزدیک شبیری، ۹۸۶ میلیون رهن ۷۹ میلیون اجاره');
show('daily-rent-real:', 'اجاره روزانه یک سوئیت برای سه شب');
