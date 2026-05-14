'use client';

import { Home, Users, MessageCircle, User } from 'lucide-react';
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
        <div className="relative flex items-center justify-around gap-1 rounded-t-2xl border border-b-0 border-border/30 bg-background/80 px-1 pt-1 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:bg-background/60">
          {/* Gradient top border accent */}
          <div className="gradient-line absolute inset-x-3 top-0" />
          {TABS.map((tab) => {
            const isActive = currentView === tab.view;
            const Icon = tab.icon;
            const showBadge = tab.view === 'messages' && unreadMessages > 0;

            return (
              <button
                key={tab.view}
                type="button"
                data-href={VIEW_HREF[tab.view]}
                title={tab.title}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium transition-all duration-200',
                  'min-h-[44px]',
                  isActive
                    ? 'text-primary bg-primary/8'
                    : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground active:bg-accent/50'
                )}
                aria-label={tab.title}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active dot indicator above icon */}
                <span
                  className={cn(
                    'absolute top-0 left-1/2 -translate-x-1/2 size-1.5 rounded-full transition-all duration-200',
                    isActive ? 'bg-primary shadow-[0_0_6px_oklch(0.51_0.12_165/0.5)] scale-100 opacity-100' : 'scale-0 opacity-0'
                  )}
                  aria-hidden="true"
                />

                {/* Active bottom indicator */}
                <span
                  className={cn(
                    'absolute inset-x-2 bottom-0 h-[2.5px] rounded-full transition-all duration-200',
                    isActive ? 'bg-primary shadow-[0_0_6px_oklch(0.51_0.12_165/0.4)]' : 'bg-transparent'
                  )}
                  aria-hidden="true"
                />

                {/* Icon */}
                <div className="relative">
                  <Icon
                    className={cn(
                      'size-[20px] transition-all duration-200',
                      isActive && 'size-[22px] text-primary',
                      !isActive && 'hover:scale-105'
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />

                  {/* Unread badge for messages */}
                  {showBadge && (
                    <span
                      className="animate-notification-pulse absolute -top-1.5 -left-1.5 flex size-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 px-0.5 text-[9px] font-bold leading-none text-white shadow-sm shadow-red-500/30"
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
            );
          })}
        </div>
      </div>
    </nav>
  );
}
