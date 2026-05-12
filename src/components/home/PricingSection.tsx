'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PRICING_PLANS, formatPrice } from '@/lib/constants';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut' as const },
  },
};

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="relative bg-background py-20 sm:py-24 lg:py-28">
      {/* Subtle background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 start-0 size-[600px] rounded-full bg-emerald-100/12 blur-[100px] dark:bg-emerald-900/8" />
        <div className="absolute bottom-1/4 end-0 size-[600px] rounded-full bg-amber-100/12 blur-[100px] dark:bg-amber-900/8" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            طرح‌های تعرفه‌ای
          </h2>
          <p className="mx-auto max-w-xl leading-relaxed text-muted-foreground/80">
            پلنی که مناسب نیاز شماست را انتخاب کنید
          </p>
        </motion.div>

        {/* ── Billing Toggle ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-12 flex flex-col items-center gap-3"
        >
          <div className="relative inline-flex items-center rounded-full border border-border/50 bg-muted/40 p-1 shadow-sm backdrop-blur-sm">
            {/* Sliding indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-full bg-primary shadow-lg shadow-primary/20 transition-all duration-300 ease-out"
              style={{
                width: '50%',
                insetInlineStart: isYearly ? '50%' : '0',
              }}
            />
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`relative z-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300 ${
                !isYearly
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ماهانه
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`relative z-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300 ${
                isYearly
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              سالانه
            </button>
          </div>

          {isYearly && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
            >
              <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                صرفه‌جویی ۲۰٪
              </Badge>
            </motion.div>
          )}
        </motion.div>

        {/* ── Pricing Cards ── */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch"
        >
          {PRICING_PLANS.map((plan) => {
            const isHighlighted = 'highlighted' in plan && plan.highlighted;
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const monthlyEquivalent = isYearly
              ? Math.round(plan.yearlyPrice / 12)
              : plan.monthlyPrice;

            return (
              <motion.div key={plan.id} variants={item}>
                <Card
                  className={`group relative flex h-full flex-col overflow-hidden transition-all duration-500 ease-out ${
                    isHighlighted
                      ? 'border-primary border-2 shadow-xl hover:-translate-y-3 hover:shadow-2xl hover:shadow-primary/15 scale-[1.03] lg:scale-105'
                      : 'border-border/50 bg-card/80 backdrop-blur-sm hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200/80 dark:hover:border-emerald-800/60'
                  }`}
                >
                  {/* Gradient background for highlighted card */}
                  {isHighlighted && (
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-primary/[0.03] dark:from-primary/10 dark:via-transparent dark:to-primary/5 pointer-events-none" />
                  )}

                  {/* Top badge for highlighted / enterprise */}
                  {plan.badge && (
                    <div className="relative flex justify-center pt-0">
                      <Badge className="absolute -top-3 rounded-full px-4 py-1 text-xs font-bold shadow-lg shadow-primary/20 bg-primary text-primary-foreground">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="relative flex flex-col items-center gap-2 px-6 pt-8 pb-2 text-center">
                    {/* Icon */}
                    <span className="mb-1 text-4xl">{plan.icon}</span>

                    {/* Plan name */}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mt-4 flex items-baseline gap-1">
                      {monthlyEquivalent === 0 ? (
                        <span className="text-3xl font-extrabold text-primary">
                          رایگان
                        </span>
                      ) : (
                        <>
                          <span className="text-3xl font-extrabold tabular-nums">
                            {formatPrice(monthlyEquivalent)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            /ماهانه
                          </span>
                        </>
                      )}
                    </div>

                    {isYearly && monthlyEquivalent > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(price)} در سال
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="relative flex flex-1 flex-col px-6 pb-8 pt-4">
                    {/* CTA Button */}
                    <Button
                      variant={isHighlighted ? 'default' : 'outline'}
                      size="lg"
                      className={`w-full mb-6 rounded-xl transition-all duration-300 ${
                        isHighlighted
                          ? 'shadow-lg hover:shadow-xl hover:shadow-primary/25'
                          : 'hover:shadow-md'
                      }`}
                    >
                      {isHighlighted ? 'انتخاب این طرح' : 'شروع کنید'}
                    </Button>

                    {/* Features list */}
                    <ul className="flex flex-col gap-3 flex-1">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/80"
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
