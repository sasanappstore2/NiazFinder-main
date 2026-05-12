'use client';

import { motion } from 'framer-motion';
import { MapPin, Clock, DollarSign, FileText, ArrowLeft, Flame, Zap, Loader2, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import {
  MOCK_REQUESTS,
  formatBudgetRange,
  getTimeAgo,
  getPriorityLabel,
} from '@/lib/constants';
import type { ServiceRequest } from '@/lib/types';
import { BookmarkButton } from '@/components/shared/BookmarkButton';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

const priorityAccentColors: Record<string, string> = {
  URGENT: 'bg-destructive',
  HIGH: 'bg-amber-500',
  NORMAL: 'bg-primary/40',
  LOW: 'bg-muted-foreground/30',
};

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string; icon: typeof Flame }> = {
    URGENT: {
      className: 'bg-destructive/10 text-destructive border-destructive/20',
      icon: Flame,
    },
    HIGH: {
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      icon: Flame,
    },
    NORMAL: {
      className: 'bg-muted text-muted-foreground border-border',
      icon: Clock,
    },
    LOW: {
      className: 'bg-muted text-muted-foreground border-border',
      icon: Clock,
    },
  };

  const c = config[priority] || config.NORMAL;
  const Icon = c.icon;

  return (
    <Badge variant="outline" className={`rounded-lg text-[11px] font-medium ${c.className}`}>
      <Icon className="size-3" />
      {getPriorityLabel(priority)}
    </Badge>
  );
}

function UrgentBanner() {
  return (
    <div className="animate-urgent-flash flex items-center gap-1.5 rounded-lg bg-destructive/5 px-2.5 py-1.5">
      <Zap className="size-3.5 fill-destructive text-destructive" />
      <span className="text-[11px] font-bold text-destructive">عجله دارید؟</span>
    </div>
  );
}

function RequestCard({ request }: { request: ServiceRequest }) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const accentColor = priorityAccentColors[request.priority] || 'bg-primary/40';
  const isUrgent = request.priority === 'URGENT';

  return (
    <Card
      onClick={() => navigateTo('request-detail', { id: request.id })}
      className="group cursor-pointer overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/8 hover:border-emerald-200/80 dark:hover:border-emerald-800/60"
    >
      <div className="flex h-full">
        {/* Left colored accent bar */}
        <div className={`w-[3px] shrink-0 ${accentColor}`} />

        <CardContent className="flex-1 p-5">
          {/* Top Row: Category + Priority + Bookmark */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{request.categoryIcon}</span>
              <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                {request.categoryName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <BookmarkButton id={request.id} type="request" size="sm" />
              <PriorityBadge priority={request.priority} />
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-3 text-sm font-bold leading-snug line-clamp-2 transition-colors duration-300 group-hover:text-emerald-600">
            {request.title}
          </h3>

          {/* Urgent Banner */}
          {isUrgent && <div className="mb-3"><UrgentBanner /></div>}

          {/* Meta Grid */}
          <div className="mb-4 space-y-2.5">
            <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/[0.06] px-2.5 py-1.5">
              <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 shadow-sm shadow-emerald-500/5">
                <DollarSign className="size-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-foreground truncate">
                {formatBudgetRange(request.budgetMin, request.budgetMax)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span>{request.city}</span>
            </div>
          </div>

          {/* Bottom Row: Proposals + Time + User */}
          <div className="flex items-center justify-between border-t border-border/40 pt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="size-3.5" />
              <span>
                {request.proposalCount.toLocaleString('fa-IR')} پیشنهاد
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {getTimeAgo(request.createdAt)}
              </span>
              <div className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary">
                {request.user.firstName.charAt(0)}{request.user.lastName.charAt(0)}
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function FeaturedRequests() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const isLoading = false;

  return (
    <section className="relative bg-background py-20 sm:py-24 lg:py-28">
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
            آخرین نیازها
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground/80">
            جدیدترین نیازهای ثبت شده توسط کاربران
          </p>
        </motion.div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">در حال بارگذاری نیازها...</p>
          </div>
        ) : MOCK_REQUESTS.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-16">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Inbox className="size-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="mb-1 text-sm font-semibold">هنوز نیازی ثبت نشده</p>
              <p className="text-xs text-muted-foreground">اولین نفری باشید که نیاز خود را ثبت می‌کنید!</p>
            </div>
            <Button
              onClick={() => navigateTo('post-need')}
              className="mt-2 rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              ثبت نیاز جدید
            </Button>
          </div>
        ) : (
          /* Requests Grid */
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {MOCK_REQUESTS.map((request) => (
              <motion.div key={request.id} variants={item}>
                <RequestCard request={request} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* View All Button */}
        {!isLoading && MOCK_REQUESTS.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-10 flex justify-center"
          >
            <Button
              onClick={() => navigateTo('browse-requests')}
              variant="outline"
              className="h-11 rounded-xl border-border/60 bg-card/50 backdrop-blur-sm px-8 transition-all duration-300 hover:shadow-lg hover:bg-card"
            >
              مشاهده همه نیازها
              <ArrowLeft className="size-4" />
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
