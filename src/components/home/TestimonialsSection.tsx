'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MOCK_REVIEWS } from '@/lib/constants';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i < rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted'
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
    <section className="bg-background py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
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
              <Card className="group border-border/60 bg-card h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200 dark:hover:border-emerald-800">
                <CardContent className="p-6">
                  {/* Quote Icon */}
                  <Quote className="mb-4 size-8 text-emerald-200 dark:text-emerald-800" />

                  {/* Comment */}
                  <p className="mb-5 text-sm leading-relaxed text-foreground/80 line-clamp-4">
                    {review.comment}
                  </p>

                  {/* Rating */}
                  <div className="mb-4">
                    <RatingStars rating={review.rating} />
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 border-t border-border/50 pt-4">
                    <Avatar className="size-10 ring-1 ring-border">
                      <AvatarFallback className={AVATAR_COLORS[i % AVATAR_COLORS.length] + ' text-xs font-bold'}>
                        {review.author.firstName.charAt(0)}{review.author.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {review.author.firstName} {review.author.lastName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
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
