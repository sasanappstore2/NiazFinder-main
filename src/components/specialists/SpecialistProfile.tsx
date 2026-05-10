'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  MapPin,
  Star,
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import {
  MOCK_SPECIALISTS,
  MOCK_REVIEWS,
  formatPrice,
  getTimeAgo,
} from '@/lib/constants';
import type { SpecialistProfile as SpecialistProfileType, Portfolio, Review } from '@/lib/types';

// ─── Animation variants ───────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

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

// ─── Rating stars ─────────────────────────────────────
function RatingStars({ rating, showNumber = false }: { rating: number; showNumber?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${
            i < Math.floor(rating)
              ? 'fill-amber-400 text-amber-400'
              : i < rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-muted text-muted'
          }`}
        />
      ))}
      {showNumber && (
        <span className="mr-2 text-2xl font-extrabold tracking-tight">
          {rating.toLocaleString('fa-IR')}
        </span>
      )}
    </div>
  );
}

// ─── Skill level dots ─────────────────────────────────
function SkillLevelDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
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
    <Card className="border-border/60 bg-white/80 backdrop-blur-sm dark:bg-card/80">
      <CardContent className="flex flex-col items-center gap-1.5 p-4 text-center">
        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
          <Icon className="size-4.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
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
    <Card className="group overflow-hidden border-border/60 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800">
      {/* Placeholder image */}
      <div className={`aspect-video bg-gradient-to-br ${getGradient(index)} relative flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-1 text-white/80">
          <FolderOpen className="size-8" />
          <span className="text-xs font-medium">{portfolio.title}</span>
        </div>
        {portfolio.completedAt && (
          <Badge className="absolute top-2 left-2 rounded-lg bg-black/30 text-[10px] text-white border-0 backdrop-blur-sm">
            {new Date(portfolio.completedAt).toLocaleDateString('fa-IR')}
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h4 className="mb-1 text-sm font-bold truncate">{portfolio.title}</h4>
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
    <Card className="border-border/60 bg-card transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm">
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold ${colorClass}`}>
              {initials}
            </div>
            <div>
              <h4 className="text-sm font-bold">{fullName}</h4>
              <span className="text-[11px] text-muted-foreground">{getTimeAgo(review.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-3.5 ${
                  i < review.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-muted text-muted'
                }`}
              />
            ))}
          </div>
        </div>
        {/* Comment */}
        {review.comment && (
          <div className="relative rounded-xl bg-muted/40 p-4">
            <Quote className="absolute top-3 right-3 size-4 text-muted-foreground/30" />
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
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <span className="block text-sm font-medium truncate">{value}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
export function SpecialistProfile() {
  const viewParams = useAppStore((s) => s.viewParams);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const specialistId = viewParams.id || '';
  const specialist: SpecialistProfileType =
    MOCK_SPECIALISTS.find((s) => s.id === specialistId) || MOCK_SPECIALISTS[0];

  const initials = getInitials(specialist.displayName);
  const avatarColor = getAvatarColor(specialist.displayName);
  const avatarSolid = getAvatarSolid(specialist.displayName);

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Back Button ──────────────────────────── */}
        <motion.div {...fadeIn} className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTo('browse-specialists')}
            className="gap-2 text-sm text-muted-foreground"
          >
            <ArrowRight className="size-4" />
            بازگشت به متخصص‌ها
          </Button>
        </motion.div>

        {/* ── Profile Header Card ──────────────────── */}
        <motion.div
          {...fadeIn}
          transition={{ delay: 0.05 }}
          className="mb-6 overflow-hidden rounded-2xl border border-border/60"
        >
          {/* Gradient banner */}
          <div className="relative bg-gradient-to-bl from-emerald-500 via-emerald-600 to-teal-700 px-6 pb-24 pt-8 sm:px-10 sm:pt-10">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 size-60 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -right-8 bottom-4 size-32 rounded-full bg-white/5" />
          </div>

          {/* Profile info overlay */}
          <div className="relative bg-card px-6 pb-6 pt-0 dark:bg-card sm:px-10">
            {/* Avatar positioned on the gradient */}
            <div className="-mt-16 mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className={`size-28 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white shadow-lg ring-4 ring-card ${avatarSolid}`}>
                    {initials}
                  </div>
                  {/* Online indicator */}
                  {specialist.online && (
                    <span className="absolute -bottom-1 -left-1 size-5 rounded-full border-3 border-card bg-emerald-500 shadow-sm" />
                  )}
                </div>
                <div className="mb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold sm:text-2xl">
                      {specialist.displayName}
                    </h1>
                    {specialist.isVerified && (
                      <BadgeCheck className="size-6 fill-emerald-500 text-white" />
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {specialist.city}
                    </span>
                    {specialist.online ? (
                      <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        آنلاین
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="size-2 rounded-full bg-muted-foreground/40" />
                        آفلاین
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 sm:mb-1">
                <Button className="gap-2 rounded-xl px-5">
                  <MessageCircle className="size-4" />
                  ارسال پیام
                </Button>
                <Button variant="outline" className="gap-2 rounded-xl px-5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                  <UserPlus className="size-4" />
                  دعوت به پروژه
                </Button>
              </div>
            </div>

            {/* Rating */}
            <div className="mb-5 flex items-center gap-3">
              <RatingStars rating={specialist.rating} showNumber />
              <span className="text-xs text-muted-foreground">
                ({specialist.completedProjects.toLocaleString('fa-IR')} نظر)
              </span>
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
        </motion.div>

        {/* ── Main Content (2-column) ──────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Right Column (Main Content) ─────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
              <Card className="border-border/60 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <UserPlus className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    درباره متخصص
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-8 text-sm text-muted-foreground">
                    {specialist.bio}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Skills */}
            <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
              <Card className="border-border/60 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <Zap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    مهارت‌ها
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {specialist.skills.map((skill) => (
                      <div key={skill.name} className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{skill.name}</span>
                            <SkillLevelDots level={skill.level} />
                          </div>
                          <Progress
                            value={(skill.level / 5) * 100}
                            className="h-1.5"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Portfolio + Reviews Tabs */}
            <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
              <Tabs defaultValue="portfolio" className="w-full">
                <Card className="border-border/60 bg-card">
                  <CardHeader className="pb-0">
                    <TabsList className="w-full">
                      <TabsTrigger value="portfolio" className="flex-1 gap-1.5">
                        <Package className="size-3.5" />
                        نمونه کارها
                        <Badge variant="secondary" className="rounded-md px-1.5 text-[10px]">
                          {specialist.portfolios.length.toLocaleString('fa-IR')}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="reviews" className="flex-1 gap-1.5">
                        <Star className="size-3.5" />
                        نظرات
                        <Badge variant="secondary" className="rounded-md px-1.5 text-[10px]">
                          {MOCK_REVIEWS.length.toLocaleString('fa-IR')}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Portfolio Tab */}
                    <TabsContent value="portfolio">
                      {specialist.portfolios.length > 0 ? (
                        <motion.div
                          variants={container}
                          initial="hidden"
                          animate="show"
                          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                        >
                          {specialist.portfolios.map((portfolio, i) => (
                            <motion.div key={portfolio.id} variants={item}>
                              <PortfolioCard portfolio={portfolio} index={i} />
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : (
                        <div className="py-16 text-center">
                          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
                            <FolderOpen className="size-8 text-muted-foreground/40" />
                          </div>
                          <h3 className="mb-2 text-sm font-semibold">نمونه کاری ثبت نشده</h3>
                          <p className="text-xs text-muted-foreground">
                            این متخصص هنوز نمونه کاری اضافه نکرده است.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Reviews Tab */}
                    <TabsContent value="reviews">
                      <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="space-y-4"
                      >
                        {MOCK_REVIEWS.map((review) => (
                          <motion.div key={review.id} variants={item}>
                            <ReviewCard review={review} />
                          </motion.div>
                        ))}
                      </motion.div>
                    </TabsContent>
                  </CardContent>
                </Card>
              </Tabs>
            </motion.div>
          </div>

          {/* ── Left Column (Sidebar) ───────────────── */}
          <div className="space-y-6">

            {/* Quick Info Card */}
            <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
              <Card className="border-border/60 bg-card">
                <CardContent className="p-5">
                  <h3 className="mb-3 text-sm font-bold">اطلاعات سریع</h3>
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
            </motion.div>

            {/* Skills Summary */}
            <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
              <Card className="border-border/60 bg-card">
                <CardContent className="p-5">
                  <h3 className="mb-3 text-sm font-bold">مهارت‌ها</h3>
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
            </motion.div>

            {/* Verified badge card */}
            {specialist.isVerified && (
              <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
                <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/40 dark:to-card">
                  <CardContent className="p-5 text-center">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                      <BadgeCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="mb-1 text-sm font-bold">احراز هویت شده</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      هویت و مدارک این متخصص توسط تیم نیاز فایندر تأیید شده است.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Invite CTA */}
            <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
              <Card className="overflow-hidden border-emerald-200 bg-gradient-to-b from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/40 dark:to-card">
                <CardContent className="p-5 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                    <UserPlus className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="mb-2 text-sm font-bold">پروژه‌ای دارید؟</h3>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    همین الان این متخصص را به پروژه خود دعوت کنید و کار خود را شروع کنید.
                  </p>
                  <Button className="w-full gap-2 rounded-xl">
                    <UserPlus className="size-4" />
                    دعوت به پروژه
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
