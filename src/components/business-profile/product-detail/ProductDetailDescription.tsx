'use client';

import { PRODUCT_READING_MAX } from './product-detail-tokens';

export function ProductDetailDescription({ description }: { description: string }) {
  const text = description?.trim();
  if (!text) return null;

  return (
    <section className={PRODUCT_READING_MAX} aria-labelledby="product-desc-heading">
      <h2 id="product-desc-heading" className="mb-[13px] text-lg font-semibold">
        توضیحات
      </h2>
      <p className="whitespace-pre-wrap text-base leading-[1.618] text-foreground/90">
        {text}
      </p>
    </section>
  );
}
