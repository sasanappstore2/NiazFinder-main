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
        <div className="flex items-center justify-around gap-1 rounded-t-2xl border border-b-0 border-border/40 bg-background/80 px-1 pt-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
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
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors duration-150',
                  'min-h-[44px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                )}
                aria-label={tab.title}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active bottom indicator */}
                <span
                  className={cn(
                    'absolute inset-x-2 bottom-0 h-[2px] rounded-full transition-colors duration-150',
                    isActive ? 'bg-primary' : 'bg-transparent'
                  )}
                  aria-hidden="true"
                />

                {/* Icon */}
                <div className="relative">
                  <Icon
                    className={cn(
                      'size-[20px] transition-colors duration-150',
                      isActive && 'text-primary'
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  {/* Unread badge for messages */}
                  {showBadge && (
                    <span
                      className="absolute -top-1.5 -left-1.5 flex size-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold leading-none text-white shadow-sm"
                      aria-label={`${unreadMessages} پیام خوانده نشده`}
                    >
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'transition-colors duration-150',
                    isActive && 'font-semibold'
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
