'use client';

import React from 'react';
import { Home, Users, MessageCircle, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/types';

// ============ Tab Configuration ============
interface TabItem {
  label: string;
  title: string;
  icon: typeof Home;
  view: AppView;
}

const TABS: TabItem[] = [
  { label: 'خانه', title: 'صفحه اصلی - نیاز فایندر', icon: Home, view: 'home' },
  { label: 'کسب‌وکارها', title: 'مرور و جستجوی کسب‌وکارها', icon: Users, view: 'browse-specialists' },
  { label: 'پیام‌ها', title: 'پیام‌ها و مکاتبات', icon: MessageCircle, view: 'messages' },
  { label: 'پروفایل', title: 'داشبورد و پروفایل کاربری', icon: User, view: 'dashboard' },
];

// ============ View → SEO path mapping ============
const VIEW_HREF: Record<AppView, string> = {
  'home': '/',
  'login': '/login',
  'register': '/register',
  'post-need': '/post-need',
  'browse-requests': '/browse-requests',
  'request-detail': '/request-detail',
  'browse-specialists': '/browse-specialists',
  'specialist-profile': '/specialist-profile',
  'dashboard': '/dashboard',
  'messages': '/messages',
  'notifications': '/notifications',
  'admin': '/admin',
  'profile': '/profile',
  'pricing': '/pricing',
  'compare-specialists': '/compare-specialists',
  'submit-proposal': '/submit-proposal',
  'submit-review': '/submit-review',
  'referral': '/referral',
  'notification-settings': '/notification-settings',
};

// ============ Mobile Bottom Navigation ============
export function MobileBottomNav() {
  const {
    currentView,
    navigateTo,
    isAuthenticated,
    setAuthModalOpen,
    setAuthModalTab,
    conversations,
  } = useAppStore();

  // Calculate total unread message count from conversations
  const unreadMessages = conversations.reduce(
    (sum, c) => sum + c.unreadCount,
    0
  );

  const handleTabClick = (tab: TabItem) => {
    // If profile tab and not authenticated, open auth modal
    if (tab.view === 'dashboard' && !isAuthenticated) {
      setAuthModalTab('login');
      setAuthModalOpen(true);
      return;
    }

    // If messages tab and not authenticated, open auth modal
    if (tab.view === 'messages' && !isAuthenticated) {
      setAuthModalTab('login');
      setAuthModalOpen(true);
      return;
    }

    navigateTo(tab.view);
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[var(--z-mobile-nav)] lg:hidden"
      dir="rtl"
      role="navigation"
      aria-label="ناوبری پایین صفحه"
    >
      <div className="mx-auto max-w-lg">
        <div className={cn(
          'mobile-nav-glass mobile-nav-gradient-top',
          'relative flex items-center justify-around gap-1 rounded-t-2xl',
          'px-1 pt-1 pb-[max(8px,env(safe-area-inset-bottom))]',
          'shadow-[0_-4px_20px_rgba(0,0,0,0.05)]',
        )}>
          {TABS.map((tab, index) => {
            const isActive = currentView === tab.view;
            const Icon = tab.icon;
            const showBadge = tab.view === 'messages' && unreadMessages > 0;

            return (
              <React.Fragment key={tab.view}>
                {/* Insert FAB after 2nd tab (index 1) */}
                {index === 2 && (
                  <button
                    type="button"
                    data-href={VIEW_HREF['post-need']}
                    title="ثبت نیاز جدید"
                    onClick={() => navigateTo('post-need')}
                    className={cn(
                      'relative -mt-6 flex flex-col items-center justify-center shrink-0',
                      'group'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-14 items-center justify-center rounded-full',
                        'bg-gradient-to-br from-emerald-500 to-emerald-600',
                        'shadow-[0_4px_16px_rgba(5,150,105,0.4),0_0_0_3px_oklch(0.51_0.12_165/0.1)]',
                        'transition-all duration-200 ease-out',
                        'group-hover:shadow-[0_6px_24px_rgba(5,150,105,0.5),0_0_0_4px_oklch(0.51_0.12_165/0.15)]',
                        'group-hover:scale-105',
                        'active:scale-95'
                      )}
                    >
                      <Plus className="size-7 text-white" strokeWidth={2.5} />
                    </span>
                    <span className="text-[10px] font-medium text-primary mt-1">
                      ثبت نیاز
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  data-href={VIEW_HREF[tab.view]}
                  title={tab.title}
                  onClick={() => handleTabClick(tab)}
                  className={cn(
                    'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium transition-all duration-300 ease-out',
                    'min-h-[44px] touch-ripple',
                    isActive
                      ? 'text-primary bg-primary/10 scale-[1.04]'
                      : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground active:scale-95 active:bg-accent/50',
                  )}
                  aria-label={tab.title}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Active dot indicator above icon */}
                  <span
                    className={cn(
                      'absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-300 ease-out',
                      isActive
                        ? 'w-6 h-[3px] bg-primary shadow-[0_0_8px_oklch(0.51_0.12_165/0.5)] scale-100 opacity-100'
                        : 'w-1.5 h-1.5 scale-0 opacity-0'
                    )}
                    aria-hidden="true"
                  />

                  {/* Icon */}
                  <div className="relative transition-transform duration-300 ease-out">
                    <Icon
                      className={cn(
                        'transition-all duration-300 ease-out',
                        isActive ? 'size-[22px] text-primary drop-shadow-[0_1px_2px_oklch(0.51_0.12_165/0.3)]' : 'size-[20px]',
                        !isActive && 'hover:scale-110'
                      )}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />

                    {/* Unread badge for messages */}
                    {showBadge && (
                      <span
                        className={cn(
                          'animate-notification-pulse absolute -top-1.5 -left-1.5',
                          'flex size-5 min-w-[20px] items-center justify-center',
                          'rounded-full px-0.5',
                          'bg-gradient-to-br from-red-500 to-orange-500',
                          'text-[9px] font-bold leading-none text-white',
                          'shadow-sm shadow-red-500/30',
                          'ring-2 ring-background',
                        )}
                        aria-label={`${unreadMessages} پیام خوانده نشده`}
                      >
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'transition-all duration-150',
                      isActive && 'font-bold'
                    )}
                  >
                    {tab.label}
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
