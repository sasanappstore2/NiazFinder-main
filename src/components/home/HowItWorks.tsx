'use client';

import { ClipboardList, MessageSquare, Users, ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const steps: { number: string; icon: LucideIcon; title: string; description: string }[] = [
  {
    number: '۱',
    icon: ClipboardList,
    title: 'ثبت نیاز',
    description: 'نیاز خود را به صورت دقیق و با جزئیات کامل ثبت کنید تا کسب‌وکارها بتوانند بهترین پیشنهاد را ارائه دهند.',
  },
  {
    number: '۲',
    icon: MessageSquare,
    title: 'دریافت پیشنهاد',
    description: 'کسب‌وکارهای متعدد پیشنهادهای خود را با قیمت و زمان تحویل مشخص ارسال می‌کنند.',
  },
  {
    number: '۳',
    icon: Users,
    title: 'انتخاب کسب‌وکار',
    description: 'با مقایسه پروفایل‌ها، امتیازها و نظرات، بهترین کسب‌وکار را برای نیاز خود انتخاب کنید.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding bg-background" aria-label="مراحل کار" itemScope itemType="https://schema.org/HowTo">
      <div className="container-default mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-600 text-caption font-bold text-white" aria-hidden="true">۳</span>
            مرحله ساده
          </div>
          <h2 className="mb-3 text-2xl md:text-4xl font-extrabold tracking-tight" itemProp="name">
            چگونه <span className="text-gradient">کار می‌کند</span>؟
          </h2>
          <p className="mx-auto max-w-xl text-sm md:text-base text-muted-foreground" itemProp="description">
            در سه مرحله ساده، نیاز خود را به بهترین کسب‌وکار وصل کنید
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line — desktop only */}
          <div className="absolute top-12 start-[16%] end-[16%] hidden h-px bg-border md:block" aria-hidden="true" />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative flex flex-col items-center text-center" itemScope itemType="https://schema.org/HowToStep">
                  {/* Circle */}
                  <div className="relative z-10 mb-6 flex size-[88px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25 ring-4 ring-background">
                    <Icon className="size-9 text-white" aria-hidden="true" loading="lazy" />
                  </div>

                  {/* Card */}
                  <div className="rounded-2xl border border-border/50 bg-card p-5 w-full hover-lift transition-all 150ms ease">
                    <span className="absolute -top-3 start-4 flex size-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-md ring-[3px] ring-background" itemProp="position">
                      {step.number}
                    </span>
                    <h3 className="mb-2 mt-1 text-base font-bold leading-snug" itemProp="name">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground" itemProp="text">{step.description}</p>
                  </div>

                  {/* Arrow between steps — mobile only */}
                  {i < steps.length - 1 && (
                    <div className="mt-4 flex items-center justify-center md:hidden" aria-hidden="true">
                      <ChevronLeft className="size-6 text-emerald-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <h2>چگونه کار می‌کند؟</h2>
          <p>در سه مرحله ساده: مرحله ۱ - ثبت نیاز، مرحله ۲ - دریافت پیشنهاد از کسب‌وکارها، مرحله ۳ - انتخاب بهترین کسب‌وکار.</p>
        </div>
      </noscript>
    </section>
  );
}
