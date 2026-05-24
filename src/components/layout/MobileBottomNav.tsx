'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import React from 'react';
import { usePathname } from 'next/navigation';
import { Home, Users, MessageCircle, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { routeBuilder, legacyViewToPath } from '@/config/routes';
import type { AppView } from '@/lib/types';

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

function isTabActive(pathname: string, view: AppView): boolean {
  const href = legacyViewToPath(view);
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, setAuthModalOpen, conversations } = useAppStore();
  const { navigateTo } = useNavigate();

  const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleTabClick = (tab: TabItem) => {
    if ((tab.view === 'dashboard' || tab.view === 'messages') && !isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    navigateTo(tab.view);
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[var(--z-mobile-nav)]"
      dir="rtl"
      role="navigation"
      aria-label="ناوبری پایین صفحه"
    >
      <div className="mx-auto max-w-7xl">
        <div
          className={cn(
            'mobile-nav-glass mobile-nav-gradient-top',
            'relative flex items-center justify-around gap-1 rounded-t-2xl',
            'px-1 pt-1 pb-[max(8px,env(safe-area-inset-bottom))]',
            'shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'
          )}
        >
          {TABS.map((tab, index) => {
            const isActive = isTabActive(pathname, tab.view);
            const Icon = tab.icon;
            const showBadge = tab.view === 'messages' && unreadMessages > 0;
            const tabHref = legacyViewToPath(tab.view);

            return (
              <React.Fragment key={tab.view}>
                {index === 2 && (
                  <button
                    type="button"
                    data-href={routeBuilder.needNew()}
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
                    <span className="text-caption font-medium text-primary mt-1">ثبت نیاز</span>
                  </button>
                )}
                <button
                  type="button"
                  data-href={tabHref}
                  title={tab.title}
                  onClick={() => handleTabClick(tab)}
                  className={cn(
                    'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-caption font-medium transition-all duration-300 ease-out',
                    'min-h-[44px] touch-ripple',
                    isActive
                      ? 'text-primary bg-primary/10 scale-[1.04]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="relative">
                    <Icon className="size-5" aria-hidden="true" />
                    {showBadge && (
                      <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-destructive text-overline font-bold text-white">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </span>
                  <span>{tab.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
