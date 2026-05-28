'use client';

import { Check } from 'lucide-react';
import { PRODUCT_READING_MAX } from './product-detail-tokens';

export function ProductDetailSpecs({ features }: { features: string[] }) {
  if (features.length === 0) return null;

  return (
    <section className={PRODUCT_READING_MAX} aria-labelledby="product-specs-heading">
      <h2 id="product-specs-heading" className="mb-[13px] text-lg font-semibold">
        ویژگی‌ها
      </h2>
      <ul className="grid gap-[8px] sm:grid-cols-2">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 px-[13px] py-[8px] text-sm"
          >
            <Check
              className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
