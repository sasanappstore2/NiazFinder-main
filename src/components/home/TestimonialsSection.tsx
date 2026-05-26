'use client';

import { Star, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MOCK_REVIEWS } from '@/lib/constants';

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];

const REVIEWER_ROLES: Record<string, string> = {
  u1: 'مدیرعامل استارتاپ',
  u2: 'دانشجوی پزشکی',
  u3: 'مدیر بازاریابی',
  u4: 'بنیان‌گذار فین‌تک',
  u5: 'کارآفرین حوزه IT',
  u7: 'وکیل پایه یک',
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`امتیاز ${rating} از ۵`} itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
      <meta itemProp="ratingValue" content={String(rating)} />
      <meta itemProp="bestRating" content="5" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'fill-muted/30 text-muted/40'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="section-padding bg-background" aria-label="نظرات کاربران" itemScope itemType="https://schema.org/ItemList">
      <div className="container-default mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <ShieldCheck className="size-4" aria-hidden="true" />
            نظرات تأیید شده
          </div>
          <h2 className="mb-3 text-2xl md:text-4xl font-bold tracking-tight" itemProp="name">نظرات کاربران</h2>
          <p className="mx-auto max-w-xl text-muted-foreground" itemProp="description">ببینید کاربران ما چه می‌گویند</p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_REVIEWS.map((review, i) => (
            <Card key={review.id} className="card-shadow-sm group h-full overflow-hidden bg-card transition-all duration-300 hover:-translate-y-1" itemScope itemType="https://schema.org/Review">
              <CardContent className="p-5">
                {/* Rating + Verified */}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <RatingStars rating={review.rating} />
                  <Badge variant="secondary" className="gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-caption font-medium text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="size-3" aria-hidden="true" />
                    بررسی شده
                  </Badge>
                </div>

                {/* Comment */}
                <p className="mb-5 text-sm leading-[1.8] text-foreground/85" itemProp="reviewBody">«{review.comment}»</p>

                {/* Author */}
                <div className="flex items-center gap-3 border-t border-border/50 pt-4" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <Avatar className="size-11 ring-2 ring-border/50">
                    <AvatarFallback className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-xs font-bold`} aria-hidden="true">
                      {review.author.firstName.charAt(0)}{review.author.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" itemProp="name">{review.author.firstName} {review.author.lastName}</p>
                    <p className="truncate text-caption font-medium text-muted-foreground" itemProp="jobTitle">
                      {REVIEWER_ROLES[review.author.id] || 'کاربر نیاز فایندر'}
                    </p>
                    <time className="text-caption text-muted-foreground/60" dateTime={review.createdAt} itemProp="datePublished">{formatDate(review.createdAt)}</time>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <h2>نظرات کاربران</h2>
          <p>نظرات تأیید شده کاربران نیاز فایندر. نظرات مدیران استارتاپ، دانشجویان، وکیلان و کارآفرینان درباره تجربه استفاده از پلتفرم.</p>
        </div>
      </noscript>
    </section>
  );
}
