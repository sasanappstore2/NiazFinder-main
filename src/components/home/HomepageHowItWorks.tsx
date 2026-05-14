'use client';

import { FileEdit, MessageCircle, Award, CheckCircle2, ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS: { number: string; icon: LucideIcon; title: string; description: string }[] = [
  {
    number: '۱',
    icon: FileEdit,
    title: 'ثبت نیاز',
    description: 'نیاز خود را به صورت دقیق و با جزئیات کامل ثبت کنید تا کسب‌وکارها بتوانند بهترین پیشنهاد را ارائه دهند.',
  },
  {
    number: '۲',
    icon: MessageCircle,
    title: 'دریافت پیشنهاد',
    description: 'کسب‌وکارهای متعدد پیشنهادهای خود را با قیمت و زمان تحویل مشخص ارسال می‌کنند.',
  },
  {
    number: '۳',
    icon: Award,
    title: 'انتخاب بهترین',
    description: 'با مقایسه پروفایل‌ها، امتیازها و نظرات، بهترین کسب‌وکار را برای نیاز خود انتخاب کنید.',
  },
  {
    number: '۴',
    icon: CheckCircle2,
    title: 'انجام پروژه',
    description: 'پروژه شما با بالاترین کیفیت و در زمان مقرر انجام می‌شود و شما از نتیجه رضایت خواهید داشت.',
  },
];

export function HomepageHowItWorks() {
  return (
    <section
      dir="rtl"
      className="relative section-padding bg-emerald-50/50 dark:bg-emerald-950/10"
      aria-label="مراحل کار"
      itemScope
      itemType="https://schema.org/HowTo"
    >
      {/* Dot-grid pattern overlay */}
      <div className="absolute inset-0 dot-grid pointer-events-none" aria-hidden="true" />

      <div className="relative container-default mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-2xl md:text-4xl font-extrabold tracking-tight" itemProp="name">
            چگونه{' '}
            <span className="text-gradient">کار می‌کند</span>؟
          </h2>
          <p className="mx-auto max-w-xl text-sm md:text-base text-muted-foreground">
            در ۴ مرحله ساده به نتیجه برسید
          </p>
        </div>

        {/* Steps Grid */}
        <div className="stagger-children relative">
          {/* Connecting animated gradient line — desktop only */}
          <div
            className="absolute top-[52px] start-[12.5%] end-[12.5%] hidden md:block z-0 step-connector-animated animate"
            aria-hidden="true"
          >
            <div className="w-full h-[2px]" />
          </div>

          {/* Connecting dots — desktop only */}
          <div
            className="absolute top-[52px] start-[12.5%] end-[12.5%] hidden md:block z-0 h-[2px] step-connector-dots"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-6 lg:gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className="relative flex flex-col items-center text-center"
                  itemScope
                  itemType="https://schema.org/HowToStep"
                >
                  {/* Numbered circle with emerald gradient */}
                  <div
                    className={cn(
                      'relative z-10 mb-6 flex size-[88px] items-center justify-center rounded-full',
                      'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600',
                      'shadow-lg shadow-emerald-500/25',
                      'ring-4 ring-emerald-50 dark:ring-emerald-950/30',
                      'transition-transform duration-300 hover:scale-110',
                      'icon-bounce-hover',
                    )}
                  >
                    <span
                      className="absolute -top-1 -end-1 flex size-6 items-center justify-center rounded-full bg-white dark:bg-card text-xs font-extrabold text-emerald-600 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-800"
                      itemProp="position"
                      aria-hidden="true"
                    >
                      {step.number}
                    </span>
                    <Icon className="size-9 text-white icon-bounce-target" aria-hidden="true" />
                  </div>

                  {/* Glassmorphism card */}
                  <div
                    className={cn(
                      'w-full rounded-2xl border p-5',
                      'bg-white/60 dark:bg-card/50 backdrop-blur-md',
                      'border-emerald-200/40 dark:border-emerald-800/30',
                      'shadow-sm shadow-emerald-900/5 dark:shadow-black/10',
                      'transition-all duration-300 hover:shadow-md hover:shadow-emerald-900/10 dark:hover:shadow-black/20',
                      'hover:-translate-y-1.5 hover:bg-white/80 dark:hover:bg-card/70 hover:scale-[1.02]',
                    )}
                  >
                    <h3
                      className="mb-2 text-base font-bold leading-snug text-foreground"
                      itemProp="name"
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed text-muted-foreground"
                      itemProp="text"
                    >
                      {step.description}
                    </p>
                  </div>

                  {/* Chevron arrow — mobile only (between steps) */}
                  {i < STEPS.length - 1 && (
                    <div
                      className="mt-5 flex items-center justify-center md:hidden"
                      aria-hidden="true"
                    >
                      <div className="flex items-center gap-1">
                        <div className="size-1 rounded-full bg-emerald-300 dark:bg-emerald-700" />
                        <ChevronLeft className="size-5 text-emerald-400 dark:text-emerald-600" />
                        <div className="size-1 rounded-full bg-emerald-300 dark:bg-emerald-700" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
