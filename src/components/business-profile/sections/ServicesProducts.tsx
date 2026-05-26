'use client';

import Image from 'next/image';
import { Clock } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BusinessOffer } from '@/contracts/business-profile';
import type { SectionProps } from './types';
import { CTA_LABEL } from './types';

function ServiceCard({
  offer,
  onAction,
}: {
  offer: BusinessOffer;
  onAction: () => void;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {offer.images[0] && (
        <div className="relative aspect-16/10 bg-muted">
          <Image src={offer.images[0]} alt="" fill className="object-cover" />
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{offer.title}</CardTitle>
        {offer.priceRange && <p className="text-sm font-semibold text-primary">{offer.priceRange}</p>}
        {offer.duration && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {offer.duration}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <p className="line-clamp-3 text-sm text-muted-foreground">{offer.description}</p>
        {offer.features.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {offer.features.slice(0, 5).map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        )}
        {offer.faq && offer.faq.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            {offer.faq.slice(0, 3).map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="py-2 text-xs">{item.q}</AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        <Button className="mt-auto w-full" size="sm" onClick={onAction}>
          {CTA_LABEL[offer.ctaType]}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ServicesSection({ business, onOfferAction }: SectionProps) {
  if (business.offers.length === 0) return null;

  return (
    <section id="section-services" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">خدمات و پیشنهادها</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {business.offers.map((o) => (
          <ServiceCard
            key={o.id}
            offer={o}
            onAction={() => onOfferAction?.(o.id, o.ctaType)}
          />
        ))}
      </div>
    </section>
  );
}

export function ProductsSection({ business, onOfferAction }: SectionProps) {
  if (business.offers.length === 0) return null;

  return (
    <section id="section-products" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">محصولات</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {business.offers.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onOfferAction?.(o.id, o.ctaType)}
            className="group overflow-hidden rounded-xl border bg-card text-right shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-square bg-muted">
              {o.images[0] ? (
                <Image src={o.images[0]} alt="" fill className="object-cover transition group-hover:scale-105" />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  بدون تصویر
                </div>
              )}
            </div>
            <div className="space-y-1 p-3">
              <p className="line-clamp-2 text-sm font-medium">{o.title}</p>
              {o.priceRange && (
                <p className="text-sm font-bold text-primary">{o.priceRange}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
