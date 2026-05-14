'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PRICING_PLANS, formatPrice } from '@/lib/constants';

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="section-padding bg-background" aria-label="طرح‌های تعرفه‌ای" itemScope itemType="https://schema.org/Product">
      <div className="container-default mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-2xl md:text-4xl font-extrabold tracking-tight" itemProp="name">طرح‌های تعرفه‌ای</h2>
          <p className="mx-auto max-w-xl text-sm md:text-base text-muted-foreground" itemProp="description">
            پلنی که مناسب نیاز شماست را انتخاب کنید
          </p>
        </div>

        {/* Toggle */}
        <div className="mb-12 flex flex-col items-center gap-3">
          <div className="relative inline-flex items-center rounded-full border border-border/50 bg-muted/40 p-1" role="radiogroup" aria-label="انتخاب دوره پرداخت">
            <div
              className="absolute top-1 bottom-1 rounded-full bg-primary shadow-lg shadow-primary/20 transition-all duration-300 ease-out"
              style={{ width: '50%', insetInlineStart: isYearly ? '50%' : '0' }}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`relative z-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300 ${!isYearly ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              role="radio"
              aria-checked={!isYearly}
            >
              ماهانه
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`relative z-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300 ${isYearly ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              role="radio"
              aria-checked={isYearly}
            >
              سالانه
            </button>
          </div>
          {isYearly && (
            <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
              صرفه‌جویی ۲۰٪
            </Badge>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
          {PRICING_PLANS.map((plan) => {
            const isHighlighted = 'highlighted' in plan && plan.highlighted;
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const monthlyEquivalent = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;

            return (
              <Card
                key={plan.id}
                className={`group relative flex h-full flex-col overflow-hidden transition-all duration-300 ease ${
                  isHighlighted
                    ? 'border-primary border-2 shadow-xl lg:scale-105'
                    : 'border-border/50 bg-card/80 hover-lift'
                }`}
                itemScope
                itemType="https://schema.org/Offer"
              >
                {isHighlighted && (
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-primary/[0.03] pointer-events-none" aria-hidden="true" />
                )}

                {plan.badge && (
                  <div className="relative flex justify-center pt-0">
                    <Badge className="absolute -top-3 rounded-full px-4 py-1 text-xs font-bold shadow-lg bg-primary text-primary-foreground">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="relative flex flex-col items-center gap-2 px-6 pt-8 pb-2 text-center">
                  <span className="mb-1 text-4xl" aria-hidden="true" loading="lazy">{plan.icon}</span>
                  <CardTitle className="text-xl" itemProp="name">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>

                  <div className="mt-4 flex items-baseline gap-1" itemProp="priceSpecification" itemScope itemType="https://schema.org/PriceSpecification">
                    {monthlyEquivalent === 0 ? (
                      <span className="text-3xl font-extrabold text-primary" itemProp="price">رایگان</span>
                    ) : (
                      <>
                        <meta itemProp="priceCurrency" content="IRR" />
                        <span className="text-3xl font-extrabold tabular-nums" itemProp="price">{formatPrice(monthlyEquivalent)}</span>
                        <span className="text-sm text-muted-foreground">/ماهانه</span>
                      </>
                    )}
                  </div>
                  {isYearly && monthlyEquivalent > 0 && (
                    <p className="text-xs text-muted-foreground">{formatPrice(price)} در سال</p>
                  )}
                </CardHeader>

                <CardContent className="relative flex flex-1 flex-col px-6 pb-8 pt-4">
                  <Button
                    variant={isHighlighted ? 'default' : 'outline'}
                    size="lg"
                    className={`w-full mb-6 rounded-xl transition-all 150ms ease ${isHighlighted ? 'shadow-lg' : ''}`}
                    data-href={`/pricing/${plan.id}`}
                    title={`انتخاب طرح ${plan.name}`}
                  >
                    {isHighlighted ? 'انتخاب این طرح' : 'شروع کنید'}
                  </Button>

                  <ul className="flex flex-col gap-3 flex-1" role="list">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/80">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <h2>طرح‌های تعرفه‌ای</h2>
          <p>پلنی که مناسب نیاز شماست را انتخاب کنید. طرح رایگان، طرح حرفه‌ای و طرح سازمانی با ویژگی‌های متنوع و قیمت‌های مناسب.</p>
        </div>
      </noscript>
    </section>
  );
}
