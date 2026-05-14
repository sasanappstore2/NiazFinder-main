'use client';

import { Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

const TESTIMONIALS = [
  {
    id: 't1',
    name: 'محمد رضایی',
    role: 'مدیرعامل شرکت فناوری آرمان',
    rating: 5,
    text: 'با نیاز فایندر توانستیم بهترین تیم توسعه را برای پروژه‌مون پیدا کنیم. کیفیت کار و سرعت تحویل فوق‌العاده بود. قطعاً بهترین پلتفرم ایرانی.',
    avatarColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  {
    id: 't2',
    name: 'زهرا کریمی',
    role: 'طراح گرافیک مستقل',
    rating: 5,
    text: 'از زمانی که عضو نیاز فایندر شدم، درآمد من ۳ برابر شده. سیستم پیشنهاددهی عالی کار می‌کنه و مشتری‌های واقعی پیدا می‌کنم.',
    avatarColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  {
    id: 't3',
    name: 'امیر حسینی',
    role: 'صاحب استارتاپ نوفا',
    rating: 4,
    text: 'برای طراحی اپلیکیشن موبایل از نیاز فایندر استفاده کردیم. بسیار راضی هستیم و حتماً دوباره استفاده خواهیم کرد.',
    avatarColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  {
    id: 't4',
    name: 'فاطمه محمدی',
    role: 'مشاور مهاجرت',
    rating: 5,
    text: 'پلتفرم بسیار حرفه‌ای و کاربرپسند. سیستم پرداخت امن خیال من رو راحت کرده. به همه توصیه می‌کنم.',
    avatarColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  },
  {
    id: 't5',
    name: 'حسن نوری',
    role: 'برنامه‌نویس فریلنسر',
    rating: 5,
    text: 'نیاز فایندر بهترین پلتفرم ایرانی برای اتصال کسب‌وکارها به کارفرمایانه. کاملاً قابل اعتماد و حرفه‌ای.',
    avatarColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
  {
    id: 't6',
    name: 'سارا احمدی',
    role: 'مدیر بازاریابی دیجی‌مارکت',
    rating: 4,
    text: 'تولید محتوا و سئوی سایتمون رو به کسب‌وکارهای نیاز فایندر سپردیم و نتیجه عالی بود. ترافیک سایت ما ۴۰٪ افزایش پیدا کرد.',
    avatarColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  },
];

function RatingStars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`امتیاز ${rating} از ۵`}
      itemProp="reviewRating"
      itemScope
      itemType="https://schema.org/Rating"
    >
      <meta itemProp="ratingValue" content={String(rating)} />
      <meta itemProp="bestRating" content="5" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-4',
            i < rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted/30 text-muted/40',
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function HomepageTestimonials() {
  return (
    <section
      dir="rtl"
      className="section-padding bg-background"
      aria-label="نظرات کاربران"
      itemScope
      itemType="https://schema.org/ItemList"
    >
      <div className="container-default mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2
            className="mb-3 text-2xl md:text-4xl font-extrabold tracking-tight"
            itemProp="name"
          >
            <span className="text-gradient">نظر کاربران</span> ما
          </h2>
          <p className="mx-auto max-w-xl text-sm md:text-base text-muted-foreground">
            تجربه واقعی کاربران نیاز فایندر
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="stagger-children grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => {
            const initials = `${t.name.charAt(0)}${t.name.split(' ')[1]?.charAt(0) || ''}`;
            return (
              <div
                key={t.id}
                className={cn(
                  'group relative rounded-2xl border p-5',
                  'bg-white/60 dark:bg-card/50 backdrop-blur-md',
                  'border-border/40 dark:border-border/20',
                  'shadow-sm shadow-black/[0.03] dark:shadow-black/10',
                  'transition-all duration-300',
                  'hover:shadow-md hover:shadow-emerald-900/[0.06] dark:hover:shadow-black/20',
                  'hover:-translate-y-1 hover:bg-white/80 dark:hover:bg-card/70',
                )}
                itemScope
                itemType="https://schema.org/Review"
              >
                {/* Quote icon — decorative */}
                <Quote
                  className="absolute top-4 start-4 size-8 text-emerald-200/60 dark:text-emerald-800/40 group-hover:text-emerald-300/80 dark:group-hover:text-emerald-700/50 transition-colors duration-300"
                  aria-hidden="true"
                />

                {/* Rating */}
                <div className="mb-4 flex items-center gap-2">
                  <RatingStars rating={t.rating} />
                </div>

                {/* Comment */}
                <p
                  className="mb-5 text-sm leading-[1.9] text-foreground/85"
                  itemProp="reviewBody"
                >
                  «{t.text}»
                </p>

                {/* Author */}
                <div
                  className="flex items-center gap-3 border-t border-border/40 pt-4"
                  itemProp="author"
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      'ring-2 ring-white dark:ring-card',
                      t.avatarColor,
                    )}
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" itemProp="name">
                      {t.name}
                    </p>
                    <p className="truncate text-[11px] font-medium text-muted-foreground">
                      {t.role}
                    </p>
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
