'use client';

import type { OfferFaq } from '@/contracts/business-profile';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PRODUCT_READING_MAX } from './product-detail-tokens';

export function ProductDetailFaq({ faq }: { faq?: OfferFaq[] }) {
  if (!faq?.length) return null;

  return (
    <section className={PRODUCT_READING_MAX} aria-labelledby="product-faq-heading">
      <h2 id="product-faq-heading" className="mb-[13px] text-lg font-semibold">
        پرسش‌های متداول
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {faq.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-right text-sm font-medium">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
