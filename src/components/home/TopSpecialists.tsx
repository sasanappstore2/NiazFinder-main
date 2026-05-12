'use client';

import { motion } from 'framer-motion';
import { Star, BadgeCheck, ArrowLeft, MapPin, Briefcase, TrendingUp, Crown } from 'lucide-react';
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
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];

const SKILL_GRADIENT_COLORS = [
  'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  'bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-700 dark:text-amber-300',
  'bg-gradient-to-r from-rose-500/10 to-rose-500/5 text-rose-700 dark:text-rose-300',
  'bg-gradient-to-r from-sky-500/10 to-sky-500/5 text-sky-700 dark:text-sky-300',
  'bg-gradient-to-r from-violet-500/10 to-violet-500/5 text-violet-700 dark:text-violet-300',
  'bg-gradient-to-r from-teal-500/10 to-teal-500/5 text-teal-700 dark:text-teal-300',
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

function FeaturedRibbon() {
  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-2.5 py-1 shadow-md shadow-amber-500/25">
      <Crown className="size-3 text-white" />
      <span className="text-[10px] font-bold text-white">متخصص برتر</span>
    </div>
  );
}

function SpecialistCard({ specialist, index }: { specialist: typeof MOCK_SPECIALISTS[number]; index: number }) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const isFeatured = index === 0;

  return (
    <Card className={`group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-primary/40 dark:hover:border-primary/30 ${isFeatured ? 'ring-1 ring-amber-400/30 dark:ring-amber-400/20' : ''}`}>
      {/* Featured ribbon */}
      {isFeatured && <FeaturedRibbon />}

      <CardContent className="p-6">
        {/* Top: Avatar + Name */}
        <div className="mb-4 flex items-start gap-3">
          <div className="relative">
            <Avatar className="size-14 ring-2 ring-primary/20 transition-all duration-500 group-hover:ring-primary/40 group-hover:ring-[3px] group-hover:shadow-lg group-hover:shadow-primary/10">
              <AvatarImage src={specialist.avatar} alt={specialist.displayName} />
              <AvatarFallback className={AVATAR_COLORS[index % AVATAR_COLORS.length] + ' text-base font-bold'}>
                {specialist.firstName.charAt(0)}{specialist.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator with pulsing animation */}
            {specialist.online && (
              <>
                <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500 animate-pulse-online" />
              </>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold leading-snug transition-colors duration-300 group-hover:text-primary">{specialist.displayName}</h3>
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

        {/* Skills with gradient backgrounds */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {specialist.skills.slice(0, 3).map((skill, skillIdx) => (
            <Badge
              key={skill.name}
              variant="secondary"
              className={`rounded-lg text-[11px] font-medium border-0 ${SKILL_GRADIENT_COLORS[(index + skillIdx) % SKILL_GRADIENT_COLORS.length]}`}
            >
              {skill.name}
            </Badge>
          ))}
          {specialist.skills.length > 3 && (
            <Badge variant="outline" className="rounded-lg text-[11px] border-border/50">
              +{specialist.skills.length - 3}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 transition-all duration-500 group-hover:bg-primary/5 group-hover:shadow-sm">
          <div className="flex flex-col items-center gap-0.5">
            <Briefcase className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
            <span className="text-xs font-semibold">
              {specialist.projectCount.toLocaleString('fa-IR')} پروژه
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <TrendingUp className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
            <span className="text-xs font-semibold">
              {specialist.completionRate.toLocaleString('fa-IR')}٪ تکمیل
            </span>
          </div>
        </div>

        {/* CTA */}
        <Button
          onClick={() => navigateTo('specialist-profile', { id: specialist.id })}
          variant="outline"
          className="h-10 w-full rounded-xl text-sm font-semibold transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/20"
        >
          مشاهده پروفایل
          <ArrowLeft className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function TopSpecialists() {
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <section className="relative bg-muted/20 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            متخصص‌های برتر
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground/80">
            برترین متخصص‌ها با بیشترین امتیاز و رضایت
          </p>
        </motion.div>

        {/* Specialists Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6"
        >
          {MOCK_SPECIALISTS.map((specialist, i) => (
            <motion.div key={specialist.id} variants={item}>
              <SpecialistCard specialist={specialist} index={i} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
