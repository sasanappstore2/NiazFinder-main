'use client';

import { motion } from 'framer-motion';
import { MapPin, Clock, DollarSign, FileText, ArrowLeft, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import {
  MOCK_REQUESTS,
  formatBudgetRange,
  getTimeAgo,
  getPriorityLabel,
} from '@/lib/constants';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
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

export function FeaturedRequests() {
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
            آخرین نیازها
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            جدیدترین نیازهای ثبت شده توسط کاربران
          </p>
        </motion.div>

        {/* Requests Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {MOCK_REQUESTS.map((request) => (
            <motion.div key={request.id} variants={item}>
              <Card
                onClick={() => navigateTo('request-detail', { id: request.id })}
                className="group cursor-pointer border-border/60 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <CardContent className="p-5">
                  {/* Top Row: Category + Priority */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{request.categoryIcon}</span>
                      <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                        {request.categoryName}
                      </span>
                    </div>
                    <PriorityBadge priority={request.priority} />
                  </div>

                  {/* Title */}
                  <h3 className="mb-3 text-sm font-bold leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
                    {request.title}
                  </h3>

                  {/* Meta Grid */}
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <DollarSign className="size-3.5 shrink-0 text-emerald-500" />
                      <span className="truncate">{formatBudgetRange(request.budgetMin, request.budgetMax)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      <span>{request.city}</span>
                    </div>
                  </div>

                  {/* Bottom Row: Proposals + Time */}
                  <div className="flex items-center justify-between border-t border-border/50 pt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="size-3.5" />
                      <span>
                        {request.proposalCount.toLocaleString('fa-IR')} پیشنهاد
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {getTimeAgo(request.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
