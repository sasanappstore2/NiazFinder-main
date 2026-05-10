'use client';

import { motion } from 'framer-motion';
import { ClipboardList, MessageSquare, Users, CheckCircle, ChevronLeft } from 'lucide-react';

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
    transition: { staggerChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const chevronVariant = {
  hidden: { opacity: 0, scale: 0 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export function HowItWorks() {
  return (
    <section className="relative bg-background py-16 sm:py-20 lg:py-24">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 start-1/2 size-[500px] -translate-x-1/2 rounded-full bg-emerald-100/30 blur-3xl dark:bg-emerald-900/10" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">۴</span>
            مرحله ساده
          </div>
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
          className="relative"
        >
          {/* Gradient progress line (desktop) */}
          <div className="absolute top-[52px] start-[12%] end-[12%] hidden h-1 lg:block">
            <div className="relative h-full overflow-hidden rounded-full bg-gradient-to-l from-emerald-400 via-teal-400 to-emerald-300 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-500 opacity-40">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.3, ease: 'easeInOut' }}
                className="absolute inset-0 origin-start bg-gradient-to-l from-emerald-500 via-teal-500 to-emerald-400 dark:from-emerald-500 dark:via-teal-500 dark:to-emerald-400"
                style={{ transformOrigin: 'right' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={i} variants={item} className="relative">
                  <div className="relative flex flex-col items-center text-center">
                    {/* Step Circle */}
                    <div className="relative z-10 mb-6">
                      <div className="relative flex size-[88px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25 ring-4 ring-background">
                        <Icon className="size-9 text-white" />
                        {/* Number badge */}
                        <span className="absolute -bottom-1 -start-1 z-20 flex size-8 items-center justify-center rounded-full border-[3px] border-background bg-gradient-to-br from-amber-400 to-orange-400 text-xs font-bold text-white shadow-md">
                          {step.number}
                        </span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="group rounded-2xl border border-transparent bg-card/0 p-4 transition-all duration-300 hover:border-border hover:bg-card hover:shadow-lg hover:shadow-emerald-500/5 lg:p-5">
                      <h3 className="mb-2 text-base font-bold">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground max-w-[260px]">
                        {step.description}
                      </p>
                    </div>

                    {/* Arrow between steps (mobile + tablet) */}
                    {i < steps.length - 1 && (
                      <motion.div
                        variants={chevronVariant}
                        className="mt-2 lg:hidden"
                      >
                        <div className="flex items-center justify-center">
                          <ChevronLeft className="size-6 text-emerald-400" />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Chevron arrow between steps (desktop) */}
                  {i < steps.length - 1 && (
                    <motion.div
                      variants={chevronVariant}
                      className="absolute top-[42px] -start-5 z-20 hidden lg:flex"
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
                        <ChevronLeft className="size-4 text-emerald-500" />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
