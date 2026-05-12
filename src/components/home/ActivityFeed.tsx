'use client';

import { motion } from 'framer-motion';
import {
  Send,
  Award,
  PlusCircle,
  CheckCircle,
  Star,
  BadgeCheck,
  FileText,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: number;
  icon: LucideIcon;
  person: string;
  action: string;
  actionEnd: string;
  target?: string;
  timestamp: string;
  accentColor: string;
  iconBg: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const ACTIVITIES: ActivityItem[] = [
  {
    id: 1,
    icon: Send,
    person: 'علی محمدی',
    action: 'پیشنهادی برای',
    target: 'طراحی سایت فروشگاهی',
    actionEnd: 'ارسال کرد',
    timestamp: '۵ دقیقه پیش',
    accentColor: 'bg-sky-500',
    iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400',
  },
  {
    id: 2,
    icon: Award,
    person: 'سارا احمدی',
    action: 'به',
    target: 'متخصص برتر',
    actionEnd: 'ارتقا یافت',
    timestamp: '۱۵ دقیقه پیش',
    accentColor: 'bg-amber-500',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  },
  {
    id: 3,
    icon: PlusCircle,
    person: 'محمد حسینی',
    action: 'نیاز جدید',
    target: 'تعمیر لپ‌تاپ',
    actionEnd: 'ثبت کرد',
    timestamp: '۲۳ دقیقه پیش',
    accentColor: 'bg-emerald-500',
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  },
  {
    id: 4,
    icon: CheckCircle,
    person: 'فاطمه رضایی',
    action: 'پروژه',
    target: 'اپلیکیشن موبایل',
    actionEnd: 'را تکمیل کرد',
    timestamp: '۱ ساعت پیش',
    accentColor: 'bg-violet-500',
    iconBg: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
  },
  {
    id: 5,
    icon: Star,
    person: 'رضا کریمی',
    action: 'امتیاز',
    target: '۵ ستاره‌ای',
    actionEnd: 'دریافت کرد',
    timestamp: '۲ ساعت پیش',
    accentColor: 'bg-yellow-500',
    iconBg: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
  },
  {
    id: 6,
    icon: BadgeCheck,
    person: 'حسن نجفی',
    action: 'به عنوان متخصص',
    target: undefined,
    actionEnd: 'تایید شد',
    timestamp: '۳ ساعت پیش',
    accentColor: 'bg-teal-500',
    iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400',
  },
  {
    id: 7,
    icon: FileText,
    person: 'مینا حسینی',
    action: 'مقاله جدید',
    target: '۱۰ نکته سئو',
    actionEnd: 'منتشر کرد',
    timestamp: '۵ ساعت پیش',
    accentColor: 'bg-rose-500',
    iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
  },
  {
    id: 8,
    icon: Wallet,
    person: 'پویا فرهادی',
    action: 'واریز',
    target: '۲,۰۰۰,۰۰۰ تومان',
    actionEnd: 'به کیف پول انجام داد',
    timestamp: '۶ ساعت پیش',
    accentColor: 'bg-orange-500',
    iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  },
];

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ActivityRow({
  activity,
  isLast,
}: {
  activity: ActivityItem;
  isLast: boolean;
}) {
  const Icon = activity.icon;

  return (
    <motion.div variants={itemVariants} className="relative flex gap-4">
      {/* Right side — timeline connector (RTL) */}
      <div className="relative flex flex-col items-center">
        {/* Accent dot */}
        <div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full">
          <div className={`absolute inset-0 rounded-full opacity-20 ${activity.accentColor}`} />
          <div className={`flex size-9 items-center justify-center rounded-xl ${activity.iconBg}`}>
            <Icon className="size-4" />
          </div>
        </div>
        {/* Vertical connector line */}
        {!isLast && (
          <div className="absolute top-9 bottom-0 w-px bg-border/60" />
        )}
      </div>

      {/* Left side — content */}
      <div className="min-w-0 flex-1 pb-6">
        <p className="text-sm leading-relaxed">
          <span className="font-bold">{activity.person}</span>{' '}
          <span className="text-muted-foreground">
            {activity.action}
            {activity.target && (
              <span className="font-medium text-foreground/80"> «{activity.target}»</span>
            )}{' '}
            {activity.actionEnd}
          </span>
        </p>
        <time className="mt-1 block text-xs text-muted-foreground/70">
          {activity.timestamp}
        </time>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ActivityFeed() {
  return (
    <section className="relative bg-muted/30 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-border/60 bg-card">
          <CardHeader className="border-b border-border/40 bg-muted/30 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold sm:text-xl">
                فعالیت‌های اخیر
              </CardTitle>
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  زنده
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              className="mr-1"
            >
              {ACTIVITIES.map((activity, idx) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  isLast={idx === ACTIVITIES.length - 1}
                />
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
