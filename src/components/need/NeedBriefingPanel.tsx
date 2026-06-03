'use client';

import { useState } from 'react';
import {
  ArrowRight,
  MapPin,
  Clock,
  DollarSign,
  FileText,
  Flame,
  Send,
  Flag,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { RequestShare } from '@/components/shared/RequestShare';
import { ContactActions } from '@/components/contact/ContactActions';
import { routeBuilder } from '@/config/routes';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  formatBudgetRange,
  getPriorityLabel,
  getStatusLabel,
  getTimeAgo,
} from '@/lib/constants';
import type { ServiceRequest } from '@/lib/types';

function getPriorityConfig(priority: string) {
  const configs: Record<string, { className: string; icon: typeof Flame }> = {
    URGENT: { className: 'bg-destructive/10 text-destructive border-destructive/20', icon: Flame },
    HIGH: {
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      icon: Flame,
    },
    NORMAL: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
    LOW: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
  };
  return configs[priority] || configs.NORMAL;
}

function registrantInitials(user: ServiceRequest['user']): string {
  const f = user.firstName?.trim();
  const l = user.lastName?.trim();
  if (f?.[0] && l?.[0]) return `${f[0]}${l[0]}`;
  const full = `${f ?? ''} ${l ?? ''}`.trim();
  if (full.length >= 2) return full.slice(0, 2);
  if (full.length === 1) return full;
  return '؟';
}

function getStatusConfig(status: string) {
  const configs: Record<string, string> = {
    OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
    CLOSED: 'bg-gray-50 text-gray-600 border-gray-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  };
  return configs[status] || 'bg-muted text-muted-foreground border-border';
}

interface NeedBriefingPanelProps {
  request: ServiceRequest;
  briefSummary?: string;
  isOwner: boolean;
  isBusinessUser: boolean;
  onBack: () => void;
  onReport: () => void;
}

function MetricChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 px-2 py-2 text-center max-[380px]:px-1.5 max-[380px]:py-1.5 sm:px-3 sm:py-2.5">
      <Icon className="mx-auto mb-1 size-4 text-primary" aria-hidden />
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="text-label font-semibold tabular-nums truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

function NeedContactAside({
  request,
  authorName,
  isOwner,
  isBusinessUser,
  compact = false,
  className,
}: {
  request: ServiceRequest;
  authorName: string;
  isOwner: boolean;
  isBusinessUser: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'flex min-h-0 flex-col',
        !compact && 'lg:sticky lg:top-[calc(var(--site-header-offset,6.5rem)+1rem)] lg:self-start',
        className
      )}
      aria-label="ثبت‌کننده و تماس"
    >
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm',
          compact ? 'flex-none' : 'lg:min-h-[min(440px,calc(100dvh-11rem))] lg:flex-1'
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,oklch(var(--primary)/0.08)_0%,transparent_42%)]"
          aria-hidden
        />
        <div className="relative flex flex-col">
          <div
            className={cn(
              'flex flex-none items-start justify-between gap-2',
              compact ? 'px-3 pt-3' : 'px-4 pt-4 sm:px-5 sm:pt-5'
            )}
          >
            <span className="text-overline font-semibold tracking-wide text-primary">
              ثبت‌کننده نیاز
            </span>
            <Badge
              variant="outline"
              className="shrink-0 border-primary/25 bg-background/80 text-caption font-medium text-muted-foreground backdrop-blur-xs"
            >
              {isOwner ? 'صاحب آگهی' : 'ارتباط مستقیم'}
            </Badge>
          </div>

          <div className={cn('flex-none pb-1 pt-2', compact ? 'px-3' : 'px-4 pt-3 sm:px-5')}>
            <div
              className={cn(
                'flex gap-3 rounded-xl border border-border/50 bg-gradient-to-br from-muted/40 to-muted/15 shadow-inner',
                compact ? 'p-3' : 'gap-4 p-3.5 sm:p-4'
              )}
            >
              <Avatar
                className={cn(
                  'shrink-0 rounded-2xl border border-border/50 shadow-sm ring-2 ring-background',
                  compact ? 'size-11' : 'size-14'
                )}
              >
                <AvatarImage
                  src={request.user.avatar ?? undefined}
                  alt={authorName.trim() || 'ثبت‌کننده'}
                />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                  {registrantInitials(request.user)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex flex-1 flex-col justify-center gap-0.5">
                <p className="text-base font-semibold leading-tight tracking-tight text-foreground truncate">
                  {authorName.trim() || 'کاربر نیاز‌فایندر'}
                </p>
                {request.user.city ? (
                  <p className="text-caption text-muted-foreground flex items-center gap-1.5 truncate">
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-background/90 text-primary">
                      <MapPin className="size-3" aria-hidden />
                    </span>
                    {request.user.city}
                  </p>
                ) : (
                  <p className="text-caption text-muted-foreground">شهر ثبت نشده</p>
                )}
              </div>
            </div>
          </div>

          {!isOwner && (
            <>
              <Separator className={cn('mx-3 flex-none bg-border/60', !compact && 'sm:mx-5')} />

              <div
                className={cn(
                  'flex flex-none flex-col gap-3',
                  compact ? 'px-3 py-3' : 'gap-4 px-4 py-4 sm:px-5 sm:pb-5'
                )}
              >
                <p
                  className={cn(
                    'leading-relaxed text-muted-foreground [&>strong]:font-semibold [&>strong]:text-foreground',
                    compact ? 'text-caption' : 'text-body-sm'
                  )}
                >
                  {isBusinessUser ? (
                    <>
                      اگر این نیاز با شما هم‌خوان است،{' '}
                      <strong>با پیام اول هماهنگ شوید</strong>؛ سپس می‌توانید پیشنهاد رسمی هم
                      ارسال کنید.
                    </>
                  ) : compact ? (
                    <>برای هماهنگی از <strong>نوار پایین</strong> پیام دهید یا تماس بگیرید.</>
                  ) : (
                    <>
                      برای پرسیدن جزئیات یا هماهنگی،{' '}
                      <strong>پیام دهید یا تماس بگیرید</strong>.
                    </>
                  )}
                </p>

                {!compact && (
                  <ContactActions
                    otherUserId={request.user.id}
                    requestId={request.id}
                    displayName={authorName.trim() || undefined}
                    needPreview={{
                      title: request.title,
                      categoryName: request.categoryName,
                      city: request.city,
                    }}
                    chatLabel="پیام و گفتگو"
                    variant="stacked"
                    showProfile={false}
                  />
                )}

                {isBusinessUser && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-dashed bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted/35 hover:text-foreground"
                    size="sm"
                    asChild
                  >
                    <Link href={routeBuilder.needPropose(request.id)}>
                      ارسال پیشنهاد رسمی (قیمت و زمان)
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}

          {isOwner && (
            <>
              <Separator className={cn('mx-3 flex-none bg-border/60', !compact && 'sm:mx-5')} />
              <div className={cn('flex-none pt-3', compact ? 'px-3 pb-3' : 'px-4 pb-5 pt-4 sm:px-5')}>
                <div className="rounded-xl border border-border/60 bg-muted/25 px-3.5 py-3 text-body-sm leading-relaxed text-muted-foreground">
                  شما صاحب این نیاز هستید. پیشنهادهای دریافتی را{' '}
                  <span className="font-medium text-foreground">در بخش پایین همین صفحه</span>{' '}
                  ببینید.
                </div>
              </div>
            </>
          )}

          {!compact && isOwner && (
            <div className="mt-auto flex flex-none flex-col gap-2 border-t border-border/55 bg-muted/25 px-4 py-3 sm:px-5">
              <p className="flex items-start gap-2 text-caption leading-relaxed text-muted-foreground">
                <Send className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
                برای دیدن کسب‌وکارهای مرتبط به پایین صفحه بروید.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export function NeedBriefingPanel({
  request,
  briefSummary,
  isOwner,
  isBusinessUser,
  onBack,
  onReport,
}: NeedBriefingPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const priorityConfig = getPriorityConfig(request.priority);
  const PriorityIcon = priorityConfig.icon;
  const authorName = `${request.user.firstName} ${request.user.lastName}`;
  const budgetValue = formatBudgetRange(request.budgetMin, request.budgetMax);

  return (
    <section
      className="flex flex-col rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-6 lg:min-h-[calc(100dvh-8rem)] lg:max-h-[720px] lg:flex lg:flex-col"
      aria-label="خلاصه نیاز"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-3 w-fit gap-2 self-start text-muted-foreground"
      >
        <ArrowRight className="size-4" />
        بازگشت
      </Button>

      <div className="flex flex-col gap-4 lg:grid lg:flex-1 lg:min-h-0 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-6">
        {/* Header block — mobile order 1, desktop top-left */}
        <div className="order-1 min-w-0 lg:col-span-8 lg:row-start-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`text-caption ${getStatusConfig(request.status)}`}>
              {getStatusLabel(request.status)}
            </Badge>
            <Badge variant="outline" className={`text-caption ${priorityConfig.className}`}>
              <PriorityIcon className="size-3" />
              {getPriorityLabel(request.priority)}
            </Badge>
            <Badge variant="secondary" className="text-caption">
              {request.categoryIcon} {request.categoryName}
            </Badge>
          </div>

          <div className="mb-3 flex items-start gap-2">
            <h1 className="text-h2 min-w-0 flex-1 leading-snug">{request.title}</h1>
            <div className="flex shrink-0 gap-1">
              <BookmarkButton itemId={request.id} itemType="request" size="sm" />
              <RequestShare requestTitle={request.title} requestId={request.id} />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={onReport}
                aria-label="گزارش"
              >
                <Flag className="size-4" />
              </Button>
            </div>
          </div>

          <p className="text-caption text-muted-foreground mb-3 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {getTimeAgo(request.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" />
              {request.viewCount.toLocaleString('fa-IR')} بازدید
            </span>
          </p>

          <div className="mb-0 grid grid-cols-2 gap-1.5 max-[380px]:gap-1.5 sm:grid-cols-4 sm:gap-2">
            <MetricChip icon={DollarSign} label="بودجه" value={budgetValue} />
            <MetricChip icon={MapPin} label="شهر" value={request.city || 'نامشخص'} />
            <MetricChip
              icon={Clock}
              label="تحویل"
              value={request.deliveryTime ? `${request.deliveryTime} روز` : 'نامشخص'}
            />
            <MetricChip
              icon={FileText}
              label="پیشنهادها"
              value={request.proposalCount.toLocaleString('fa-IR')}
            />
          </div>
        </div>

        {/* Contact — mobile order 2, desktop right column spanning both rows */}
        <NeedContactAside
          request={request}
          authorName={authorName}
          isOwner={isOwner}
          isBusinessUser={isBusinessUser}
          compact
          className="order-2 lg:hidden"
        />
        <NeedContactAside
          request={request}
          authorName={authorName}
          isOwner={isOwner}
          isBusinessUser={isBusinessUser}
          className="order-none hidden lg:col-span-4 lg:row-span-2 lg:row-start-1 lg:flex lg:border-r lg:border-border/60 lg:pr-6"
        />

        {/* Description — mobile order 3, desktop bottom-left */}
        <div className="order-3 min-h-0 lg:col-span-8 lg:row-start-2 lg:flex lg:flex-col">
          {briefSummary && (
            <div className="mb-3 flex gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
              <Sparkles className="size-4 shrink-0 text-primary mt-0.5" />
              <p className="text-body-sm text-foreground/90">{briefSummary}</p>
            </div>
          )}

          <div className="min-h-0 lg:flex-1">
            <p
              className={cn(
                'text-body-sm text-muted-foreground whitespace-pre-line leading-relaxed',
                !expanded && 'line-clamp-3 lg:line-clamp-none'
              )}
            >
              {request.description}
            </p>
            {request.description.length > 120 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-8 gap-1 px-0 text-primary lg:hidden"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-4" />
                    کمتر
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-4" />
                    نمایش کامل
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
