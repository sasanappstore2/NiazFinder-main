'use client';

import { motion } from 'framer-motion';
import { ClipboardList, MessageSquare, Users, CheckCircle, ArrowLeft } from 'lucide-react';

const steps = [
  {
    number: '۱',
    icon: ClipboardList,
    title: 'نیاز خود را ثبت کنید',
    description: 'نیاز خود را به صورت دقیق و با جزئیات کامل ثبت کنید تا متخصص‌ها بتوانند بهترین پیشنهاد را ارائه دهند.',
  },
  {
    number: '۲',
    icon: MessageSquare,
    title: 'پیشنهادها را دریافت کنید',
    description: 'متخصص‌های متعدد پیشنهادهای خود را با قیمت و زمان تحویل مشخص ارسال می‌کنند.',
  },
  {
    number: '۳',
    icon: Users,
    title: 'بهترین را انتخاب کنید',
    description: 'با مقایسه پروفایل‌ها، امتیازها و نظرات، بهترین متخصص را برای نیاز خود انتخاب کنید.',
  },
  {
    number: '۴',
    icon: CheckCircle,
    title: 'کار خود را تحویل بگیرید',
    description: 'پس از انجام کار و رضایت شما، مبلغ به متخصص پرداخت می‌شود.',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, x: 30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function HowItWorks() {
  return (
    <section className="bg-background py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            چگونه کار می‌کند؟
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            در چهار مرحله ساده، نیاز خود را به بهترین متخصص وصل کنید
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={i} variants={item} className="relative">
                {/* Connector Line (not on last item, not on mobile) */}
                {i < steps.length - 1 && (
                  <div className="absolute top-10 left-0 hidden h-0.5 w-full -translate-x-1/2 bg-gradient-to-l from-emerald-200 to-emerald-100 lg:block dark:from-emerald-800 dark:to-emerald-900/50" />
                )}

                <div className="relative flex flex-col items-center text-center">
                  {/* Step Circle */}
                  <div className="relative z-10 mb-6 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
                    <Icon className="size-9 text-white" />
                    <span className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-amber-900 shadow-sm">
                      {step.number}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mb-2 text-base font-bold">{step.title}</h3>

                  {/* Description */}
                  <p className="text-sm leading-relaxed text-muted-foreground max-w-[260px]">
                    {step.description}
                  </p>

                  {/* Arrow on mobile (between steps) */}
                  {i < steps.length - 1 && (
                    <ArrowLeft className="mt-4 size-5 text-emerald-400 lg:hidden" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
