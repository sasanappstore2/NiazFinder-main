'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  MapPin,
  Clock,
  DollarSign,
  FileText,
  Flame,
  Calendar,
  User,
  BadgeCheck,
  Star,
  Timer,
  MessageSquare,
  Send,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import {
  MOCK_REQUESTS,
  formatPrice,
  formatBudgetRange,
  getTimeAgo,
  getPriorityLabel,
  getStatusLabel,
  getBudgetTypeLabel,
  MOCK_SPECIALISTS,
} from '@/lib/constants';
import type { Proposal } from '@/lib/types';

// ─── Animation ────────────────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Avatar color generator ───────────────────────────
const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
];

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getAvatarBg(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  ];
  return colors[hash % colors.length];
}

// ─── Priority config ──────────────────────────────────
function getPriorityConfig(priority: string) {
  const configs: Record<string, { className: string; icon: typeof Flame }> = {
    URGENT: { className: 'bg-destructive/10 text-destructive border-destructive/20', icon: Flame },
    HIGH: { className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', icon: Flame },
    NORMAL: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
    LOW: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
  };
  return configs[priority] || configs.NORMAL;
}

function getStatusConfig(status: string) {
  const configs: Record<string, string> = {
    OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    CLOSED: 'bg-gray-50 text-gray-600 border-gray-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  };
  return configs[status] || 'bg-muted text-muted-foreground border-border';
}

// ─── Rating stars ─────────────────────────────────────
function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'md' ? 'size-4' : 'size-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i < Math.floor(rating)
              ? 'fill-amber-400 text-amber-400'
              : i < rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-muted text-muted'
          }`}
        />
      ))}
      {size === 'sm' && (
        <span className="mr-1 text-xs font-medium text-muted-foreground">
          {rating.toLocaleString('fa-IR')}
        </span>
      )}
    </div>
  );
}

// ─── Mock Proposals ───────────────────────────────────
function generateMockProposals(): Proposal[] {
  const specialists = MOCK_SPECIALISTS.slice(0, 4);
  return specialists.map((s, i) => ({
    id: `prop-${s.id}`,
    price: [25000000, 20000000, 30000000, 22000000][i],
    deliveryTime: [25, 30, 20, 28][i],
    deliveryUnit: 'day',
    message: [
      'با سلام. من بیش از ۸ سال تجربه در توسعه وب دارم و می‌توانم این پروژه را با بالاترین کیفیت و در زمان مقرر تحویل دهم.',
      'سلام. من می‌توانم این کار را با بهترین کیفیت و قیمت مناسب انجام دهم. نمونه کارهای مشابه را در پروفایلم ببینید.',
      'با عرض سلام. من متخصص توسعه وب هستم و قبلاً پروژه‌های مشابهی را با موفقیت انجام داده‌ام. آماده همکاری هستم.',
      'سلام وقت بخیر. من با توجه به تجربه‌ای که دارم می‌توانم پروژه شما را به بهترین شکل انجام دهم.',
    ][i],
    status: (['PENDING', 'PENDING', 'PENDING', 'PENDING'] as const)[i],
    isRead: true,
    user: {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      avatar: s.avatar,
      rating: s.rating,
      projectCount: s.projectCount,
      isVerified: s.isVerified,
      bio: s.bio,
      city: s.city,
    },
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

// ─── Proposal Card ────────────────────────────────────
function ProposalCard({ proposal, onSelect }: { proposal: Proposal; onSelect: () => void }) {
  const fullName = `${proposal.user.firstName} ${proposal.user.lastName}`;
  const initials = `${proposal.user.firstName.charAt(0)}${proposal.user.lastName.charAt(0)}`;
  const avatarBg = getAvatarBg(fullName);

  return (
    <Card className="border-border/60 bg-card transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm">
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`size-11 rounded-full flex items-center justify-center text-sm font-bold ${avatarBg}`}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold">{fullName}</h4>
                {proposal.user.isVerified && (
                  <BadgeCheck className="size-4 fill-emerald-500 text-white" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {proposal.user.city}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {getTimeAgo(proposal.createdAt)}
          </span>
        </div>

        {/* Message */}
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {proposal.message}
        </p>

        {/* Stats row */}
        <div className="mb-4 flex items-center gap-4 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-1.5">
            <DollarSign className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold">{formatPrice(proposal.price)}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <Timer className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {proposal.deliveryTime} روز
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium">{proposal.user.rating.toLocaleString('fa-IR')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {proposal.user.projectCount.toLocaleString('fa-IR')} پروژه انجام شده
          </span>
          <Button size="sm" onClick={onSelect} className="rounded-lg gap-1.5">
            <CheckCircle2 className="size-4" />
            انتخاب
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Info Card ────────────────────────────────────────
function InfoCard({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
          <Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-sm font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────
export function RequestDetail() {
  const viewParams = useAppStore((s) => s.viewParams);
  const goBack = useAppStore((s) => s.goBack);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const requestId = viewParams.id || 'r1';
  const request = MOCK_REQUESTS.find((r) => r.id === requestId) || MOCK_REQUESTS[0];

  const proposals = useMemo(() => generateMockProposals(), []);
  const [proposalSort, setProposalSort] = useState<'newest' | 'price_low' | 'price_high'>('newest');

  const sortedProposals = useMemo(() => {
    const sorted = [...proposals];
    switch (proposalSort) {
      case 'price_low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [proposals, proposalSort]);

  const priorityConfig = getPriorityConfig(request.priority);
  const PriorityIcon = priorityConfig.icon;
  const statusClassName = getStatusConfig(request.status);

  const authorName = `${request.user.firstName} ${request.user.lastName}`;
  const authorInitials = `${request.user.firstName.charAt(0)}${request.user.lastName.charAt(0)}`;
  const authorAvatarBg = getAvatarBg(authorName);

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back + Title Header */}
        <motion.div {...fadeIn} className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="mb-4 gap-2 text-sm text-muted-foreground"
          >
            <ArrowRight className="size-4" />
            بازگشت
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`rounded-lg text-[11px] font-medium ${statusClassName}`}>
                  {getStatusLabel(request.status)}
                </Badge>
                <Badge variant="outline" className={`rounded-lg text-[11px] font-medium ${priorityConfig.className}`}>
                  <PriorityIcon className="size-3" />
                  {getPriorityLabel(request.priority)}
                </Badge>
                <Badge variant="secondary" className="rounded-lg text-[11px]">
                  {request.categoryIcon} {request.categoryName}
                </Badge>
              </div>
              <h1 className="text-xl font-bold leading-snug sm:text-2xl lg:text-3xl">
                {request.title}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {getTimeAgo(request.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="size-3.5" />
                  {request.viewCount.toLocaleString('fa-IR')} بازدید
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Info Cards Row */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="mb-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCard
              icon={DollarSign}
              label="بودجه"
              value={formatBudgetRange(request.budgetMin, request.budgetMax)}
            />
            <InfoCard
              icon={MapPin}
              label="شهر"
              value={request.city || 'نامشخص'}
            />
            <InfoCard
              icon={Clock}
              label="زمان تحویل"
              value={request.deliveryTime ? `${request.deliveryTime} روز` : 'نامشخص'}
            />
            <InfoCard
              icon={FileText}
              label="پیشنهادها"
              value={`${request.proposalCount.toLocaleString('fa-IR')} پیشنهاد`}
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
              <Card className="border-border/60 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">توضیحات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-8 text-sm text-muted-foreground whitespace-pre-line">
                    {request.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tags */}
            {request.tags.length > 0 && (
              <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                <Card className="border-border/60 bg-card">
                  <CardContent className="p-4">
                    <h3 className="mb-3 text-sm font-semibold">تگ‌ها</h3>
                    <div className="flex flex-wrap gap-2">
                      {request.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="rounded-lg bg-primary/5 text-xs font-medium hover:bg-primary/10"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Budget type note */}
            <motion.div {...fadeIn} transition={{ delay: 0.22 }}>
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                <DollarSign className="size-4 text-emerald-500" />
                <span>
                  نوع بودجه:{' '}
                  <span className="font-medium text-foreground">
                    {getBudgetTypeLabel(request.budgetType)}
                  </span>
                </span>
              </div>
            </motion.div>

            {/* Proposals Section */}
            <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
              <Card className="border-border/60 bg-card">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">
                      پیشنهادها
                      <Badge variant="secondary" className="mr-2 text-xs">
                        {request.proposalCount.toLocaleString('fa-IR')}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">مرتب‌سازی:</span>
                      <select
                        value={proposalSort}
                        onChange={(e) => setProposalSort(e.target.value as typeof proposalSort)}
                        className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/20"
                      >
                        <option value="newest">جدیدترین</option>
                        <option value="price_low">ارزان‌ترین</option>
                        <option value="price_high">گران‌ترین</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onSelect={() => {}}
                    />
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Author info */}
            <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
              <Card className="border-border/60 bg-card">
                <CardContent className="p-5">
                  <h3 className="mb-4 text-sm font-semibold">اطلاعات کاربر</h3>
                  <div className="flex items-center gap-3">
                    <div className={`size-14 rounded-full flex items-center justify-center text-base font-bold ${authorAvatarBg}`}>
                      {authorInitials}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{authorName}</h4>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {request.user.city}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" />
                        عضویت از {new Date(request.user.createdAt).toLocaleDateString('fa-IR')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* CTA: Submit Proposal */}
            <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
              <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/40 dark:to-card">
                <CardContent className="p-5 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                    <Send className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="mb-2 text-sm font-bold">متخصص هستید؟</h3>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    پیشنهاد خود را ارسال کنید و شانس خود را برای انجام این پروژه افزایش دهید.
                  </p>
                  <Button onClick={() => navigateTo('submit-proposal', { id: request.id })} className="w-full gap-2 rounded-xl">
                    <MessageSquare className="size-4" />
                    ارسال پیشنهاد
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
