'use client';

import { motion } from 'framer-motion';
import { Star, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MOCK_REVIEWS } from '@/lib/constants';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];

const GRADIENT_ACCENTS = [
  'from-emerald-400 to-teal-400',
  'from-amber-400 to-orange-400',
  'from-rose-400 to-pink-400',
  'from-sky-400 to-cyan-400',
  'from-violet-400 to-purple-400',
  'from-teal-400 to-emerald-400',
];

// Inline profession data for each reviewer
const REVIEWER_PROFESSIONS: Record<string, string> = {
  u1: 'مدیرعامل استارتاپ',
  u2: 'دانشجوی پزشکی',
  u3: 'مدیر بازاریابی',
  u4: 'بنیان‌گذار فین‌تک',
  u5: 'کارآفرین حوزه IT',
  u7: 'وکیل پایه یک',
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-5 transition-transform duration-200 ${
            i < rating
              ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
              : 'fill-muted/30 text-muted/40'
          }`}
        />
      ))}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function TestimonialsSection() {
  return (
    <section className="relative bg-background py-16 sm:py-20 lg:py-24">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 start-0 size-[400px] rounded-full bg-emerald-100/20 blur-3xl dark:bg-emerald-900/10" />
        <div className="absolute top-0 end-0 size-[400px] rounded-full bg-amber-100/20 blur-3xl dark:bg-amber-900/10" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <ShieldCheck className="size-4" />
            نظرات تأیید شده
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            نظرات کاربران
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            ببینید کاربران ما چه می‌گویند
          </p>
        </motion.div>

        {/* Reviews Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {MOCK_REVIEWS.map((review, i) => (
            <motion.div key={review.id} variants={item}>
              <Card className="group relative h-full overflow-hidden border-border/60 bg-card transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-500/8 hover:border-emerald-200 dark:hover:border-emerald-800">
                {/* Gradient accent bar at top */}
                <div className={`absolute top-0 start-0 end-0 h-1 bg-gradient-to-l ${GRADIENT_ACCENTS[i % GRADIENT_ACCENTS.length]}`} />

                <CardContent className="p-6 pt-7">
                  {/* Verified badge + Rating row */}
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <RatingStars rating={review.rating} />
                    <Badge
                      variant="secondary"
                      className="gap-1 rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                    >
                      <ShieldCheck className="size-3" />
                      بررسی شده
                    </Badge>
                  </div>

                  {/* Comment */}
                  <p className="mb-5 text-sm leading-[1.8] text-foreground/85">
                    «{review.comment}»
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 border-t border-border/50 pt-4">
                    <Avatar className="size-11 ring-2 ring-border/50 transition-all duration-300 group-hover:ring-emerald-200 dark:group-hover:ring-emerald-800">
                      <AvatarFallback className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-xs font-bold`}>
                        {review.author.firstName.charAt(0)}{review.author.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {review.author.firstName} {review.author.lastName}
                      </p>
                      <p className="truncate text-[11px] font-medium text-muted-foreground">
                        {REVIEWER_PROFESSIONS[review.author.id] || 'کاربر نیاز فایندر'}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
