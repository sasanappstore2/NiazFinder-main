'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useEffect } from 'react';
import { Star, BadgeCheck, ArrowLeft, MapPin, Briefcase, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { routeBuilder } from '@/config/routes';

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
    <div className="flex items-center gap-0.5" aria-label={`امتیاز ${rating} از ۵`} itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
      <meta itemProp="ratingValue" content={String(rating)} />
      <meta itemProp="bestRating" content="5" />
      <meta itemProp="ratingCount" content="1" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : i < rating ? 'fill-amber-400/50 text-amber-400' : 'fill-muted text-muted'}`}
          aria-hidden="true"
        />
      ))}
      <span className="mr-1 text-xs font-medium text-muted-foreground">{rating.toLocaleString('fa-IR')}</span>
    </div>
  );
}

function SpecialistCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-14 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3">
          <Skeleton className="h-10 rounded" />
          <Skeleton className="h-10 rounded" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

function SpecialistCard({ specialist, index }: { specialist: any; index: number }) {
  const { navigateTo } = useNavigate();
  const displayName = specialist.displayName || `${specialist.firstName} ${specialist.lastName}`;
  const firstName = specialist.firstName || '';
  const lastName = specialist.lastName || '';
  const rating = specialist.rating ?? 0;
  const projectCount = specialist.projectCount ?? 0;
  const completionRate = specialist.completionRate ?? 0;
  const skills = specialist.skills || [];
  const city = specialist.city || '';

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/80 hover-lift transition-all 150ms ease" itemScope itemType="https://schema.org/Person">
      <CardContent className="p-5">
        {/* Top: Avatar + Name */}
        <div className="mb-4 flex items-start gap-3">
          <div className="relative">
            <Avatar className="size-14 ring-2 ring-primary/20">
              <AvatarImage src={specialist.avatar} alt={`${displayName} - کسب‌وکار نیاز فایندر`} loading="lazy" />
              <AvatarFallback className={`${AVATAR_COLORS[index % AVATAR_COLORS.length]} text-base font-bold`}>
                {firstName.charAt(0)}{lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {specialist.online && (
              <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" aria-label="آنلاین" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold group-hover:text-primary transition-colors 150ms ease" itemProp="name">{displayName}</h3>
              {specialist.isVerified && <BadgeCheck className="size-4 shrink-0 fill-emerald-500 text-white" aria-label="تایید شده" />}
            </div>
            {city && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden="true" />
                <span itemProp="address">{city}</span>
              </div>
            )}
            {rating > 0 && <div className="mt-1"><RatingStars rating={rating} /></div>}
          </div>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {skills.slice(0, 3).map((skill: any) => (
              <Badge key={skill.name} variant="secondary" className="rounded-lg text-caption font-medium border-0" itemProp="knowsAbout">
                {skill.name}
              </Badge>
            ))}
            {skills.length > 3 && (
              <Badge variant="outline" className="rounded-lg text-caption border-border/50" aria-hidden="true">
                +{skills.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3">
          <div className="flex flex-col items-center gap-0.5">
            <Briefcase className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-semibold">{projectCount.toLocaleString('fa-IR')} پروژه</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-semibold">{completionRate.toLocaleString('fa-IR')}٪ تکمیل</span>
          </div>
        </div>

        {/* CTA */}
        <Button
          onClick={() => navigateTo('specialist-profile', { id: specialist.id })}
          variant="outline"
          className="h-10 w-full rounded-xl text-sm font-semibold transition-all 150ms ease hover:bg-primary hover:text-primary-foreground hover:border-primary"
          data-href={routeBuilder.pro(specialist.id)}
          title={`مشاهده پروفایل ${displayName} - کسب‌وکار ${city}`}
        >
          مشاهده پروفایل
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function TopSpecialists() {
  const specialists = useAppStore((s) => s.specialists);
  const isLoading = useAppStore((s) => s.isLoading);
  const fetchSpecialists = useAppStore((s) => s.fetchSpecialists);

  useEffect(() => {
    fetchSpecialists({ limit: '6' });
  }, [fetchSpecialists]);

  return (
    <section id="specialists" className="section-padding bg-muted/20" aria-label="کسب‌وکارهای برتر" itemScope itemType="https://schema.org/ItemList">
      <div className="container-default mx-auto px-5 md:px-8">
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <h2 className="mb-3 text-2xl md:text-4xl font-extrabold tracking-tight" itemProp="name">کسب‌وکارهای برتر</h2>
            <p className="text-sm md:text-base text-muted-foreground" itemProp="description">برترین کسب‌وکارها با بیشترین امتیاز و رضایت</p>
          </div>
          <Button
            onClick={() => navigateTo('browse-specialists')}
            variant="outline"
            className="hidden sm:inline-flex h-10 rounded-xl border-border/60 px-6 shrink-0 transition-all 150ms ease"
            data-href="/browse?type=business"
            title="مشاهده لیست کامل کسب‌وکارها برتر"
          >
            مشاهده همه
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="در حال بارگذاری کسب‌وکارها" role="status">
            {Array.from({ length: 6 }).map((_, i) => (
              <SpecialistCardSkeleton key={i} />
            ))}
          </div>
        ) : specialists.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">کسب‌وکاری یافت نشد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {specialists.slice(0, 6).map((specialist, i) => (
              <SpecialistCard key={specialist.id} specialist={specialist} index={i} />
            ))}
          </div>
        )}
      </div>

      <noscript>
        <div className="sr-only">
          <h2>کسب‌وکارهای برتر</h2>
          <p>برترین کسب‌وکارها با بیشترین امتیاز و رضایت کاربران در نیاز فایندر. کسب‌وکارها در حوزه‌های مختلف از جمله برنامه‌نویسی، طراحی، بازاریابی و...</p>
        </div>
      </noscript>
    </section>
  );
}
