'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
  Timer,
  MessageSquare,
  Send,
  ChevronDown,
  CheckCircle2,
  Flag,
  Loader2,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { StarRating } from '@/components/shared/StarRating';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { RequestShare } from '@/components/shared/RequestShare';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { ReportUser } from '@/components/shared/ReportUser';
import { cn } from '@/lib/utils';
import {
  formatPrice,
  formatBudgetRange,
  getTimeAgo,
  getPriorityLabel,
  getStatusLabel,
  getBudgetTypeLabel,
  MOCK_SPECIALISTS,
} from '@/lib/constants';
import type { Proposal, ServiceRequest } from '@/lib/types';

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

// ─── Mock proposals generator ───────────────────────────
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
      'با عرض سلام. من کسب‌وکار توسعه وب هستم و قبلاً پروژه‌های مشابهی را با موفقیت انجام داده‌ام. آماده همکاری هستم.',
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

// ─── Proposal Submission Form ──────────────────────────
function ProposalForm({ onRequestSubmitted }: { onRequestSubmitted: () => void }) {
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ description?: string; budget?: string; delivery?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (description.trim().length < 50) {
      newErrors.description = 'توضیحات پیشنهاد باید حداقل ۵۰ کاراکتر باشد';
    }
    if (!budget || Number(budget) <= 0) {
      newErrors.budget = 'لطفاً مبلغ معتبری وارد کنید';
    }
    if (!deliveryDays || Number(deliveryDays) <= 0) {
      newErrors.delivery = 'لطفاً زمان تحویل معتبری وارد کنید';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setDescription('');
    setBudget('');
    setDeliveryDays('');
    setErrors({});
    onRequestSubmitted();
  };

  return (
    <Card className="border-emerald-200/60 bg-white/50 dark:bg-card/50 backdrop-blur-md dark:border-emerald-800/60 shadow-lg shadow-emerald-500/[0.04]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ارسال پیشنهاد
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label htmlFor="proposal-desc" className="mb-1.5 block text-sm font-medium">
              توضیحات پیشنهاد <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="proposal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات پیشنهاد خود را بنویسید... (حداقل ۵۰ کاراکتر)"
              rows={4}
              className={cn(
                'bg-card/50 backdrop-blur-sm resize-none',
                errors.description && 'border-destructive focus-visible:ring-destructive/30',
              )}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.description ? (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" aria-hidden="true" />
                  {errors.description}
                </span>
              ) : (
                <span />
              )}
              <span className={cn(
                'text-xs tabular-nums',
                description.length < 50 ? 'text-muted-foreground/50' : 'text-emerald-600 dark:text-emerald-400',
              )}>
                {description.length}/۵۰
              </span>
            </div>
          </div>

          {/* Budget & Delivery Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="proposal-budget" className="mb-1.5 block text-sm font-medium">
                مبلغ (تومان) <span className="text-destructive">*</span>
              </label>
              <Input
                id="proposal-budget"
                type="number"
                dir="ltr"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="مثلاً 25000000"
                className={cn(
                  'bg-card/50 backdrop-blur-sm text-left',
                  errors.budget && 'border-destructive focus-visible:ring-destructive/30',
                )}
              />
              {errors.budget && (
                <span className="mt-1 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" aria-hidden="true" />
                  {errors.budget}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="proposal-delivery" className="mb-1.5 block text-sm font-medium">
                زمان تحویل (روز) <span className="text-destructive">*</span>
              </label>
              <Input
                id="proposal-delivery"
                type="number"
                dir="ltr"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                placeholder="مثلاً ۳۰"
                className={cn(
                  'bg-card/50 backdrop-blur-sm text-left',
                  errors.delivery && 'border-destructive focus-visible:ring-destructive/30',
                )}
              />
              {errors.delivery && (
                <span className="mt-1 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" aria-hidden="true" />
                  {errors.delivery}
                </span>
              )}
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full gap-2 rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                در حال ارسال...
              </>
            ) : (
              <>
                <Send className="size-4" aria-hidden="true" />
                ارسال پیشنهاد
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Proposal Card ────────────────────────────────────
function ProposalCard({ proposal, onSelect, isOwner }: { proposal: Proposal; onSelect: () => void; isOwner?: boolean }) {
  const fullName = `${proposal.user.firstName} ${proposal.user.lastName}`;
  const initials = `${proposal.user.firstName.charAt(0)}${proposal.user.lastName.charAt(0)}`;
  const avatarBg = getAvatarBg(fullName);

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-emerald-300/60 dark:hover:border-emerald-700/60 hover:shadow-lg hover:shadow-emerald-500/[0.04]">
      <CardContent className="p-5 pb-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`size-11 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-white dark:ring-card shadow-sm ${avatarBg}`} aria-hidden="true">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold">{fullName}</h3>
                {proposal.user.isVerified && (
                  <BadgeCheck className="size-4 fill-emerald-500 text-white" aria-label="تأیید شده" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden="true" />
                {proposal.user.city}
              </div>
            </div>
          </div>
          <span className="text-caption text-muted-foreground whitespace-nowrap">
            {getTimeAgo(proposal.createdAt)}
          </span>
        </div>

        {/* Message */}
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {proposal.message.length > 120 ? proposal.message.slice(0, 120) + '...' : proposal.message}
        </p>

        {/* Stats row */}
        <div className="mb-4 flex items-center gap-4 rounded-xl bg-muted/40 p-3.5 ring-1 ring-border/30">
          <div className="flex items-center gap-1.5">
            <DollarSign className="size-4 text-emerald-500" aria-hidden="true" />
            <span className="text-sm font-semibold">{formatPrice(proposal.price)}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <Timer className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">
              {proposal.deliveryTime} روز
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <StarRating rating={proposal.user.rating} size="xs" showValue />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {proposal.user.projectCount.toLocaleString('fa-IR')} پروژه انجام شده
          </span>
          {isOwner && (
            <Button size="sm" onClick={onSelect} className="rounded-lg gap-1.5" aria-label={`انتخاب پیشنهاد ${fullName}`} title={`انتخاب پیشنهاد ${fullName}`}>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              انتخاب پیشنهاد
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Info Card ────────────────────────────────────────
function InfoCard({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <Card className="border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:border-emerald-200/50 dark:hover:border-emerald-800/50 hover:shadow-md">
      <CardContent className="flex flex-col items-center gap-2.5 p-4 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-900/10" aria-hidden="true">
          <Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-caption text-muted-foreground">{label}</span>
        <span className="text-sm font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────
export function RequestDetail({ slug, id: idProp }: { slug?: string; id?: string } = {}) {
  const params = useParams();
  const pathParams = params?.path as string[] | undefined;
  const pathId = pathParams?.length ? pathParams[pathParams.length - 1] : undefined;

  const { navigateTo, goBack } = useNavigate();
  const fetchRequestDetail = useAppStore((s) => s.fetchRequestDetail);

  const requestId =
    idProp ??
    slug ??
    pathId ??
    (typeof params?.id === 'string' ? params.id : '') ??
  '';

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      setLoadError('شناسه نامعتبر');
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchRequestDetail(requestId).then((r) => {
      if (cancelled) return;
      if (r) {
        setRequest(r);
        setLoadError(null);
      } else {
        setLoadError('نیاز یافت نشد');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, fetchRequestDetail]);

  const proposals = useMemo(() => generateMockProposals(), []);
  const [proposalSort, setProposalSort] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [reportOpen, setReportOpen] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);

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

  const handleProposalSubmitted = () => {
    setShowProposalForm(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !request) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="size-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">{loadError ?? 'نیاز یافت نشد'}</p>
        <Button variant="outline" onClick={goBack}>
          بازگشت
        </Button>
      </div>
    );
  }

  const priorityConfig = getPriorityConfig(request.priority);
  const PriorityIcon = priorityConfig.icon;
  const statusClassName = getStatusConfig(request.status);
  const authorName = `${request.user.firstName} ${request.user.lastName}`;
  const authorInitials = `${request.user.firstName.charAt(0)}${request.user.lastName.charAt(0)}`;
  const authorAvatarBg = getAvatarBg(authorName);

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl" itemScope itemType="https://schema.org/Service">
      <meta itemProp="name" content={request.title} />
      <meta itemProp="description" content={request.description} />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back + Title Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="mb-4 gap-2 text-sm text-muted-foreground"
            data-href="/requests"
            aria-label="بازگشت به فهرست نیازها"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
            بازگشت
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`rounded-lg text-caption font-medium ${statusClassName}`}>
                  {getStatusLabel(request.status)}
                </Badge>
                <Badge variant="outline" className={`rounded-lg text-caption font-medium ${priorityConfig.className}`}>
                  <PriorityIcon className="size-3" aria-hidden="true" />
                  {getPriorityLabel(request.priority)}
                </Badge>
                <Badge variant="secondary" className="rounded-lg text-caption">
                  {request.categoryIcon} {request.categoryName}
                </Badge>
              </div>
              <div className="flex items-start gap-3">
                <h1 className="text-xl font-bold leading-snug sm:text-2xl lg:text-3xl flex-1" itemProp="name">
                  {request.title}
                </h1>
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  <BookmarkButton itemId={request.id} itemType="request" size="sm" />
                  <RequestShare requestTitle={request.title} requestId={request.id} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => setReportOpen(true)}
                    aria-label="گزارش تخلف"
                    title="گزارش تخلف این نیاز"
                  >
                    <Flag className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {getTimeAgo(request.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="size-3.5" aria-hidden="true" />
                  {request.viewCount.toLocaleString('fa-IR')} بازدید
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards Row */}
        <div className="mb-6" itemProp="offers" itemScope itemType="https://schema.org/Offer">
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
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">توضیحات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-8 text-sm text-muted-foreground whitespace-pre-line" itemProp="description">
                    {request.description}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tags */}
            {request.tags.length > 0 && (
              <div>
                <Card className="border-border/50 bg-card">
                  <CardContent className="p-5">
                    <h2 className="mb-3 text-sm font-semibold">تگ‌ها</h2>
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
              </div>
            )}

            {/* Budget type note */}
            <div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3.5 text-sm text-muted-foreground ring-1 ring-border/30">
                <DollarSign className="size-4 text-emerald-500" aria-hidden="true" />
                <span>
                  نوع بودجه:{' '}
                  <span className="font-medium text-foreground">
                    {getBudgetTypeLabel(request.budgetType)}
                  </span>
                </span>
              </div>
            </div>

            {/* Proposals Section */}
            <div>
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">
                      پیشنهادها
                      <Badge variant="secondary" className="mr-2 text-xs">
                        {request.proposalCount.toLocaleString('fa-IR')}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <label htmlFor="proposal-sort" className="text-xs text-muted-foreground">مرتب‌سازی:</label>
                      <select
                        id="proposal-sort"
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
                      isOwner={true}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Proposal Submission Form (inline) */}
            {showProposalForm && (
              <ProposalForm onRequestSubmitted={handleProposalSubmitted} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Author info */}
            <div>
              <Card className="border-border/50 bg-card">
                <CardContent className="p-5">
                  <h2 className="mb-4 text-sm font-semibold">اطلاعات کاربر</h2>
                  <div className="flex items-center gap-3">
                    <div className={`size-14 rounded-full flex items-center justify-center text-base font-bold ring-2 ring-white dark:ring-card shadow-sm ${authorAvatarBg}`} aria-hidden="true">
                      {authorInitials}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">{authorName}</h3>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden="true" />
                        {request.user.city}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" aria-hidden="true" />
                        عضویت از {new Date(request.user.createdAt).toLocaleDateString('fa-IR')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CTA: Submit Proposal */}
            <div>
              <Card className="border-emerald-200/60 bg-gradient-to-b from-emerald-50/80 to-white dark:border-emerald-800/60 dark:from-emerald-950/30 dark:to-card shadow-lg shadow-emerald-500/[0.04]">
                <CardContent className="p-5 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20" aria-hidden="true">
                    <Send className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="mb-2 text-sm font-bold">کسب‌وکار هستید؟</h2>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    پیشنهاد خود را ارسال کنید و شانس خود را برای انجام این پروژه افزایش دهید.
                  </p>
                  <Button
                    onClick={() => setShowProposalForm(true)}
                    className="w-full gap-2 rounded-xl"
                    aria-label="ارسال پیشنهاد برای این نیاز"
                    title="ارسال پیشنهاد برای انجام این پروژه"
                  >
                    <Briefcase className="size-4" aria-hidden="true" />
                    ارسال پیشنهاد
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      <ReportUser
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetName={request.title}
        targetType="request"
      />

      <noscript>
        <div className="sr-only">
          <h1>جزئیات نیاز - نیاز فایندر</h1>
          <p>صفحه جزئیات نیاز شامل عنوان، توضیحات، بودجه، شهر، زمان تحویل، تگ‌ها و پیشنهادهای دریافتی کسب‌وکارها.</p>
        </div>
      </noscript>
    </div>
  );
}
