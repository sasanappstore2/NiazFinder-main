'use client';

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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface ActivityItem {
  id: number;
  icon: LucideIcon;
  person: string;
  action: string;
  actionEnd: string;
  target?: string;
  timestamp: string;
  iconBg: string;
}

const ACTIVITIES: ActivityItem[] = [
  { id: 1, icon: Send, person: 'علی محمدی', action: 'پیشنهادی برای', target: 'طراحی سایت فروشگاهی', actionEnd: 'ارسال کرد', timestamp: '۵ دقیقه پیش', iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' },
  { id: 2, icon: Award, person: 'سارا احمدی', action: 'به', target: 'کسب‌وکار برتر', actionEnd: 'ارتقا یافت', timestamp: '۱۵ دقیقه پیش', iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' },
  { id: 3, icon: PlusCircle, person: 'محمد حسینی', action: 'نیاز جدید', target: 'تعمیر لپ‌تاپ', actionEnd: 'ثبت کرد', timestamp: '۲۳ دقیقه پیش', iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { id: 4, icon: CheckCircle, person: 'فاطمه رضایی', action: 'پروژه', target: 'اپلیکیشن موبایل', actionEnd: 'را تکمیل کرد', timestamp: '۱ ساعت پیش', iconBg: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400' },
  { id: 5, icon: Star, person: 'رضا کریمی', action: 'امتیاز', target: '۵ ستاره‌ای', actionEnd: 'دریافت کرد', timestamp: '۲ ساعت پیش', iconBg: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400' },
  { id: 6, icon: BadgeCheck, person: 'حسن نجفی', action: 'به عنوان کسب‌وکار', actionEnd: 'تایید شد', timestamp: '۳ ساعت پیش', iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400' },
  { id: 7, icon: FileText, person: 'مینا حسینی', action: 'مقاله جدید', target: '۱۰ نکته سئو', actionEnd: 'منتشر کرد', timestamp: '۵ ساعت پیش', iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' },
  { id: 8, icon: Wallet, person: 'پویا فرهادی', action: 'واریز', target: '۲,۰۰۰,۰۰۰ تومان', actionEnd: 'به کیف پول انجام داد', timestamp: '۶ ساعت پیش', iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' },
];

function ActivityRow({ activity, isLast }: { activity: ActivityItem; isLast: boolean }) {
  const Icon = activity.icon;
  return (
    <div className="relative flex gap-4" itemScope itemType="https://schema.org/Event">
      {/* Timeline */}
      <div className="relative flex flex-col items-center">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${activity.iconBg}`} aria-hidden="true">
          <Icon className="size-4" />
        </div>
        {!isLast && <div className="absolute top-9 bottom-0 w-px bg-border/60" aria-hidden="true" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-6">
        <p className="text-sm leading-relaxed" itemProp="description">
          <span className="font-bold" itemProp="actor">{activity.person}</span>{' '}
          <span className="text-muted-foreground">
            {activity.action}
            {activity.target && <span className="font-medium text-foreground/80"> «{activity.target}»</span>}{' '}
            {activity.actionEnd}
          </span>
        </p>
        <time className="mt-1 block text-xs text-muted-foreground" itemProp="startDate">{activity.timestamp}</time>
      </div>
    </div>
  );
}

export function ActivityFeed() {
  return (
    <section id="activity" className="section-padding bg-muted/30" aria-label="فعالیت‌های اخیر">
      <div className="container-default mx-auto px-5 md:px-8">
        <Card className="overflow-hidden border-border/60 bg-card">
          <CardHeader className="border-b border-border/40 bg-muted/30 px-6 py-5 sm:px-8">
            <h3 className="text-lg font-bold sm:text-xl">فعالیت‌های اخیر</h3>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            {ACTIVITIES.map((activity, idx) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                isLast={idx === ACTIVITIES.length - 1}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <noscript>
        <div className="sr-only">
          <h3>فعالیت‌های اخیر</h3>
          <p>آخرین فعالیت‌های کاربران در نیاز فایندر شامل ارسال پیشنهاد، ارتقا به کسب‌وکار برتر، ثبت نیاز جدید، تکمیل پروژه، دریافت امتیاز و تایید کسب‌وکار.</p>
        </div>
      </noscript>
    </section>
  );
}
