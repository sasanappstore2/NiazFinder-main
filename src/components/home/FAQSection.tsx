'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle, ChevronDown } from 'lucide-react';
import { FAQ_DATA } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function FAQSection() {
  const scrollToContact = () => {
    const el = document.getElementById('footer-contact');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Track which items are open for animation
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  return (
    <section id="faq" className="section-padding faq-pattern-bg bg-muted/30" aria-label="سوالات متداول" itemScope itemType="https://schema.org/FAQPage">
      <div className="container-default mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <HelpCircle className="size-4" aria-hidden="true" />
            راهنما
          </div>
          <h2 className="mb-3 text-2xl md:text-4xl font-bold tracking-tight">سوالات متداول</h2>
          <p className="mx-auto max-w-xl text-muted-foreground">پاسخ سوالات رایج درباره پلتفرم نیاز فایندر</p>
        </div>

        {/* Accordion */}
        <Accordion
          type="single"
          collapsible
          className="w-full space-y-3"
          onValueChange={(value) => {
            setOpenItems(new Set(value ? [value] : []));
          }}
        >
          {FAQ_DATA.map((faq, i) => {
            const itemValue = `faq-${i}`;
            const isOpen = openItems.has(itemValue);
            return (
              <AccordionItem
                key={i}
                value={itemValue}
                className={cn(
                  'faq-glass-item faq-expanded-line rounded-2xl px-2 transition-all duration-300',
                  isOpen && 'shadow-lg shadow-emerald-500/5 dark:shadow-black/10',
                )}
                itemScope
                itemType="https://schema.org/Question"
              >
                <AccordionTrigger className="text-start text-sm font-semibold leading-relaxed hover:no-underline sm:text-[15px] px-3 py-4">
                  <span className="flex items-center gap-3" itemProp="name">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white shadow-sm" aria-hidden="true">
                      {i + 1}
                    </span>
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-5 sm:text-[15px]" itemScope itemType="https://schema.org/Answer">
                  <div className={cn(
                    'faq-answer-content text-start text-sm leading-[1.8] text-muted-foreground',
                    isOpen && 'faq-answer-open',
                  )}>
                    <span itemProp="text">
                      {faq.answer}
                    </span>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* CTA Card */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-emerald-200/40 dark:border-emerald-800/40 bg-white/40 dark:bg-card/40 backdrop-blur-md p-6 text-center shadow-sm sm:p-8">
          <div className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" aria-hidden="true">
            <MessageCircle className="size-6 text-white" />
          </div>
          <h3 className="mb-2 text-lg font-bold">آیا سوالی دارید؟</h3>
          <p className="mb-5 text-sm text-muted-foreground">
            پاسخ سوال خود را پیدا نکردید؟ با ما تماس بگیرید تا راهنمایی‌تان کنیم.
          </p>
          <Button
            onClick={scrollToContact}
            className="group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 text-white shadow-lg shadow-emerald-600/25 transition-all 150ms ease hover:bg-emerald-700"
            data-href="#footer-contact"
            title="تماس با پشتیبانی نیاز فایندر"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            تماس با ما
            <ChevronDown className="size-4 rotate-[-90deg]" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <h2>سوالات متداول</h2>
          <p>پاسخ سوالات رایج درباره پلتفرم نیاز فایندر شامل نحوه ثبت نام، ثبت نیاز، انتخاب کسب‌وکار، پرداخت و...</p>
        </div>
      </noscript>
    </section>
  );
}
