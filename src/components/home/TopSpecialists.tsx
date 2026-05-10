'use client';

import { motion } from 'framer-motion';
import { Star, BadgeCheck, ArrowLeft, MapPin, Briefcase, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { MOCK_SPECIALISTS } from '@/lib/constants';

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
            i < Math.floor(rating)
              ? 'fill-amber-400 text-amber-400'
              : i < rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-muted text-muted'
          }`}
        />
      ))}
      <span className="mr-1 text-xs font-medium text-muted-foreground">
        {rating.toLocaleString('fa-IR')}
      </span>
    </div>
  );
}

export function TopSpecialists() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <section className="bg-muted/30 py-16 sm:py-20 lg:py-24">
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
            متخصص‌های برتر
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            برترین متخصص‌ها با بیشترین امتیاز و رضایت
          </p>
        </motion.div>

        {/* Specialists Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {MOCK_SPECIALISTS.map((specialist, i) => (
            <motion.div key={specialist.id} variants={item}>
              <Card className="group border-border/60 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200 dark:hover:border-emerald-800">
                <CardContent className="p-6">
                  {/* Top: Avatar + Name */}
                  <div className="mb-4 flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="size-14 ring-2 ring-primary/20">
                        <AvatarImage src={specialist.avatar} alt={specialist.displayName} />
                        <AvatarFallback className={AVATAR_COLORS[i % AVATAR_COLORS.length] + ' text-base font-bold'}>
                          {specialist.firstName.charAt(0)}{specialist.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator */}
                      {specialist.online && (
                        <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-bold">{specialist.displayName}</h3>
                        {specialist.isVerified && (
                          <BadgeCheck className="size-4 shrink-0 fill-emerald-500 text-white" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {specialist.city}
                      </div>
                      <div className="mt-1">
                        <RatingStars rating={specialist.rating} />
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {specialist.skills.slice(0, 3).map((skill) => (
                      <Badge
                        key={skill.name}
                        variant="secondary"
                        className="rounded-lg bg-primary/5 text-[11px] font-medium text-foreground hover:bg-primary/10"
                      >
                        {skill.name}
                      </Badge>
                    ))}
                    {specialist.skills.length > 3 && (
                      <Badge variant="outline" className="rounded-lg text-[11px]">
                        +{specialist.skills.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <Briefcase className="size-4 text-muted-foreground" />
                      <span className="text-xs font-semibold">
                        {specialist.projectCount.toLocaleString('fa-IR')} پروژه
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <span className="text-xs font-semibold">
                        {specialist.completionRate.toLocaleString('fa-IR')}٪ تکمیل
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={() => navigateTo('specialist-profile', { id: specialist.id })}
                    variant="outline"
                    className="h-10 w-full rounded-xl text-sm font-medium"
                  >
                    مشاهده پروفایل
                    <ArrowLeft className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
