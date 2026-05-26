'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useState, useEffect, useCallback, useRef, Suspense, useSyncExternalStore } from 'react';
import {
  LocateFixed,
  Bell,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronDown,
  Check,
  Heart,
  Star,
  UserPlus,
  Clock,
  BellOff,
  ArrowLeft,
  LayoutGrid,
} from 'lucide-react';

import { HeaderSearchBar, DEMO_SEARCH_DATA } from '@/components/shared/HeaderSearchBar';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { ArkUserMenu } from '@/components/ui/ark-user-menu';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { SITE_NAME } from '@/lib/constants';
import {
  CategorySelector,
  ALL_CATEGORIES,
  getCategoryIcon,
} from '@/components/layout/CategoryMegaMenu';
import type { MegaMenuCategory } from '@/components/layout/CategoryMegaMenu';
import { routeBuilder } from '@/config/routes';
import { getCategoryBrowseUrl } from '@/lib/search/category-browse-url';
import { useBrowseListingType } from '@/hooks/use-browse-listing-type';
import { usePathname, useRouter } from 'next/navigation';
import { isBrowsePath } from '@/lib/search/browse-path';
import { BrowseFilterBar } from '@/components/browse/BrowseFilterBar';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

const VIEW_TITLE = {
  notifications: 'اعلان‌ها و اطلاع‌رسانی',
  messages: 'پیام‌ها و مکاتبات',
} as const;


// ============ Notification Type → Icon mapping ============
function getNotificationIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes('message') || lower.includes('chat')) return MessageSquare;
  if (lower.includes('like') || lower.includes('heart') || lower.includes('fav')) return Heart;
  if (lower.includes('star') || lower.includes('review') || lower.includes('rating')) return Star;
  if (lower.includes('follow') || lower.includes('user')) return UserPlus;
  if (lower.includes('check') || lower.includes('approv') || lower.includes('verif')) return Check;
  return Bell;
}

// ============ Relative time helper ============
function timeAgo(dateStr: string): string {
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

// ============ Notifications Button (with Dropdown) ============
function NotificationsButton() {
  const { notifications, unreadNotificationCount, fetchNotifications, markNotificationReadAPI, markAllNotificationsReadAPI} = useAppStore();
  const { navigateTo } = useNavigate();
  const [open, setOpen] = useState(false);

  const recentNotifications = notifications.slice(0, 5);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      fetchNotifications();
    }
  };

  const handleNotificationClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      markNotificationReadAPI(id);
    }
    setOpen(false);
    navigateTo('notifications');
  };

  const handleMarkAllRead = () => {
    markAllNotificationsReadAPI();
  };

  const handleViewAll = () => {
    setOpen(false);
    navigateTo('notifications');
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-muted-foreground hover:text-foreground"
          aria-label={`اعلان‌ها${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} خوانده نشده)` : ''}`}
          title={VIEW_TITLE['notifications']}
        >
          <Bell className="size-[16px]" />
          {unreadNotificationCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -inset-e-1 flex size-5 items-center justify-center rounded-full bg-destructive p-0 text-caption font-bold text-white",
                "animate-notification-pulse"
              )}
            >
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          'w-80 p-0 rtl:',
          'border-emerald-500/20 bg-emerald-950/80 backdrop-blur-xl dark:bg-emerald-950/90',
          'shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/15 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-100">اعلان‌ها</h3>
          </div>
          {unreadNotificationCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-emerald-400/70 transition-colors hover:text-emerald-300"
            >
              خواندن همه
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[400px] overflow-y-auto">
          {recentNotifications.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
              <BellOff className="size-8 text-emerald-500/30" />
              <p className="text-sm text-emerald-400/50">بدون اعلان</p>
            </div>
          ) : (
            <ul className="divide-y divide-emerald-500/10">
              {recentNotifications.map((notif) => {
                const Icon = getNotificationIcon(notif.type);
                return (
                  <li key={notif.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notif.id, notif.isRead)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-right transition-colors duration-150',
                        notif.isRead
                          ? 'opacity-60 hover:bg-emerald-500/5'
                          : 'bg-emerald-500/8 hover:bg-emerald-500/12'
                      )}
                    >
                      {/* Unread indicator */}
                      {!notif.isRead && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-400" />
                      )}
                      {notif.isRead && <span className="w-2 shrink-0" />}

                      {/* Icon */}
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                          notif.isRead
                            ? 'bg-emerald-500/10 text-emerald-500/40'
                            : 'bg-emerald-500/20 text-emerald-400'
                        )}
                      >
                        <Icon className="size-4" />
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'truncate text-sm leading-snug',
                          notif.isRead ? 'text-emerald-200/60' : 'text-emerald-100 font-medium'
                        )}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="mt-0.5 truncate text-xs text-emerald-300/40">
                            {notif.message}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-1 text-caption text-emerald-400/40">
                          <Clock className="size-3" />
                          <span>{timeAgo(notif.createdAt)}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* View All footer */}
        {notifications.length > 0 && (
          <div className="border-t border-emerald-500/15 px-4 py-2.5">
            <button
              type="button"
              onClick={handleViewAll}
              className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
              data-href={routeBuilder.notifications()}
              title={VIEW_TITLE['notifications']}
            >
              مشاهده همه
              <ArrowLeft className="size-3" />
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ============ Messages Button ============
function MessagesButton() {
  const { conversations } = useAppStore();
  const { navigateTo } = useNavigate();
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigateTo('messages')}
      className="relative size-9 text-muted-foreground hover:text-foreground"
      aria-label={`پیام‌ها${unreadCount > 0 ? ` (${unreadCount} خوانده نشده)` : ''}`}
      title={VIEW_TITLE['messages']}
      data-href={routeBuilder.chat()}
    >
      <MessageSquare className="size-[16px]" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -inset-e-1 flex size-5 items-center justify-center rounded-full bg-destructive p-0 text-caption font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}

// ============ Auth Buttons (Guest) ============
function GuestActions() {
  const { setAuthModalOpen } = useAppStore();

  const handleAuth = () => {
    setAuthModalOpen(true);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={handleAuth}
        className="h-[36px] text-sm font-medium gap-1.5"
        title="ورود و ثبت‌نام در نیاز فایندر"
      >
        ورود / ثبت‌نام
      </Button>
    </div>
  );
}

// ============ Auth Section (City Selector + User Menu) ============
function AuthSection() {
  return (
    <div className="flex items-center gap-1.5">
      {/* City Selector — next to user menu */}
      <LocationSelector />
      {/* Ark UI User Menu */}
      <ArkUserMenu />
    </div>
  );
}

// ============ Category Mega Menu in Header (Desktop) ============
function HeaderCategoryMenuDesktop() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const listingType = useBrowseListingType();

  const handleSelect = (category: MegaMenuCategory) => {
    router.push(getCategoryBrowseUrl(category, { type: listingType }));
    setIsOpen(false);
  };

  return (
    <div className="hidden lg:flex items-center gap-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setIsOpen((open) => !open);
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200',
              'border border-transparent',
              isOpen
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border/50'
            )}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <LayoutGrid className="size-4" />
            <span>همه دسته‌بندی‌ها</span>
            <ChevronDown
              className={cn('size-3 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[840px] p-0 overflow-hidden"
          dir="rtl"
          align="start"
          sideOffset={4}
        >
          <CategorySelector
            isDesktop={true}
            nestedCategories={ALL_CATEGORIES}
            onSelect={handleSelect}
            onClose={() => setIsOpen(false)}
            getIcon={getCategoryIcon}
            getHref={(c) => getCategoryBrowseUrl(c, { type: listingType })}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ============ Category Mega Menu in Header (Mobile) ============
function HeaderCategoryMenuMobile() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const listingType = useBrowseListingType();

  const handleSelect = (category: MegaMenuCategory) => {
    router.push(getCategoryBrowseUrl(category, { type: listingType }));
    setIsOpen(false);
  };

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent transition-all duration-200"
          >
            <LayoutGrid className="size-4" />
            <span>همه دسته‌بندی‌ها</span>
            <ChevronLeft className="size-3" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[340px] p-0 sm:w-[400px]">
          <CategorySelector
            isDesktop={false}
            nestedCategories={ALL_CATEGORIES}
            onSelect={handleSelect}
            onClose={() => setIsOpen(false)}
            getIcon={getCategoryIcon}
            getHref={(c) => getCategoryBrowseUrl(c, { type: listingType })}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============ Header Component ============
function HeaderFilterRow() {
  const pathname = usePathname();
  if (!isBrowsePath(pathname)) return null;
  return (
    <div className="min-w-0 flex-1">
      <Suspense fallback={null}>
        <BrowseFilterBar />
      </Suspense>
    </div>
  );
}

function subscribeScroll(onStoreChange: () => void) {
  window.addEventListener('scroll', onStoreChange, { passive: true });
  return () => window.removeEventListener('scroll', onStoreChange);
}

function getScrollSnapshot() {
  return window.scrollY > 10;
}

export function Header({ compact = false }: { compact?: boolean }) {
  const isScrolled = useSyncExternalStore(
    subscribeScroll,
    getScrollSnapshot,
    () => false
  );
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { navigateTo } = useNavigate();
  const isHome = pathname === '/';
  const useSolidHeader = !isHome || isScrolled;

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const syncHeaderOffset = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        '--site-header-offset',
        `${height + 2}px`
      );
    };

    syncHeaderOffset();
    const observer = new ResizeObserver(syncHeaderOffset);
    observer.observe(el);
    window.addEventListener('scroll', syncHeaderOffset, { passive: true });
    window.addEventListener('resize', syncHeaderOffset);

    const t1 = window.setTimeout(syncHeaderOffset, 100);
    const t2 = window.setTimeout(syncHeaderOffset, 500);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', syncHeaderOffset);
      window.removeEventListener('resize', syncHeaderOffset);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [compact, pathname, isScrolled, useSolidHeader]);

  return (
    <header
      ref={headerRef}
      className={cn(
        'sticky top-0 isolate z-(--z-header) w-full transition-all duration-300 ease-out',
        useSolidHeader
          ? cn(
              'header-glass header-solid',
              isScrolled &&
                'header-scrolled shadow-md shadow-black/4 dark:shadow-black/15 -translate-y-px'
            )
          : 'header-transparent'
      )}
      role="banner"
    >
      {/* Emerald gradient bottom line */}
      <div className="header-emerald-bottom-line absolute inset-x-0 bottom-0" />
      <div className={cn(
        'page-container border-b transition-colors duration-300',
        isScrolled ? 'border-border/30' : 'border-border/20',
      )}>
        <div className="flex h-[52px] min-w-0 items-center justify-between gap-2 sm:gap-4">
          {/* Right: Logo */}
          <button
            type="button"
            data-href="/"
            title="نیاز فایندر - صفحه اصلی"
            onClick={() => navigateTo('home')}
            className="flex shrink-0 items-center gap-2 transition-colors duration-150 hover:opacity-80"
            aria-label={SITE_NAME}
          >
            <LocateFixed className="size-[24px] text-primary" />
            <span className="text-lg font-bold tracking-tight text-primary sm:text-xl">
              {SITE_NAME}
            </span>
          </button>

          {/* Center: Search — hidden on very narrow phones to avoid crowding */}
          <div className="hidden min-w-0 flex-1 max-w-[600px] items-center sm:flex">
            <div className="w-full min-w-0 flex-1 search-glow-focus rounded-xl">
              <HeaderSearchBar data={DEMO_SEARCH_DATA} />
            </div>
          </div>

          {/* Left: Actions */}
          <div className="flex items-center gap-1.5">
            <AuthSection />
          </div>
        </div>

        {!compact && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 py-2">
            <HeaderCategoryMenuDesktop />
            <HeaderCategoryMenuMobile />
            <div className="min-w-0 flex-1 basis-full overflow-x-auto sm:basis-auto">
              <HeaderFilterRow />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
