'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ClipboardList, Users, MessageCircle, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { routeBuilder, legacyViewToPath, isBusinessProductDetailPath } from '@/config/routes';
import { useBrowseUrl } from '@/hooks/use-browse-url';
import type { AppView } from '@/lib/types';

interface TabItem {
  label: string;
  shortLabel: string;
  title: string;
  icon: typeof ClipboardList;
  view: AppView;
}

const TABS: TabItem[] = [
  {
    label: 'نیازها',
    shortLabel: 'نیازها',
    title: 'مرور و جستجوی نیازها',
    icon: ClipboardList,
    view: 'browse-requests',
  },
  { label: 'کسب‌وکارها', shortLabel: 'کسب‌وکار', title: 'مرور و جستجوی کسب‌وکارها', icon: Users, view: 'browse-specialists' },
  { label: 'پیام‌ها', shortLabel: 'پیام', title: 'پیام‌ها و مکاتبات', icon: MessageCircle, view: 'messages' },
  { label: 'پروفایل', shortLabel: 'پروفایل', title: 'داشبورد و پروفایل کاربری', icon: User, view: 'dashboard' },
];

function isTabActive(
  pathname: string,
  view: AppView,
  searchParams: URLSearchParams
): boolean {
  if (view === 'browse-requests') {
    return pathname === '/n' || pathname.startsWith('/n/');
  }
  if (view === 'browse-specialists') {
    if (isBusinessProductDetailPath(pathname)) return false;
    return pathname === '/b' || pathname.startsWith('/b/');
  }
  if (view === 'dashboard') {
    return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  }
  if (view === 'messages') {
    return pathname === '/chat' || pathname.startsWith('/chat/');
  }
  const href = legacyViewToPath(view);
  const pathOnly = href.split('?')[0] ?? href;
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

/** نقطه نئونی فشرده — حداکثر ۴px بیشتر از نقطه تکی (۴px → ۸px برای هر دو) */
function MobileNavChatAlert({
  hasUnread,
  hasMissedCall,
}: {
  hasUnread: boolean;
  hasMissedCall: boolean;
}) {
  if (!hasUnread && !hasMissedCall) return null;

  if (hasUnread && hasMissedCall) {
    return (
      <span
        className="pointer-events-none absolute -top-px -inset-e-px size-2 rounded-full ring-1 ring-background/80"
        style={{
          background: 'conic-gradient(from 135deg, #34d399 0deg 180deg, #f87171 180deg 360deg)',
          boxShadow:
            '0 0 4px rgba(52,211,153,0.95), 0 0 4px rgba(248,113,113,0.95), 0 0 8px rgba(52,211,153,0.35)',
        }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn(
        'pointer-events-none absolute -top-px -inset-e-px size-1 rounded-full ring-1 ring-background/70',
        hasUnread
          ? 'bg-emerald-400 shadow-[0_0_4px_1px_rgba(52,211,153,0.9)]'
          : 'bg-rose-500 shadow-[0_0_4px_1px_rgba(248,113,113,0.9)]'
      )}
      aria-hidden
    />
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, setAuthModalOpen, conversations, authToken, currentUser, fetchConversations } =
    useAppStore();
  const { navigateTo } = useNavigate();
  const [missedCallCount, setMissedCallCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const businessHref = useBrowseUrl({ type: 'business' }, pathname);
  const needsHref = useBrowseUrl({ type: 'need' }, pathname);
  const isHomeActive = pathname === '/';

  const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const hasUnreadMessages = unreadMessages > 0;
  const hasMissedCalls = missedCallCount > 0;

  const fetchMissedCalls = useCallback(async () => {
    if (!isAuthenticated || !authToken || !currentUser?.id) {
      setMissedCallCount(0);
      return;
    }
    try {
      const res = await fetch('/api/calls?limit=40', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const calls = Array.isArray(data.data) ? data.data : [];
      const missed = calls.filter(
        (call: { status: string; calleeId: string }) =>
          call.status === 'MISSED' && call.calleeId === currentUser.id
      ).length;
      setMissedCallCount(missed);
    } catch {
      /* ignore */
    }
  }, [authToken, currentUser?.id, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && authToken) {
      void fetchConversations();
    }
  }, [isAuthenticated, authToken, fetchConversations]);

  useEffect(() => {
    void fetchMissedCalls();
    const onCallLogChanged = () => void fetchMissedCalls();
    window.addEventListener('voice:call-log-changed', onCallLogChanged);
    return () => window.removeEventListener('voice:call-log-changed', onCallLogChanged);
  }, [fetchMissedCalls]);

  useEffect(() => {
    if (pathname.startsWith('/chat')) {
      void fetchMissedCalls();
    }
  }, [pathname, fetchMissedCalls]);

  const tabHref = (view: AppView) => {
    if (view === 'browse-specialists') return businessHref;
    if (view === 'browse-requests') return needsHref;
    return legacyViewToPath(view);
  };

  const handleTabClick = (tab: TabItem) => {
    if ((tab.view === 'dashboard' || tab.view === 'messages') && !isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    navigateTo(tab.view);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-(--z-mobile-nav) pointer-events-none lg:hidden"
      dir="rtl"
      role="navigation"
      aria-label="ناوبری پایین صفحه"
    >
      <div
        className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-2xl xl:max-w-3xl px-2.5 lg:px-6 pointer-events-auto"
        style={{
          paddingBottom: 'max(var(--mobile-nav-float-gap), env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          className={cn(
            'mobile-nav-glass mobile-nav-gradient-top',
            'relative flex items-end justify-around gap-0.5',
            'min-h-(--mobile-nav-bar) rounded-2xl',
            'px-1 pt-1 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]',
            'dark:shadow-[0_-2px_16px_rgba(0,0,0,0.35)]'
          )}
        >
          {TABS.map((tab, index) => {
            const isActive = isTabActive(pathname, tab.view, searchParams);
            const Icon = tab.icon;
            const isMessagesTab = tab.view === 'messages';
            const href = tabHref(tab.view);
            const messagesAlertLabel = [
              hasUnreadMessages ? `${unreadMessages} پیام خوانده‌نشده` : '',
              hasMissedCalls ? `${missedCallCount} تماس از دست‌رفته` : '',
            ]
              .filter(Boolean)
              .join('، ');

            return (
              <React.Fragment key={tab.view}>
                {index === 2 && (
                  <button
                    type="button"
                    data-href={routeBuilder.home()}
                    title="ثبت نیاز جدید"
                    onClick={() => navigateTo('home')}
                    className={cn(
                      'relative -mt-(--mobile-nav-fab-overhang) flex flex-col items-center justify-center shrink-0',
                      'min-w-13 group'
                    )}
                    aria-current={isHomeActive ? 'page' : undefined}
                    aria-label="ثبت نیاز"
                  >
                    <span
                      className={cn(
                        'flex size-11 items-center justify-center rounded-full',
                        'bg-linear-to-br from-emerald-500 to-emerald-600',
                        'shadow-[0_3px_12px_rgba(5,150,105,0.35),0_0_0_2px_oklch(0.51_0.12_165/0.08)]',
                        'transition-transform duration-200 ease-out',
                        'group-hover:scale-[1.04] group-active:scale-95',
                        isHomeActive && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background'
                      )}
                    >
                      <Plus className="size-5 text-white" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 text-xs leading-none font-medium max-[360px]:hidden',
                        isHomeActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      ثبت نیاز
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  data-href={href}
                  title={tab.title}
                  onClick={() => handleTabClick(tab)}
                  className={cn(
                    'relative flex flex-1 flex-col items-center justify-center gap-0.5',
                    'rounded-xl px-0.5 py-1 min-h-11 min-w-0',
                    'text-xs leading-tight font-medium transition-colors duration-200',
                    'touch-manipulation touch-target-min',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground active:bg-accent/60'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={
                    isMessagesTab && messagesAlertLabel
                      ? `${tab.label} (${messagesAlertLabel})`
                      : tab.label
                  }
                >
                  <span className="relative flex items-center justify-center size-8">
                    <Icon className="size-4.5" strokeWidth={isActive ? 2.25 : 2} aria-hidden />
                    {isMessagesTab && mounted ? (
                      <MobileNavChatAlert
                        hasUnread={hasUnreadMessages}
                        hasMissedCall={hasMissedCalls}
                      />
                    ) : null}
                  </span>
                  <span className="truncate max-w-full px-0.5">
                    <span className="max-[380px]:hidden">{tab.label}</span>
                    <span className="hidden max-[380px]:inline">{tab.shortLabel}</span>
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
