'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  FileText,
  MessageSquare,
  Star,
  CheckCheck,
  ShieldAlert,
  ArrowLeft,
  Settings,
  Wallet,
  Inbox,
  CheckCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { NEED_BROWSE_ALERT_NOTIFICATION_TYPE } from '@/lib/need-alerts/types';
import type { NeedBrowseAlertNotificationData } from '@/lib/need-alerts/types';
import { NeedBrowseNotificationCard } from '@/components/notifications/NeedBrowseNotificationCard';

// ─── Types ──────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | 'needs';

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
      return Wallet;
    case 'request_accepted':
      return CheckCircle;
    case NEED_BROWSE_ALERT_NOTIFICATION_TYPE:
      return Inbox;
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
    case NEED_BROWSE_ALERT_NOTIFICATION_TYPE:
      return 'text-emerald-600 bg-emerald-500/10';
    case 'warning':
      return 'text-rose-500 bg-rose-500/10';
    case 'system':
    default:
      return 'text-slate-500 bg-slate-500/10';
  }
};

const getNotificationTypeLabel = (type: string) => {
  switch (type) {
    case 'new_proposal': return 'پیشنهاد';
    case 'message': return 'پیام';
    case 'review': return 'نظر';
    case 'payment': return 'پرداخت';
    case 'request_accepted': return 'پروژه';
    case NEED_BROWSE_ALERT_NOTIFICATION_TYPE: return 'نیاز جدید';
    case 'warning': return 'تذکر';
    case 'system': return 'سیستم';
    default: return '';
  }
};

// ─── Persian relative time helper ──────────────────────────────────────────

function persianTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'لحظاتی پیش';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} روز پیش`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ماه پیش`;
  return `${Math.floor(months / 12)} سال پیش`;
}

function parseNeedAlertData(
  notification: Notification
): NeedBrowseAlertNotificationData | null {
  if (notification.type !== NEED_BROWSE_ALERT_NOTIFICATION_TYPE || !notification.data) {
    return null;
  }
  const d = notification.data;
  if (!d.requestId || !d.requestTitle) return null;
  return d as unknown as NeedBrowseAlertNotificationData;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationsPanel() {
  const {
    isAuthenticated,
    setAuthModalOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    unreadNotificationCount,
    markNotificationReadAPI,
    markAllNotificationsReadAPI,
    fetchNotifications,
  } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  useEffect(() => {
    if (isAuthenticated) {
      void fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    if (activeFilter === 'needs') {
      return notifications.filter((n) => n.type === NEED_BROWSE_ALERT_NOTIFICATION_TYPE);
    }
    return notifications;
  }, [activeFilter, notifications]);

  const unreadCount = unreadNotificationCount;

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    void markAllNotificationsReadAPI();
    void fetchNotifications();
  };

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
    void markNotificationReadAPI(id);
  };

  // ─── Auth Guard ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">دسترسی به اعلان‌ها</h3>
            <p className="text-sm text-muted-foreground">
              برای مشاهده اعلان‌های خود، ابتدا وارد حساب کاربری شوید
            </p>
          </div>
          <Button onClick={() => setAuthModalOpen(true)} className="mt-2" data-href="/dashboard" title="ورود به حساب کاربری">
            ورود به حساب کاربری
          </Button>
        </div>
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
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-11 gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              title="خواندن همه اعلان‌ها"
            >
              <CheckCheck className="h-4 w-4" />
              خواندن همه
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b px-5 pt-3" role="tablist" aria-label="فیلتر اعلان‌ها">
        {([
          { key: 'all' as FilterTab, label: 'همه' },
          { key: 'needs' as FilterTab, label: 'نیازهای دنبال‌شده' },
          { key: 'unread' as FilterTab, label: 'خوانده نشده' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            role="tab"
            aria-selected={activeFilter === tab.key}
            className={cn(
              'relative rounded-t-lg px-4 pb-3 pt-1.5 text-sm font-medium transition-all duration-150 min-h-44px flex items-center',
              activeFilter === tab.key
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            )}
          >
            {tab.label}
            {activeFilter === tab.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]" role="tabpanel">
        {filteredNotifications.length > 0 ? (
          <div className="divide-y">
            {filteredNotifications.map((notification) => {
              const IconComponent = getNotificationIcon(notification.type);
              const iconColorClass = getNotificationIconColor(notification.type);
              const typeLabel = getNotificationTypeLabel(notification.type);
              const needData = parseNeedAlertData(notification);

              return (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.isRead) {
                      handleMarkRead(notification.id);
                    }
                  }}
                  className={cn(
                    'cursor-pointer px-5 py-4 transition-all duration-150',
                    !notification.isRead
                      ? 'bg-primary/5 hover:bg-primary/10'
                      : 'hover:bg-muted/50'
                  )}
                  role="listitem"
                  aria-label={`${notification.title}: ${notification.message}${!notification.isRead ? '، خوانده نشده' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-full',
                          iconColorClass
                        )}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      {!notification.isRead && (
                        <span className="absolute -top-0.5 -inset-e-0.5 flex size-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex size-3 rounded-full bg-primary" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold leading-relaxed truncate">
                            {notification.title}
                          </h4>
                          {typeLabel && (
                            <span
                              className={cn(
                                'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
                                iconColorClass
                              )}
                            >
                              {typeLabel}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="mt-1.5 text-caption text-muted-foreground/60">
                          {persianTimeAgo(notification.createdAt)}
                        </p>
                      </div>

                      {needData && <NeedBrowseNotificationCard data={needData} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <BellOff className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">اعلان جدیدی ندارید</h3>
            <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
              {activeFilter === 'unread'
                ? 'تمام اعلان‌های شما را خوانده‌اید'
                : activeFilter === 'needs'
                  ? 'هنوز نیاز جدیدی مطابق جستجوهای دنبال‌شده ثبت نشده'
                  : 'هنوز اعلانی دریافت نکرده‌اید'}
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Footer: View All + Settings */}
      <div className="flex items-center justify-between border-t px-5 py-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          مشاهده همه
          <ArrowLeft className="size-3.5" />
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="size-3.5" />
          تنظیمات
        </button>
      </div>

      <noscript>
        <div className="sr-only">
          <h1>اعلان‌ها - نیاز فایندر</h1>
          <p>بخش اعلان‌ها شامل اعلان‌های پیشنهاد جدید، پیام، نظر، پرداخت، پروژه و سیستم پلتفرم نیاز فایندر.</p>
        </div>
      </noscript>
    </div>
  );
}
