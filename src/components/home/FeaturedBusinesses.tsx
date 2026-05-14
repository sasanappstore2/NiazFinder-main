'use client';

import { Star, MapPin, ArrowLeft, BadgeCheck, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { StarRating } from '@/components/shared/StarRating';

const FEATURED_SPECIALTIES = [
  'طراحی وب', 'برنامه‌نویسی', 'تولید محتوا', 'عکاسی',
  'نقشه‌کشی', 'مشاوره کسب‌وکار', 'دیجیتال مارکتینگ', 'گرافیک',
];

const FALLBACK_BUSINESSES = [
  {
    id: 'fb1',
    name: 'آژانس دیجیتال نوین',
    specialty: 'طراحی وب و اپلیکیشن',
    city: 'تهران',
    rating: 4.9,
    reviewCount: 127,
    projectCount: 342,
    avatarColor: 'from-emerald-400 to-teal-500',
    verified: true,
  },
  {
    id: 'fb2',
    name: 'استودیو خلاقیت',
    specialty: 'طراحی گرافیک و برندینگ',
    city: 'اصفهان',
    rating: 4.8,
    reviewCount: 89,
    projectCount: 215,
    avatarColor: 'from-amber-400 to-orange-500',
    verified: true,
  },
  {
    id: 'fb3',
    name: 'تیم توسعه آرمان',
    specialty: 'برنامه‌نویسی موبایل',
    city: 'شیراز',
    rating: 4.7,
    reviewCount: 156,
    projectCount: 398,
    avatarColor: 'from-sky-400 to-blue-500',
    verified: true,
  },
  {
    id: 'fb4',
    name: 'مستر مارکتینگ',
    specialty: 'دیجیتال مارکتینگ و سئو',
    city: 'تهران',
    rating: 4.6,
    reviewCount: 73,
    projectCount: 186,
    avatarColor: 'from-rose-400 to-pink-500',
    verified: false,
  },
  {
    id: 'fb5',
    name: 'گروه معماری پارس',
    specialty: 'نقشه‌کشی و معماری',
    city: 'تبریز',
    rating: 4.9,
    reviewCount: 201,
    projectCount: 512,
    avatarColor: 'from-violet-400 to-purple-500',
    verified: true,
  },
  {
    id: 'fb6',
    name: 'محتواسازان حرفه‌ای',
    specialty: 'تولید محتوا و کپی‌رایتینگ',
    city: 'مشهد',
    rating: 4.5,
    reviewCount: 54,
    projectCount: 143,
    avatarColor: 'from-teal-400 to-cyan-500',
    verified: true,
  },
];

export function FeaturedBusinesses() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <section
      dir="rtl"
      className="relative section-padding bg-background overflow-hidden"
      aria-label="کسب‌وکارهای برتر"
    >
      {/* Subtle background decoration */}
      <div className="absolute top-0 start-0 h-64 w-64 rounded-full bg-emerald-100/30 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 end-0 h-48 w-48 rounded-full bg-teal-100/20 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative container-default mx-auto px-5 md:px-8">
        {/* Section Header */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                برترین‌ها
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              کسب‌وکارهای <span className="text-gradient">برتر هفته</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              بر اساس امتیاز و رضایت مشتریان
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('browse-specialists')}
            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-primary hover:bg-primary/5"
          >
            مشاهده همه
            <ArrowLeft className="size-4" />
          </button>
        </div>

        {/* Specialty Pills */}
        <div className="mb-8 flex flex-wrap gap-2">
          {FEATURED_SPECIALTIES.map((spec) => (
            <span
              key={spec}
              className="inline-flex items-center rounded-full border border-border/40 bg-card/50 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/20 hover:text-primary hover:bg-primary/5 cursor-default"
            >
              {spec}
            </span>
          ))}
        </div>

        {/* Business Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FALLBACK_BUSINESSES.map((business) => {
            const initials = business.name
              .split(' ')
              .map((w) => w.charAt(0))
              .slice(0, 2)
              .join('');

            return (
              <div
                key={business.id}
                onClick={() => navigateTo('specialist-profile')}
                role="button"
                tabIndex={0}
                className={cn(
                  'group relative flex items-start gap-4 rounded-2xl border p-4 sm:p-5',
                  'bg-card/50 backdrop-blur-sm',
                  'border-border/40 dark:border-border/20',
                  'transition-all duration-300 cursor-pointer',
                  'hover:bg-card/80 hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/20',
                  'hover:-translate-y-[2px] hover:border-primary/20',
                  'active:scale-[0.99]'
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'flex size-12 sm:size-14 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md',
                      'bg-gradient-to-br',
                      business.avatarColor,
                      'ring-2 ring-white/50 dark:ring-card/50',
                      'transition-transform duration-300 group-hover:scale-105'
                    )}
                  >
                    {initials}
                  </div>
                  {business.verified && (
                    <div className="absolute -bottom-0.5 -end-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                      <BadgeCheck className="size-3" strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {/* Name + verified */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="truncate text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {business.name}
                    </h3>
                    {business.verified && (
                      <BadgeCheck className="shrink-0 size-4 text-emerald-500" />
                    )}
                  </div>

                  {/* Specialty */}
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    {business.specialty}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={business.rating} size="sm" showValue reviewCount={business.reviewCount} />
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {business.city}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3" />
                      {business.projectCount.toLocaleString('fa-IR')} پروژه
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
