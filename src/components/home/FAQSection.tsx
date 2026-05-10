'use client';

import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle, ChevronLeft } from 'lucide-react';
import { FAQ_DATA } from '@/lib/constants';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export function FAQSection() {
  const scrollToContact = () => {
    const footerEl = document.getElementById('footer-contact');
    if (footerEl) {
      footerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="relative bg-muted/30 py-16 sm:py-20 lg:py-24">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 start-1/4 size-[300px] rounded-full bg-emerald-100/20 blur-3xl dark:bg-emerald-900/10" />
        <div className="absolute -bottom-20 end-1/4 size-[300px] rounded-full bg-amber-100/20 blur-3xl dark:bg-amber-900/10" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <HelpCircle className="size-4" />
            راهنما
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            سوالات متداول
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            پاسخ سوالات رایج درباره پلتفرم نیاز فایندر
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-30px' }}
          className="space-y-3"
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQ_DATA.map((faq, i) => (
              <motion.div key={i} variants={item}>
                <AccordionItem
                  value={`faq-${i}`}
                  className="rounded-2xl border border-border/60 px-2 transition-all duration-200 hover:border-border data-[state=open]:border-emerald-200 data-[state=open]:bg-card data-[state=open]:shadow-lg data-[state=open]:shadow-emerald-500/5 dark:data-[state=open]:border-emerald-800"
                >
                  <AccordionTrigger className="text-start text-sm font-semibold leading-relaxed hover:no-underline sm:text-[15px] px-3 py-4">
                    <span className="flex items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-xs font-bold text-white shadow-sm">
                        {i + 1}
                      </span>
                      {faq.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-start text-sm leading-[1.8] text-muted-foreground px-3 pb-5 sm:text-[15px]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>

        {/* CTA: Got a question? */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10"
        >
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm sm:p-8">
            <div className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
              <MessageCircle className="size-6 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-bold">
              آیا سوالی دارید؟
            </h3>
            <p className="mb-5 text-sm text-muted-foreground">
              پاسخ سوال خود را پیدا نکردید؟ با ما تماس بگیرید تا راهنمایی‌تان کنیم.
            </p>
            <Button
              onClick={scrollToContact}
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 text-white shadow-lg shadow-emerald-600/25 transition-all duration-300 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/30"
            >
              <MessageCircle className="size-4" />
              تماس با ما
              <ChevronLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
