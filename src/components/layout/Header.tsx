'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef, Suspense, useSyncExternalStore } from 'react';
import {
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

import { HeaderSearchBar } from '@/components/shared/HeaderSearchBar';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { ArkUserMenu } from '@/components/ui/ark-user-menu';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { SITE_NAME } from '@/lib/constants';
import {
  CategorySelector,
  ALL_CATEGORIES,
  getCategoryIcon,
} from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import type { MegaMenuCategory } from '@/components/navigation/MegaMenu/CategoryMegaMenu';
import { routeBuilder } from '@/config/routes';
import { getCategoryBrowseUrl } from '@/lib/search/category-browse-url';
import { useBrowseListingType } from '@/hooks/use-browse-listing-type';
import {
  BusinessBrowseCategoryMenuDesktop,
  BusinessBrowseCategoryMenuMobile,
} from '@/components/browse/BusinessBrowseCategoryMenu';
import { usePathname, useRouter } from 'next/navigation';
import { shouldShowBrowseHeaderChrome } from '@/lib/search/browse-path';
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
          'w-80 p-0',
          'border-border bg-popover text-popover-foreground shadow-lg'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">اعلان‌ها</h3>
          </div>
          {unreadNotificationCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
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
              <BellOff className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">بدون اعلان</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
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
                          ? 'opacity-60 hover:bg-muted/50'
                          : 'bg-muted/40 hover:bg-muted/60'
                      )}
                    >
                      {/* Unread indicator */}
                      {!notif.isRead && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      )}
                      {notif.isRead && <span className="w-2 shrink-0" />}

                      {/* Icon */}
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                          notif.isRead
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/10 text-primary'
                        )}
                      >
                        <Icon className="size-4" />
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'truncate text-sm leading-snug',
                          notif.isRead ? 'text-muted-foreground' : 'text-foreground font-medium'
                        )}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {notif.message}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
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
          <div className="border-t border-border px-4 py-2.5">
            <button
              type="button"
              onClick={handleViewAll}
              className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-muted"
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
function NeedHeaderCategoryMenuDesktop() {
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
            <span>دسته‌بندی نیازها</span>
            <ChevronDown
              className={cn('size-3 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(840px,calc(100vw-2rem))] max-h-[min(450px,calc(100dvh-var(--site-header-offset,6.5rem)-2rem))] p-0 overflow-hidden"
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

function HeaderCategoryMenuDesktop() {
  const listingType = useBrowseListingType();
  if (listingType === 'business') {
    return <BusinessBrowseCategoryMenuDesktop />;
  }
  return <NeedHeaderCategoryMenuDesktop />;
}

// ============ Category Mega Menu in Header (Mobile) ============
function NeedHeaderCategoryMenuMobile() {
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
            <span>دسته‌بندی نیازها</span>
            <ChevronLeft className="size-3" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" showCloseButton={false} className="w-[min(340px,calc(100vw-1.5rem))] p-0 sm:w-[min(400px,calc(100vw-2rem))]">
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

function HeaderCategoryMenuMobile() {
  const listingType = useBrowseListingType();
  if (listingType === 'business') {
    return <BusinessBrowseCategoryMenuMobile />;
  }
  return <NeedHeaderCategoryMenuMobile />;
}

// ============ Header Component ============
function HeaderFilterRow() {
  const pathname = usePathname();
  if (!shouldShowBrowseHeaderChrome(pathname)) return null;
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
  const showBrowseChrome = shouldShowBrowseHeaderChrome(pathname);

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
  }, [compact, pathname, isScrolled, useSolidHeader, showBrowseChrome]);

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
        <div className="flex h-[52px] min-w-0 items-center gap-2 sm:gap-4">
          {/* Logo icon — right of search (RTL), links home */}
          <button
            type="button"
            data-href="/"
            title="صفحه اصلی"
            onClick={() => navigateTo('home')}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg transition-opacity duration-150 hover:opacity-80 active:scale-95"
            aria-label={`${SITE_NAME} — صفحه اصلی`}
          >
            <Image
              src="/logo.svg"
              alt=""
              width={28}
              height={28}
              className="size-7"
              priority={false}
            />
          </button>

          {/* Search — full width on mobile */}
          <div className="flex min-w-0 flex-1 max-w-[600px] items-center">
            <div className="search-glow-focus w-full min-w-0 flex-1 rounded-xl">
              <HeaderSearchBar compact />
            </div>
          </div>

          {/* Left edge (RTL end): city + auth — ms-auto absorbs gap from search max-width */}
          <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <AuthSection />
          </div>
        </div>

        {!compact && showBrowseChrome && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 py-2 md:flex-nowrap">
            <HeaderCategoryMenuDesktop />
            <HeaderCategoryMenuMobile />
            <div className="min-w-0 w-full flex-1 basis-full overflow-x-auto md:basis-auto md:overflow-visible">
              <HeaderFilterRow />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
