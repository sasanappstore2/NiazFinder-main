'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'نیاز فایندر چیست و چگونه کار می‌کند؟',
    answer: 'نیاز فایندر یک پلتفرم هوشمند اتصال نیاز به کسب‌وکار است. شما نیاز خود را ثبت می‌کنید، کسب‌وکارهای متخصص پیشنهاد ارسال می‌کنند، و شما بهترین را انتخاب می‌کنید.整个过程 ساده و امن است و تا زمان رضایت شما از نتیجه، پول در امان صندوق ماست.',
  },
  {
    question: 'آیا استفاده از نیاز فایندر رایگان است؟',
    answer: 'بله، ثبت‌نام و ثبت نیاز کاملاً رایگان است. کسب‌وکارها نیز می‌توانند به صورت رایگان پروفایل بسازند و پیشنهاد ارسال کنند. فقط در صورت انتخاب شدن توسط کارفرما، کمیسیون بسیار کم از مبلغ پروژه کسر می‌شود.',
  },
  {
    question: 'چگونه می‌توانم به بهترین کسب‌وکار اعتماد کنم؟',
    answer: 'هر کسب‌وکار دارای پروفایل کامل با امتیاز واقعی مشتریان، نمونه کارهای انجام شده و تعداد پروژه‌های تکمیل شده است. همچنین سیستم تایید هویت ما اعتبار کسب‌وکارها را تضمین می‌کند. شما می‌توانید نظرات مشتریان قبلی را مطالعه کنید.',
  },
  {
    question: 'آیا پرداخت امن است؟',
    answer: 'بله، نیاز فایندر از سیستم صندوق امان استفاده می‌کند. مبلغ پروژه تا زمان تایید شما توسط کارفرما در حساب ما نگهداری می‌شود و فقط پس از رضایت از نتیجه نهایی، به کسب‌وکار پرداخت می‌شود.',
  },
  {
    question: 'در چه شهرهایی فعال هستید؟',
    answer: 'نیاز فایندر در بیش از ۳۵۰ شهر ایران فعال است. شما می‌توانید با انتخاب شهر خود، کسب‌وکارهای محلی نزدیکتان را پیدا کنید. بزرگترین بازار ما در تهران، اصفهان، شیراز و مشهد است.',
  },
  {
    question: 'اگر از نتیجه پروژه راضی نباشم چه می‌شود؟',
    answer: 'در صورت عدم رضایت، شما می‌توانید از سیستم داوری ما استفاده کنید. تیم پشتیبانی ما به صورت بی‌طرفانه اختلاف را بررسی و تصمیم نهایی را اعلام می‌کند. رضایت مشتری اولویت ماست.',
  },
];

function FAQAccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-right transition-colors duration-200 hover:text-primary"
        aria-expanded={isOpen}
      >
        <h3 className="text-sm font-semibold leading-relaxed text-foreground">
          {item.question}
        </h3>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-transform duration-300',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-sm leading-[1.9] text-muted-foreground">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function HomepageFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      dir="rtl"
      className="section-padding bg-muted/20 dark:bg-card/10"
      aria-label="سوالات متداول"
    >
      <div className="container-default mx-auto px-5 md:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center justify-center size-12 rounded-2xl bg-primary/10">
              <HelpCircle className="size-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mb-3 text-2xl md:text-3xl font-extrabold tracking-tight">
              سوالات <span className="text-gradient">متداول</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              پاسخ سوالات رایج درباره نیاز فایندر
            </p>
          </div>

          {/* FAQ Accordion */}
          <div
            className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xs p-5 md:p-6"
          >
            {FAQ_DATA.map((item, i) => (
              <FAQAccordionItem
                key={i}
                item={item}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>

          {/* Contact CTA */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            سوال دیگری دارید؟{' '}
            <button
              onClick={() => {
                const footerContact = document.getElementById('footer-contact');
                footerContact?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="font-semibold text-primary transition-colors hover:text-primary/80 underline decoration-primary/30 underline-offset-2"
            >
              تماس با ما
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
