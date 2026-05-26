'use client';

import { useState } from 'react';
import {
  ArrowRight,
  MapPin,
  Clock,
  DollarSign,
  FileText,
  Flame,
  Briefcase,
  Send,
  Flag,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { RequestShare } from '@/components/shared/RequestShare';
import { ProposalSubmitSheet } from '@/components/need/ProposalSubmitSheet';
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
    <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-center">
      <Icon className="mx-auto mb-1 size-4 text-primary" aria-hidden />
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="text-label font-semibold tabular-nums">{value}</p>
    </div>
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

  return (
    <section
      className="flex min-h-[calc(100dvh-8rem)] max-h-[720px] flex-col rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-6"
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

      <div className="grid flex-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8 flex flex-col min-h-0">
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
            <h1 className="text-h2 flex-1 leading-snug">{request.title}</h1>
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

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricChip
              icon={DollarSign}
              label="بودجه"
              value={formatBudgetRange(request.budgetMin, request.budgetMax)}
            />
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

          {briefSummary && (
            <div className="mb-3 flex gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
              <Sparkles className="size-4 shrink-0 text-primary mt-0.5" />
              <p className="text-body-sm text-foreground/90">{briefSummary}</p>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <p
              className={cn(
                'text-body-sm text-muted-foreground whitespace-pre-line leading-relaxed',
                !expanded && 'line-clamp-3'
              )}
            >
              {request.description}
            </p>
            {request.description.length > 120 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-8 gap-1 px-0 text-primary"
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

          <p className="mt-4 text-caption text-muted-foreground lg:hidden">
            برای دیدن کسب‌وکارهای پیشنهادی به پایین اسکرول کنید
          </p>
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-4 lg:border-r lg:border-border/50 lg:pr-6">
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <p className="text-caption text-muted-foreground mb-2">ثبت‌کننده نیاز</p>
            <p className="text-body font-semibold">{authorName}</p>
            {request.user.city && (
              <p className="text-caption text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="size-3" />
                {request.user.city}
              </p>
            )}
          </div>

          {!isOwner && (
            <Sheet>
              {isBusinessUser && (
                <p className="text-caption text-muted-foreground mb-2 text-center">
                  این نیاز را بررسی کنید و پیشنهاد خود را بفرستید
                </p>
              )}
              <SheetTrigger asChild>
                <Button className="w-full h-11 gap-2 rounded-xl" size="lg">
                  <Briefcase className="size-4" />
                  ارسال پیشنهاد
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>ارسال پیشنهاد برای این نیاز</SheetTitle>
                </SheetHeader>
                <ProposalSubmitSheet requestId={request.id} requestTitle={request.title} />
              </SheetContent>
            </Sheet>
          )}

          {isOwner && (
            <p className="text-body-sm text-muted-foreground text-center">
              شما صاحب این نیاز هستید. پیشنهادهای دریافتی را در بخش پایین ببینید.
            </p>
          )}

          <div className="hidden lg:flex mt-auto items-center gap-2 text-caption text-muted-foreground">
            <Send className="size-3.5" />
            کسب‌وکارهای مرتبط در ادامه صفحه
          </div>
        </aside>
      </div>
    </section>
  );
}
