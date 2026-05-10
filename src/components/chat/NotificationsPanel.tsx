'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  FileText,
  MessageSquare,
  Star,
  CreditCard,
  CheckCircle,
  CheckCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type NotificationType = 'new_proposal' | 'message' | 'review' | 'system' | 'payment' | 'request_accepted';

type FilterTab = 'all' | 'unread';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_proposal':
      return FileText;
    case 'message':
      return MessageSquare;
    case 'review':
      return Star;
    case 'payment':
      return CreditCard;
    case 'request_accepted':
      return CheckCircle;
    case 'system':
    default:
      return type === 'warning' ? ShieldAlert : Bell;
  }
};

const getNotificationIconColor = (type: string) => {
  switch (type) {
    case 'new_proposal':
      return 'text-blue-500 bg-blue-500/10';
    case 'message':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'review':
      return 'text-amber-500 bg-amber-500/10';
    case 'payment':
      return 'text-violet-500 bg-violet-500/10';
    case 'request_accepted':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'warning':
      return 'text-rose-500 bg-rose-500/10';
    case 'system':
    default:
      return 'text-slate-500 bg-slate-500/10';
  }
};

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'new_proposal',
    title: 'پیشنهاد جدید',
    message: 'علی محمدی پیشنهادی برای پروژه شما ارسال کرد',
    isRead: false,
    createdAt: '۵ دقیقه پیش',
  },
  {
    id: 'notif-2',
    type: 'message',
    title: 'پیام جدید',
    message: 'سارا احمدی پیامی برای شما ارسال کرد',
    isRead: false,
    createdAt: '۱۵ دقیقه پیش',
  },
  {
    id: 'notif-3',
    type: 'review',
    title: 'نظر جدید',
    message: 'رضا کریمی به پروژه شما امتیاز ۵ داد',
    isRead: true,
    createdAt: '۱ ساعت پیش',
  },
  {
    id: 'notif-4',
    type: 'payment',
    title: 'پرداخت موفق',
    message: 'پرداخت ۵,۰۰۰,۰۰۰ تومان با موفقیت انجام شد',
    isRead: false,
    createdAt: '۲ ساعت پیش',
  },
  {
    id: 'notif-5',
    type: 'request_accepted',
    title: 'پروژه پذیرفته شد',
    message: 'پیشنهاد شما برای پروژه طراحی سایت پذیرفته شد',
    isRead: true,
    createdAt: '۳ ساعت پیش',
  },
  {
    id: 'notif-6',
    type: 'system',
    title: 'سیستم',
    message: 'خوش آمدید! حساب شما با موفقیت ایجاد شد',
    isRead: true,
    createdAt: '۱ روز پیش',
  },
  {
    id: 'notif-7',
    type: 'new_proposal',
    title: 'پیشنهاد جدید',
    message: 'مینا حسینی پیشنهادی برای پروژه شما ارسال کرد',
    isRead: false,
    createdAt: '۱ روز پیش',
  },
  {
    id: 'notif-8',
    type: 'message',
    title: 'پیام جدید',
    message: 'حسن نجفی پیامی برای شما ارسال کرد',
    isRead: false,
    createdAt: '۲ روز پیش',
  },
  {
    id: 'notif-9',
    type: 'warning',
    title: 'تذکر',
    message: 'لطفاً پروفایل خود را تکمیل کنید',
    isRead: false,
    createdAt: '۳ روز پیش',
  },
  {
    id: 'notif-10',
    type: 'payment',
    title: 'پرداخت',
    message: 'تسویه حساب ۲,۰۰۰,۰۰۰ تومان انجام شد',
    isRead: true,
    createdAt: '۱ هفته پیش',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationsPanel() {
  const { isAuthenticated, setAuthModalOpen, markNotificationRead, markAllNotificationsRead } =
    useAppStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const notifications = mockNotifications;

  const filteredNotifications =
    activeFilter === 'all'
      ? notifications
      : notifications.filter((n) => !n.isRead);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ─── Auth Guard ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">دسترسی به اعلان‌ها</h3>
            <p className="text-sm text-muted-foreground">
              برای مشاهده اعلان‌های خود، ابتدا وارد حساب کاربری شوید
            </p>
          </div>
          <Button onClick={() => setAuthModalOpen(true)} className="mt-2">
            ورود به حساب کاربری
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col rounded-xl border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">اعلان‌ها</h2>
          {unreadCount > 0 && (
            <Badge className="rounded-full px-2 text-xs">{unreadCount} جدید</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllNotificationsRead}
            className="gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <CheckCheck className="h-4 w-4" />
            خواندن همه
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b px-5 pt-3">
        {([
          { key: 'all' as FilterTab, label: 'همه' },
          { key: 'unread' as FilterTab, label: 'خوانده نشده' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              'relative rounded-t-lg px-4 pb-3 pt-1.5 text-sm font-medium transition-colors',
              activeFilter === tab.key
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
          >
            {tab.label}
            {activeFilter === tab.key && (
              <motion.div
                layoutId="notification-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y">
              {filteredNotifications.map((notification, index) => {
                const IconComponent = getNotificationIcon(notification.type);
                const iconColorClass = getNotificationIconColor(notification.type);

                return (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 50, transition: { duration: 0.15 } }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                    onClick={() => {
                      if (!notification.isRead) {
                        markNotificationRead(notification.id);
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors',
                      !notification.isRead
                        ? 'bg-primary/5 hover:bg-primary/10'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        iconColorClass
                      )}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold leading-relaxed">
                          {notification.title}
                        </h4>
                        <span className="shrink-0 text-[11px] text-muted-foreground leading-relaxed">
                          {notification.createdAt}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.isRead && (
                      <span className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <BellOff className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">اعلان جدیدی ندارید</h3>
              <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
                {activeFilter === 'unread'
                  ? 'تمام اعلان‌های شما را خوانده‌اید'
                  : 'هنوز اعلانی دریافت نکرده‌اید'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
