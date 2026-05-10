'use client';

import { motion } from 'framer-motion';
import { Home, FileText, Users, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/types';

// ============ Tab Configuration ============
interface TabItem {
  label: string;
  icon: typeof Home;
  view: AppView;
}

const TABS: TabItem[] = [
  { label: 'خانه', icon: Home, view: 'home' },
  { label: 'نیازها', icon: FileText, view: 'browse-requests' },
  { label: 'متخصص‌ها', icon: Users, view: 'browse-specialists' },
  { label: 'پیام‌ها', icon: MessageCircle, view: 'messages' },
  { label: 'پروفایل', icon: User, view: 'dashboard' },
];

// ============ Mobile Bottom Navigation ============
export function MobileBottomNav() {
  const { currentView, navigateTo, isAuthenticated, setAuthModalOpen, setAuthModalTab, conversations } =
    useAppStore();

  // Calculate total unread message count from conversations
  const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

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
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden"
      dir="rtl"
      aria-label="ناوبری اصلی موبایل"
    >
      <div className="mx-auto max-w-lg">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex items-center justify-around gap-1 rounded-t-2xl border border-b-0 border-border/40 bg-background/80 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        >
          {TABS.map((tab) => {
            const isActive = currentView === tab.view;
            const Icon = tab.icon;
            const showBadge = tab.view === 'messages' && unreadMessages > 0;

            return (
              <button
                key={tab.view}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  'relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                )}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active indicator background */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active-bg"
                    className="absolute inset-0 rounded-xl bg-primary/8"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <div className="relative">
                  <Icon
                    className={cn(
                      'size-5 transition-all duration-200',
                      isActive && 'scale-110'
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  {/* Unread badge for messages */}
                  {showBadge && (
                    <span className="absolute -top-1.5 -left-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-sm">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={cn(isActive && 'font-semibold')}>{tab.label}</span>
              </button>
            );
          })}
        </motion.div>
      </div>
    </nav>
  );
}
