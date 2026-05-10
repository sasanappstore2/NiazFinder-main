'use client';

import { Badge } from '@/components/ui/badge';
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

interface Partner {
  name: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  bgAlpha: string;
}

const partners: Partner[] = [
  {
    name: 'دیجی‌کالا',
    icon: ShoppingBag,
    gradient: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bgAlpha: 'bg-emerald-500/5',
  },
  {
    name: 'اسنپ',
    icon: Store,
    gradient: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgAlpha: 'bg-amber-500/5',
  },
  {
    name: 'دیجی‌پی',
    icon: CreditCard,
    gradient: 'bg-gradient-to-r from-rose-500/10 to-pink-500/10',
    iconColor: 'text-rose-600 dark:text-rose-400',
    bgAlpha: 'bg-rose-500/5',
  },
  {
    name: 'بانک ملت',
    icon: Landmark,
    gradient: 'bg-gradient-to-r from-cyan-600/10 to-teal-500/10',
    iconColor: 'text-cyan-700 dark:text-cyan-400',
    bgAlpha: 'bg-cyan-600/5',
  },
  {
    name: 'ایران‌ایر',
    icon: Plane,
    gradient: 'bg-gradient-to-r from-amber-400/10 to-yellow-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgAlpha: 'bg-amber-400/5',
  },
  {
    name: 'آپارات',
    icon: Play,
    gradient: 'bg-gradient-to-r from-red-500/10 to-rose-500/10',
    iconColor: 'text-red-600 dark:text-red-400',
    bgAlpha: 'bg-red-500/5',
  },
  {
    name: 'تاپسی',
    icon: Truck,
    gradient: 'bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10',
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    bgAlpha: 'bg-fuchsia-500/5',
  },
  {
    name: 'ریحون',
    icon: Receipt,
    gradient: 'bg-gradient-to-r from-lime-500/10 to-green-500/10',
    iconColor: 'text-lime-600 dark:text-lime-400',
    bgAlpha: 'bg-lime-500/5',
  },
  {
    name: 'شیپور',
    icon: Ship,
    gradient: 'bg-gradient-to-r from-orange-500/10 to-amber-500/10',
    iconColor: 'text-orange-600 dark:text-orange-400',
    bgAlpha: 'bg-orange-500/5',
  },
  {
    name: 'برگ‌بام',
    icon: Leaf,
    gradient: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10',
    iconColor: 'text-green-600 dark:text-green-400',
    bgAlpha: 'bg-green-500/5',
  },
];

function LogoBadge({ partner }: { partner: Partner }) {
  const Icon = partner.icon;

  return (
    <Badge
      className={`
        rounded-full px-5 py-2.5 text-sm font-medium
        gap-2 cursor-default
        border border-border/50
        ${partner.gradient}
        ${partner.bgAlpha}
        hover:scale-105 transition-transform duration-200
        backdrop-blur-sm
        shadow-sm
      `}
      dir="rtl"
    >
      <Icon className={`h-4 w-4 ${partner.iconColor}`} />
      <span className="text-foreground/80 whitespace-nowrap">{partner.name}</span>
    </Badge>
  );
}

function MarqueeRow({
  partners,
  reverse = false,
}: {
  partners: Partner[];
  reverse?: boolean;
}) {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Gradient fade edges */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent"
        dir="ltr"
      />
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent"
        dir="ltr"
      />

      <div
        className={`flex w-max gap-4 ${
          reverse
            ? 'animate-marquee-reverse'
            : 'animate-marquee'
        }`}
        dir="rtl"
      >
        {/* Duplicate items for seamless loop */}
        {partners.map((partner, index) => (
          <LogoBadge key={`a-${index}`} partner={partner} />
        ))}
        {partners.map((partner, index) => (
          <LogoBadge key={`b-${index}`} partner={partner} />
        ))}
        {partners.map((partner, index) => (
          <LogoBadge key={`c-${index}`} partner={partner} />
        ))}
        {partners.map((partner, index) => (
          <LogoBadge key={`d-${index}`} partner={partner} />
        ))}
      </div>
    </div>
  );
}

export default function TrustPartnersMarquee() {
  // Split partners into two rows for variety
  const row1 = partners;
  const row2 = [...partners].reverse();

  return (
    <section
      dir="rtl"
      className="relative w-full bg-muted/30 py-12 md:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <div className="mb-8 text-center md:mb-10">
          <p className="text-sm font-medium text-muted-foreground">
            مورد اعتماد بیش از ۵,۰۰۰ کسب‌وکار
          </p>
        </div>

        {/* Marquee Rows */}
        <div className="flex flex-col gap-4">
          {/* Row 1: scrolls in one direction */}
          <MarqueeRow partners={row1} reverse={false} />

          {/* Row 2: scrolls in opposite direction */}
          <MarqueeRow partners={row2} reverse={true} />
        </div>
      </div>

      {/* Top gradient fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 left-0 h-12 bg-gradient-to-b from-background to-transparent"
      />
      {/* Bottom gradient fade */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-12 bg-gradient-to-t from-background to-transparent"
      />
    </section>
  );
}
