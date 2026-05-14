'use client';

import { MapPin, Briefcase, ArrowLeft, Award, Shield, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { StarRating } from '@/components/shared/StarRating';

const FEATURED_SKILLS = [
  'طراحی وب', 'اپلیکیشن موبایل', 'تولید محتوا', 'سئو',
  'برنامه‌نویسی', 'گرافیک', 'بازاریابی دیجیتال', 'عکاسی',
];

const TRUST_BADGES = [
  { icon: Shield, label: 'تایید شده', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' },
  { icon: Award, label: 'برترین', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' },
  { icon: Clock, label: 'سریع', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
];

// Fake featured businesses for display (real data from API when available)
const FEATURED_BUSINESSES = [
  {
    id: 'b1',
    name: 'استودیو خلاقیت',
    displayName: 'آژانس طراحی خلاقیت',
    specialty: 'طراحی وب و رابط کاربری',
    city: 'تهران',
    rating: 4.9,
    projectCount: 127,
    avatarColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    skills: ['طراحی وب', 'UI/UX', 'گرافیک'],
    badge: 0,
  },
  {
    id: 'b2',
    name: 'توسعه‌گران نوین',
    displayName: 'شرکت توسعه‌گران نوین',
    specialty: 'توسعه اپلیکیشن موبایل',
    city: 'اصفهان',
    rating: 4.8,
    projectCount: 89,
    avatarColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    skills: ['اپلیکیشن iOS', 'اپلیکیشن Android', 'Flutter'],
    badge: 1,
  },
  {
    id: 'b3',
    name: 'محتوایار',
    displayName: 'آژانس محتوایار',
    specialty: 'تولید محتوا و سئو',
    city: 'شیراز',
    rating: 4.7,
    projectCount: 215,
    avatarColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    skills: ['تولید محتوا', 'سئو', 'کپی‌رایتینگ'],
    badge: 2,
  },
  {
    id: 'b4',
    name: 'کدنویس برتر',
    displayName: 'تیم کدنویس برتر',
    specialty: 'برنامه‌نویسی و توسعه بک‌اند',
    city: 'تهران',
    rating: 4.9,
    projectCount: 156,
    avatarColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    skills: ['Node.js', 'Python', 'React'],
    badge: 0,
  },
  {
    id: 'b5',
    name: 'پیکسل‌آرت',
    displayName: 'استودیو پیکسل‌آرت',
    specialty: 'طراحی گرافیک و برندینگ',
    city: 'تبریز',
    rating: 4.6,
    projectCount: 73,
    avatarColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    skills: ['لوگو', 'برندینگ', 'طراحی محصول'],
    badge: 1,
  },
  {
    id: 'b6',
    name: 'هوشمند فناوری',
    displayName: 'شرکت هوشمند فناوری',
    specialty: 'هوش مصنوعی و داده',
    city: 'تهران',
    rating: 4.8,
    projectCount: 42,
    avatarColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    skills: ['هوش مصنوعی', 'ML', 'تحلیل داده'],
    badge: 2,
  },
];

function BusinessStarRating({ rating }: { rating: number }) {
  return (
    <StarRating rating={rating} size="xs" />
  );
}

export function FeaturedBusinesses() {
  const { navigateTo } = useAppStore();

  return (
    <section
      dir="rtl"
      className="section-padding bg-muted/30 dark:bg-card/20"
      aria-label="کسب‌وکارهای برتر"
    >
      <div className="container-default mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              <span className="text-gradient">کسب‌وکارهای برتر</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              معتبرترین کسب‌وکارها با بالاترین امتیاز و بیشترین پروژه تکمیل شده
            </p>
          </div>
          <button
            onClick={() => navigateTo('browse-specialists')}
            className={cn(
              'btn-glass inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold',
            )}
            data-href="/browse-specialists"
            title="مشاهده تمام کسب‌وکارها"
          >
            مشاهده همه
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Business Cards Grid */}
        <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_BUSINESSES.map((biz) => {
            const initials = biz.displayName.charAt(0);
            const BadgeIcon = TRUST_BADGES[biz.badge]?.icon ?? Shield;
            const badgeLabel = TRUST_BADGES[biz.badge]?.label ?? '';
            const badgeColor = TRUST_BADGES[biz.badge]?.color ?? '';

            return (
              <div
                key={biz.id}
                onClick={() => navigateTo('specialist-profile', { id: biz.id })}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-2xl border',
                  'bg-card/70 backdrop-blur-sm',
                  'transition-all duration-300',
                  'hover:bg-card/95 hover:backdrop-blur-md',
                  'hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/[0.2]',
                  'hover:-translate-y-[2px] hover:scale-[1.005]',
                  'border-border/40 hover:border-emerald-300/40 dark:hover:border-emerald-800/30',
                )}
              >
                {/* Top gradient accent */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-500 to-cyan-500 opacity-60 transition-opacity group-hover:opacity-100" />

                <div className="p-5">
                  {/* Header: Avatar + Name + Badge */}
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
                        'ring-2 ring-white dark:ring-card shadow-sm',
                        'transition-transform duration-200 group-hover:scale-105',
                        biz.avatarColor,
                      )}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-foreground">
                          {biz.displayName}
                        </h3>
                        {badgeLabel && (
                          <span className={cn(
                            'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold',
                            badgeColor,
                          )}>
                            <BadgeIcon className="size-3" />
                            {badgeLabel}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {biz.specialty}
                      </p>
                    </div>
                  </div>

                  {/* Rating + City + Projects */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <BusinessStarRating rating={biz.rating} />
                      <span className="text-xs font-bold tabular-nums text-foreground">{biz.rating}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3" aria-hidden="true" />
                      {biz.city}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Briefcase className="size-3" aria-hidden="true" />
                      {biz.projectCount.toLocaleString('fa-IR')} پروژه
                    </span>
                  </div>

                  {/* Skills Tags */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {biz.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-lg bg-muted/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border/20 transition-colors group-hover:bg-emerald-50/60 group-hover:text-emerald-700 group-hover:ring-emerald-200/40 dark:group-hover:bg-emerald-950/30 dark:group-hover:text-emerald-400 dark:group-hover:ring-emerald-800/30"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Browse skills */}
        <div className="mt-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            تخصص‌های پرتقاضا
          </p>
          <div className="flex flex-wrap gap-2">
            {FEATURED_SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => {
                  navigateTo('browse-specialists');
                }}
                className="btn-glass rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-foreground"
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
