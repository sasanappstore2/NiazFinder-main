'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  MapPin,
  BadgeCheck,
  MessageCircle,
  UserPlus,
  Briefcase,
  TrendingUp,
  MessageSquare,
  Clock,
  DollarSign,
  CalendarDays,
  Zap,
  FolderOpen,
  Quote,
  Package,
  PenLine,
  Star,
} from 'lucide-react';
import { StarRating } from '@/components/shared/StarRating';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { ShareButton } from '@/components/shared/ShareButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import {
  MOCK_SPECIALISTS,
  MOCK_REVIEWS,
  formatPrice,
  getTimeAgo,
} from '@/lib/constants';
import type { SpecialistProfile as SpecialistProfileType, Portfolio, Review } from '@/lib/types';
import { routeBuilder } from '@/config/routes';

// ─── Avatar helpers ────────────────────────────────────
const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
];

const AVATAR_SOLID = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
];

const PORTFOLIO_GRADIENTS = [
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-sky-500',
  'from-teal-400 to-emerald-500',
];

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getAvatarSolid(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_SOLID[hash % AVATAR_SOLID.length];
}

function getInitials(name: string) {
  const parts = name.split(' ');
  return parts.length > 1
    ? parts[0][0] + parts[1][0]
    : parts[0][0];
}

function getGradient(index: number) {
  return PORTFOLIO_GRADIENTS[index % PORTFOLIO_GRADIENTS.length];
}



// ─── Skill level dots ─────────────────────────────────
function SkillLevelDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`size-1.5 rounded-full ${
            i < level ? 'bg-emerald-500' : 'bg-muted-foreground/20'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <Card className="border-border/40 bg-white/80 backdrop-blur-xs dark:bg-card/80 transition-all duration-200 hover:shadow-md hover:border-emerald-200/40 dark:hover:border-emerald-800/40">
      <CardContent className="flex flex-col items-center gap-1.5 p-4 text-center">
        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20" aria-hidden="true">
          <Icon className="size-4.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-caption font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-extrabold">
          {typeof value === 'number' ? value.toLocaleString('fa-IR') : value}
          {suffix && <span className="text-xs font-medium text-muted-foreground mr-0.5">{suffix}</span>}
        </span>
      </CardContent>
    </Card>
  );
}

// ─── Portfolio Card ───────────────────────────────────
function PortfolioCard({ portfolio, index }: { portfolio: Portfolio; index: number }) {
  return (
    <Card className="group overflow-hidden border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/6 hover:border-emerald-300/60 dark:hover:border-emerald-700/60">
      <div className={`aspect-video bg-linear-to-br ${getGradient(index)} relative flex items-center justify-center`} aria-hidden="true">
        <div className="flex flex-col items-center gap-1 text-white/80">
          <FolderOpen className="size-8" />
          <span className="text-xs font-medium">{portfolio.title}</span>
        </div>
        {portfolio.completedAt && (
          <Badge className="absolute top-2 left-2 rounded-lg bg-black/30 text-caption text-white border-0 backdrop-blur-xs">
            {new Date(portfolio.completedAt).toLocaleDateString('fa-IR')}
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="mb-1 text-sm font-bold truncate">{portfolio.title}</h3>
        {portfolio.description && (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {portfolio.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Review Card ──────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  const fullName = `${review.author.firstName} ${review.author.lastName}`;
  const initials = getInitials(fullName);
  const colorClass = getAvatarColor(fullName);

  return (
    <Card className="border-border/50 bg-card transition-all duration-300 hover:border-emerald-300/60 dark:hover:border-emerald-700/60 hover:shadow-lg hover:shadow-emerald-500/4">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold ${colorClass}`} aria-hidden="true">
              {initials}
            </div>
            <div>
              <h4 className="text-sm font-bold">{fullName}</h4>
              <span className="text-caption text-muted-foreground">{getTimeAgo(review.createdAt)}</span>
            </div>
          </div>
          <StarRating rating={review.rating} size="xs" />
        </div>
        {review.comment && (
          <div className="relative rounded-xl bg-muted/40 p-4">
            <Quote className="absolute top-3 right-3 size-4 text-muted-foreground/30" aria-hidden="true" />
            <p className="pr-5 text-sm leading-7 text-muted-foreground">{review.comment}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sidebar info row ─────────────────────────────────
function SidebarRow({
  icon: Icon,
  label,
  value,
  iconColor = 'text-emerald-500',
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60" aria-hidden="true">
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <span className="block text-caption text-muted-foreground">{label}</span>
        <span className="block text-sm font-medium truncate">{value}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
export function SpecialistProfile({
  id: idProp,
  specialistId: specialistIdProp,
}: { id?: string; specialistId?: string } = {}) {
  const params = useParams();
  const { navigateTo } = useNavigate();

  const specialistId =
    idProp ?? specialistIdProp ?? (typeof params?.id === 'string' ? params.id : '');
  const specialist: SpecialistProfileType =
    MOCK_SPECIALISTS.find((s) => s.id === specialistId) || MOCK_SPECIALISTS[0];

  const initials = getInitials(specialist.displayName ?? '');
  const avatarColor = getAvatarColor(specialist.displayName ?? '');
  const avatarSolid = getAvatarSolid(specialist.displayName ?? '');

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl" itemScope itemType="https://schema.org/Person">
      <meta itemProp="name" content={specialist.displayName} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Back Button ──────────────────── */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTo('browse-specialists')}
            className="gap-2 text-sm text-muted-foreground"
            data-href="/browse?type=business"
            aria-label="بازگشت به لیست کسب‌وکارها"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
            بازگشت به کسب‌وکارها
          </Button>
        </div>

        {/* ── Profile Header Card ──────────────────── */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-border/50 shadow-lg shadow-black/3">
          {/* Gradient banner */}
          <div className="relative bg-linear-to-bl from-emerald-500 via-emerald-600 to-teal-700 px-6 pb-24 pt-8 sm:px-10 sm:pt-10" aria-hidden="true">
            <div className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 size-60 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -right-8 bottom-4 size-32 rounded-full bg-white/5" />
          </div>

          {/* Profile info overlay */}
          <div className="relative bg-card px-6 pb-6 pt-0 dark:bg-card sm:px-10">
            {/* Avatar positioned on the gradient */}
            <div className="-mt-16 mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="relative">
                  <div className={`size-28 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white shadow-lg ring-4 ring-card ${avatarSolid}`} aria-hidden="true" itemProp="image">
                    {initials}
                  </div>
                  {specialist.online && (
                    <span className="absolute -bottom-1 -left-1 size-5 rounded-full border-3 border-card bg-emerald-500 shadow-sm" aria-label="آنلاین" />
                  )}
                </div>
                <div className="mb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold sm:text-2xl" itemProp="name">
                      {specialist.displayName}
                    </h1>
                    {specialist.isVerified && (
                      <BadgeCheck className="size-6 fill-emerald-500 text-white" aria-label="احراز هویت شده" />
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      <span itemProp="address">{specialist.city}</span>
                    </span>
                    {specialist.online ? (
                      <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                        آنلاین
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="size-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                        آفلاین
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 sm:gap-3 sm:mb-1">
                <BookmarkButton id={specialist.id} type="specialist" size="md" />
                <Button className="gap-2 rounded-xl px-5" data-href="/messages" aria-label={`ارسال پیام به ${specialist.displayName}`} title={`ارسال پیام به ${specialist.displayName}`}>
                  <MessageCircle className="size-4" aria-hidden="true" />
                  ارسال پیام
                </Button>
                <Button variant="outline" className="gap-2 rounded-xl px-5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30" aria-label={`دعوت ${specialist.displayName} به پروژه`} title="دعوت کسب‌وکار به پروژه جدید">
                  <UserPlus className="size-4" aria-hidden="true" />
                  دعوت به پروژه
                </Button>
                <ShareButton
                  title={specialist.displayName}
                  description={`پروفایل کسب‌وکار ${specialist.displayName} در نیاز فایندر`}
                  url={`https://needfinder.ir${routeBuilder.pro(specialist.id)}`}
                  label="اشتراک‌گذاری پروفایل"
                />
              </div>
            </div>

            {/* Rating */}
            <div className="mb-5 flex items-center gap-3">
              <StarRating rating={specialist.rating} size="lg" showValue reviewCount={specialist.completedProjects} itemProp="aggregateRating" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={Briefcase}
                label="پروژه‌ها"
                value={specialist.completedProjects}
              />
              <StatCard
                icon={TrendingUp}
                label="نرخ تکمیل"
                value={specialist.completionRate}
                suffix="٪"
              />
              <StatCard
                icon={MessageSquare}
                label="نرخ پاسخ‌دهی"
                value={specialist.responseRate}
                suffix="٪"
              />
            </div>
          </div>
        </div>

        {/* ── Main Content (2-column) ──────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Right Column (Main Content) ─────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            <div>
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20" aria-hidden="true">
                      <UserPlus className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    درباره کسب‌وکار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-8 text-sm text-muted-foreground" itemProp="description">
                    {specialist.bio}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Skills */}
            <div>
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20" aria-hidden="true">
                      <Zap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    مهارت‌ها
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {specialist.skills.map((skill, index) => {
                      const percentage = Math.round((skill.level / 5) * 100);
                      return (
                        <div key={skill.name}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">{skill.name}</span>
                            <SkillLevelDots level={skill.level} />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted/40" aria-hidden="true">
                              <div
                                className="h-full rounded-full bg-linear-to-l from-emerald-500 to-teal-400 transition-all duration-1000 ease-out"
                                style={{ width: `${percentage}%`, transitionDelay: `${index * 100}ms` }}
                              />
                            </div>
                            <span className="min-w-10 text-xs font-bold tabular-nums text-muted-foreground">
                              {percentage.toLocaleString('fa-IR')}٪
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Portfolio + Reviews Tabs */}
            <div>
              <Tabs defaultValue="portfolio" className="w-full">
                <Card className="border-border/50 bg-card">
                  <CardHeader className="pb-0">
                    <TabsList className="w-full">
                      <TabsTrigger value="portfolio" className="flex-1 gap-1.5">
                        <Package className="size-3.5" aria-hidden="true" />
                        نمونه کارها
                        <Badge variant="secondary" className="rounded-md px-1.5 text-caption">
                          {specialist.portfolios.length.toLocaleString('fa-IR')}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="reviews" className="flex-1 gap-1.5">
                        <Star className="size-3.5" aria-hidden="true" />
                        نظرات
                        <Badge variant="secondary" className="rounded-md px-1.5 text-caption">
                          {MOCK_REVIEWS.length.toLocaleString('fa-IR')}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <TabsContent value="portfolio">
                      {specialist.portfolios.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {specialist.portfolios.map((portfolio, i) => (
                            <PortfolioCard key={portfolio.id} portfolio={portfolio} index={i} />
                          ))}
                        </div>
                      ) : (
                        <div className="py-16 text-center">
                          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted" aria-hidden="true">
                            <FolderOpen className="size-8 text-muted-foreground/40" />
                          </div>
                          <h3 className="mb-2 text-sm font-semibold">نمونه کاری ثبت نشده</h3>
                          <p className="text-xs text-muted-foreground">
                            این کسب‌وکار هنوز نمونه کاری اضافه نکرده است.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="reviews">
                      <div className="space-y-4">
                        {MOCK_REVIEWS.map((review) => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                      </div>
                    </TabsContent>
                  </CardContent>
                </Card>
              </Tabs>
            </div>
          </div>

          {/* ── Left Column (Sidebar) ───────────────── */}
          <div className="space-y-6">

            {/* Quick Info Card */}
            <div>
              <Card className="border-border/50 bg-card">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-bold">اطلاعات سریع</h2>
                  <div className="divide-y divide-border/60">
                    <SidebarRow
                      icon={CalendarDays}
                      label="عضویت از"
                      value={new Date(specialist.memberSince).toLocaleDateString('fa-IR')}
                      iconColor="text-emerald-500"
                    />
                    <SidebarRow
                      icon={Clock}
                      label="زمان پاسخ‌دهی"
                      value={specialist.responseTime || 'نامشخص'}
                      iconColor="text-amber-500"
                    />
                    {specialist.hourlyRate && specialist.hourlyRate > 0 && (
                      <SidebarRow
                        icon={DollarSign}
                        label="نرخ ساعتی"
                        value={formatPrice(specialist.hourlyRate)}
                        iconColor="text-emerald-500"
                      />
                    )}
                    {specialist.minProjectPrice && specialist.minProjectPrice > 0 && (
                      <SidebarRow
                        icon={Briefcase}
                        label="حداقل قیمت پروژه"
                        value={formatPrice(specialist.minProjectPrice)}
                        iconColor="text-violet-500"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Skills Summary */}
            <div>
              <Card className="border-border/50 bg-card">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-bold">مهارت‌ها</h2>
                  <div className="flex flex-wrap gap-2">
                    {specialist.skills.map((skill) => (
                      <Badge
                        key={skill.name}
                        variant="secondary"
                        className="rounded-lg bg-primary/5 text-xs font-medium hover:bg-primary/10 gap-1.5"
                      >
                        {skill.name}
                        <SkillLevelDots level={skill.level} />
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Verified badge card */}
            {specialist.isVerified && (
              <div>
                <Card className="border-emerald-200 bg-linear-to-b from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/40 dark:to-card">
                  <CardContent className="p-5 text-center">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30" aria-hidden="true">
                      <BadgeCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="mb-1 text-sm font-bold">احراز هویت شده</h2>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      هویت و مدارک این کسب‌وکار توسط تیم نیاز فایندر تأیید شده است.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invite CTA */}
            <div>
              <Card className="overflow-hidden border-emerald-200 bg-linear-to-b from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/40 dark:to-card">
                <CardContent className="p-5 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30" aria-hidden="true">
                    <UserPlus className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="mb-2 text-sm font-bold">پروژه‌ای دارید؟</h2>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    همین الان این کسب‌وکار را به پروژه خود دعوت کنید و کار خود را شروع کنید.
                  </p>
                  <Button className="w-full gap-2 rounded-xl" data-href={`${routeBuilder.pro(specialist.id)}/invite`} aria-label="دعوت کسب‌وکار به پروژه" title="دعوت این کسب‌وکار به پروژه شما">
                    <UserPlus className="size-4" aria-hidden="true" />
                    دعوت به پروژه
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Write Review CTA */}
            <div>
              <Button
                variant="outline"
                onClick={() => navigateTo('submit-review', { id: specialist.id })}
                className="w-full gap-2 rounded-xl border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 h-auto py-3"
                data-href={`${routeBuilder.pro(specialist.id)}/review`}
                aria-label={`ثبت نظر برای ${specialist.displayName}`}
                title="ثبت نظر و امتیاز برای این کسب‌وکار"
              >
                <PenLine className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium text-muted-foreground">ثبت نظر و امتیاز</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <noscript>
        <div className="sr-only">
          <h1>پروفایل کسب‌وکار - نیاز فایندر</h1>
          <p>صفحه پروفایل کسب‌وکار شامل اطلاعات شخصی، مهارت‌ها، نمونه کارها، نظرات و امتیازات کسب‌وکار.</p>
        </div>
      </noscript>
    </div>
  );
}
