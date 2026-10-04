import { extractPostNaturalFields } from '@/lib/need-intake/laya/post-natural-extractor';

function show(label: string, text: string) {
  const r = extractPostNaturalFields(text);
  const e = r.entities as Record<string, unknown>;
  console.log(label, JSON.stringify({
    propertyKind: e.propertyKind ?? null,
    transactionType: e.transactionType ?? null,
    categoryCandidates: r.categoryCandidates.map((c) => c.slug),
  }));
}

// bucket 11: hood property-word leak
show('shahin-vila:', 'دنبال خرید آپارتمان ۲۱۴ متر شاهین‌ویلا کرج هستم با بودجه ۵۲۸۸۷ میلیون');
show('zamin-shenasi:', 'آپارتمان ۱۰۵ متر  زمین شناسی ارومیه رهن کامل ۲۳۴۴ میلیون تومان اجاره ندارم');
show('vila-shahr-tabriz:', 'آپارتمان 144 متر  فاز ۳ ویلاشهر تبریز رهن کامل ۱۴۳۲ میلیون تومان اجاره ندارم');
show('sanati-atlas:', 'دفتر کار اداری 238 متر شهرک صنعتی اطلس تبریز دنبالم رهن ۲۲۶۵ میلیون و اجاره ۱۱۸ میلیون');
show('anbar-mapna:', 'دفتر کار اداری 252 متر  انبار مپنا کرج بخوام رهن ۲۱۱۱ میلیون و اجاره 71 میلیون');
show('dehghan-vila:', 'دنبال خرید آپارتمان 113 متر  دهقان ویلا کرج هستم با بودجه ۵۱۸۵۸ میلیون');
show('mehrvila:', '203 متر آپارتمان دنبالم مهرویلا شمالی، ۷۸۵ میلیون تومن رهن ۱۱ میلیون اجاره');

// bucket 12: commercial keyword substring
show('masoule-soule:', 'دفتر کار اداری 292 متر در کشه سر ماسوله دنبالم رهن 2616 میلیون و اجاره ۱۳۷ میلیون');
show('salandan:', 'دنبال خرید آپارتمان ۱۱۳ متر توی مرکز نگهداری سالندان سرای نور هستم با بودجه ۴۱۹۲۲ میلیون');
show('real-soule:', 'سوله ۵۰۰ متر صنعتی برای اجاره');
show('real-salon:', 'سالن آرایشگاه ۸۰ متر اجاره');
show('real-office-sanati:', 'دفتر کار اداری ۱۰۰ متر در شهرک صنعتی ماکو اجاره');
