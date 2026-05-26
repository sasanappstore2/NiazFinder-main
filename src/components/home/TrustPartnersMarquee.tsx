'use client';

import {
  ShoppingBag,
  Store,
  CreditCard,
  Landmark,
  Plane,
  Play,
  Truck,
  Receipt,
  Ship,
  Leaf,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Partner {
  name: string;
  icon: LucideIcon;
  color: string;
}

const partners: Partner[] = [
  { name: 'دیجی‌کالا', icon: ShoppingBag, color: 'text-emerald-600 dark:text-emerald-400' },
  { name: 'اسنپ', icon: Store, color: 'text-amber-600 dark:text-amber-400' },
  { name: 'دیجی‌پی', icon: CreditCard, color: 'text-rose-600 dark:text-rose-400' },
  { name: 'بانک ملت', icon: Landmark, color: 'text-cyan-700 dark:text-cyan-400' },
  { name: 'ایران‌ایر', icon: Plane, color: 'text-amber-600 dark:text-amber-400' },
  { name: 'آپارات', icon: Play, color: 'text-red-600 dark:text-red-400' },
  { name: 'تاپسی', icon: Truck, color: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { name: 'ریحون', icon: Receipt, color: 'text-lime-600 dark:text-lime-400' },
  { name: 'شیپور', icon: Ship, color: 'text-orange-600 dark:text-orange-400' },
  { name: 'برگ‌بام', icon: Leaf, color: 'text-green-600 dark:text-green-400' },
];

function Badge({ partner }: { partner: Partner }) {
  const Icon = partner.icon;
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-5 py-2.5 backdrop-blur-xs" itemProp="sponsor" itemScope itemType="https://schema.org/Organization">
      <Icon className={`h-4 w-4 ${partner.color}`} aria-hidden="true" />
      <span className="text-sm font-medium text-foreground/80 whitespace-nowrap" itemProp="name">{partner.name}</span>
    </div>
  );
}

function MarqueeRow({ partners, reverse = false }: { partners: Partner[]; reverse?: boolean }) {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Gradient fade edges */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-linear-to-l from-background to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-linear-to-r from-background to-transparent" aria-hidden="true" />

      <div className={`flex w-max gap-4 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`} dir="rtl" role="list">
        {[...partners, ...partners, ...partners, ...partners].map((p, i) => (
          <Badge key={`${p.name}-${i}`} partner={p} />
        ))}
      </div>
    </div>
  );
}

export default function TrustPartnersMarquee() {
  return (
    <section dir="rtl" className="relative w-full bg-muted/30 py-12 md:py-16" aria-label="شرکای مورد اعتماد" itemScope itemType="https://schema.org/ItemList">
      <div className="page-container">
        <span className="mb-8 text-center text-sm font-medium text-muted-foreground block" role="heading" aria-level={3}>
          مورد اعتماد بیش از ۵,۰۰۰ کسب‌وکار
        </span>
        <div className="flex flex-col gap-4">
          <MarqueeRow partners={partners} />
          <MarqueeRow partners={[...partners].reverse()} reverse />
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <p>نیاز فایندر مورد اعتماد بیش از ۵,۰۰۰ کسب‌وکار از جمله دیجی‌کالا، اسنپ، دیجی‌پی، بانک ملت، ایران‌ایر، آپارات، تاپسی، ریحون، شیپور و برگ‌بام.</p>
        </div>
      </noscript>
    </section>
  );
}
