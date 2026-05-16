'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LocateFixed,
  Bell,
  MessageSquare,
  Menu,
  User,
  LogOut,
  LayoutDashboard,
  Bookmark,
  FileText,
  CreditCard,
  Gift,
  GitCompareArrows,
  ChevronLeft,
  ChevronDown,
  Settings,
  Check,
  Heart,
  Star,
  UserPlus,
  Clock,
  BellOff,
  ArrowLeft,
  LayoutGrid,
} from 'lucide-react';

import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { HeaderSearchBar, DEMO_SEARCH_DATA } from '@/components/shared/HeaderSearchBar';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { MobileLocationSelector } from '@/components/shared/MobileLocationSelector';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { SITE_NAME } from '@/lib/constants';
import {
  CategorySelector,
  ALL_CATEGORIES,
  getCategoryIcon,
  getCategoryColor,
} from '@/components/layout/CategoryMegaMenu';
import type { MegaMenuCategory } from '@/components/layout/CategoryMegaMenu';
import type { AppView } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

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

// ============ View → Descriptive title mapping ============
const VIEW_TITLE: Record<AppView, string> = {
  'home': 'صفحه اصلی - نیاز فایندر',
  'login': 'ورود به حساب کاربری',
  'register': 'ثبت‌نام در نیاز فایندر',
  'post-need': 'ثبت نیاز جدید',
  'browse-requests': 'مشاهده نیازهای ثبت شده',
  'request-detail': 'جزئیات نیاز',
  'browse-specialists': 'مرور و جستجوی کسب‌وکارها',
  'specialist-profile': 'پروفایل کسب‌وکار',
  'dashboard': 'داشبورد کاربری',
  'messages': 'پیام‌ها و مکاتبات',
  'notifications': 'اعلان‌ها و اطلاع‌رسانی',
  'admin': 'پنل مدیریت',
  'profile': 'پروفایل من',
  'pricing': 'تعرفه‌ها و طرح‌های اشتراک',
  'compare-specialists': 'مقایسه کسب‌وکارها',
  'submit-proposal': 'ارسال پیشنهاد',
  'submit-review': 'ثبت نظر و امتیاز',
  'referral': 'دعوت از دوستان',
  'notification-settings': 'تنظیمات اعلان‌ها',
};

// ============ Navigation Items ============
interface NavItem {
  label: string;
  view: AppView;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'صفحه اصلی', view: 'home' },
  { label: 'ثبت نیاز', view: 'post-need' },
  { label: 'کسب‌وکارها', view: 'browse-specialists' },
];

// ============ Mobile Nav Item ============
function MobileNavItem({
  item,
  onSelect,
}: {
  item: NavItem;
  onSelect: () => void;
}) {
  const { currentView, navigateTo } = useAppStore();
  const isActive = currentView === item.view;

  return (
    <button
      type="button"
      data-href={VIEW_HREF[item.view]}
      title={VIEW_TITLE[item.view]}
      onClick={() => {
        navigateTo(item.view);
        onSelect();
      }}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <span className="text-base">{item.label}</span>
    </button>
  );
}

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
  const { notifications, unreadNotificationCount, fetchNotifications, markNotificationReadAPI, markAllNotificationsReadAPI, navigateTo } = useAppStore();
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
                "absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-destructive p-0 text-[10px] font-bold text-white",
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
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400/40">
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
              data-href={VIEW_HREF['notifications']}
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
  const { navigateTo, conversations } = useAppStore();
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigateTo('messages')}
      className="relative size-9 text-muted-foreground hover:text-foreground"
      aria-label={`پیام‌ها${unreadCount > 0 ? ` (${unreadCount} خوانده نشده)` : ''}`}
      title={VIEW_TITLE['messages']}
      data-href={VIEW_HREF['messages']}
    >
      <MessageSquare className="size-[16px]" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-destructive p-0 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}

// ============ Auth Buttons (Guest) ============
function GuestActions() {
  const { setAuthModalOpen, setAuthModalTab } = useAppStore();

  const handleLogin = () => {
    setAuthModalTab('login');
    setAuthModalOpen(true);
  };

  const handleRegister = () => {
    setAuthModalTab('register');
    setAuthModalOpen(true);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogin}
        className="h-[36px] text-sm font-medium text-muted-foreground hover:text-foreground"
        title={VIEW_TITLE['login']}
        data-href={VIEW_HREF['login']}
      >
        ورود
      </Button>
      <Button
        size="sm"
        onClick={handleRegister}
        className="h-[36px] text-sm font-medium"
        title={VIEW_TITLE['register']}
        data-href={VIEW_HREF['register']}
      >
        ثبت‌نام
      </Button>
    </div>
  );
}

// ============ User Menu (Authenticated) ============
function UserMenu() {
  const { currentUser, navigateTo, logout } = useAppStore();

  if (!currentUser) return null;

  const initials =
    currentUser.firstName.charAt(0) + currentUser.lastName.charAt(0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-9 rounded-full p-0"
          aria-label="منوی کاربری"
          title="منوی کاربری"
        >
          <Avatar className="size-8 border-2 border-primary/20">
            <AvatarImage
              src={currentUser.avatar}
              alt={
                currentUser.displayName ||
                `${currentUser.firstName} ${currentUser.lastName}`
              }
            />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">
              {currentUser.displayName ||
                `${currentUser.firstName} ${currentUser.lastName}`}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigateTo('profile')}
            data-href={VIEW_HREF['profile']}
            title={VIEW_TITLE['profile']}
          >
            <User className="ms-2 size-4" />
            پروفایل
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigateTo('dashboard')}
            data-href={VIEW_HREF['dashboard']}
            title={VIEW_TITLE['dashboard']}
          >
            <LayoutDashboard className="ms-2 size-4" />
            داشبورد
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigateTo('browse-requests')}
            data-href="/bookmarks"
            title="علاقه‌مندی‌ها و نیازهای ذخیره شده"
          >
            <Bookmark className="ms-2 size-4" />
            علاقه‌مندی‌ها
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigateTo('dashboard')}
            data-href="/proposals"
            title="پیشنهادهای ارسالی من"
          >
            <FileText className="ms-2 size-4" />
            پیشنهادها
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigateTo('pricing')}
            data-href={VIEW_HREF['pricing']}
            title={VIEW_TITLE['pricing']}
          >
            <CreditCard className="ms-2 size-4" />
            تعرفه‌ها
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigateTo('referral')}
            data-href={VIEW_HREF['referral']}
            title={VIEW_TITLE['referral']}
          >
            <Gift className="ms-2 size-4" />
            دعوت از دوستان
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigateTo('compare-specialists')}
            data-href={VIEW_HREF['compare-specialists']}
            title={VIEW_TITLE['compare-specialists']}
          >
            <GitCompareArrows className="ms-2 size-4" />
            مقایسه کسب‌وکارها
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigateTo('notification-settings')}
            data-href={VIEW_HREF['notification-settings']}
            title={VIEW_TITLE['notification-settings']}
          >
            <Settings className="ms-2 size-4" />
            تنظیمات اعلان‌ها
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} variant="destructive" title="خروج از حساب کاربری">
          <LogOut className="ms-2 size-4" />
          خروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============ Mobile Sheet Content ============
function MobileSheetContent() {
  const {
    isAuthenticated,
    currentUser,
    logout,
    setAuthModalOpen,
    setAuthModalTab,
    setMobileMenuOpen,
  } = useAppStore();

  const handleLogin = () => {
    setAuthModalTab('login');
    setAuthModalOpen(true);
  };

  const handleRegister = () => {
    setAuthModalTab('register');
    setAuthModalOpen(true);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <SheetHeader className="border-b border-border pb-4">
        <SheetTitle className="flex items-center gap-2 text-right">
          <span className="text-lg font-bold text-primary">{SITE_NAME}</span>
          <LocateFixed className="size-5 text-primary" />
        </SheetTitle>
      </SheetHeader>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4" aria-label="منوی موبایل">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          منو
        </p>
        {NAV_ITEMS.map((item) => (
          <MobileNavItem
            key={item.view}
            item={item}
            onSelect={() => {}}
          />
        ))}
      </nav>

      <Separator />

      {/* Location Selector */}
      <div className="flex flex-col gap-1 px-4 pt-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          مکان
        </p>
        <MobileLocationSelector />
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="flex flex-col gap-1 p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          دسترسی سریع
        </p>
        <MobileNavItem
          item={{ label: 'اعلان‌ها', view: 'notifications' }}
          onSelect={() => {}}
        />
        <MobileNavItem
          item={{ label: 'پیام‌ها', view: 'messages' }}
          onSelect={() => {}}
        />
        {isAuthenticated && (
          <>
            <MobileNavItem
              item={{ label: 'داشبورد', view: 'dashboard' }}
              onSelect={() => {}}
            />
            <MobileNavItem
              item={{ label: 'پروفایل', view: 'profile' }}
              onSelect={() => {}}
            />
            <MobileNavItem
              item={{ label: 'علاقه‌مندی‌ها', view: 'browse-requests' }}
              onSelect={() => {}}
            />
            <MobileNavItem
              item={{ label: 'پیشنهادها', view: 'dashboard' }}
              onSelect={() => {}}
            />
          </>
        )}
      </div>

      {/* More */}
      <div className="flex flex-col gap-1 p-4">
        <p className="mb-2 flex items-center gap-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          بیشتر
          <ChevronLeft className="size-3" />
        </p>
        <MobileNavItem
          item={{ label: 'تعرفه‌ها', view: 'pricing' }}
          onSelect={() => {}}
        />
        <MobileNavItem
          item={{ label: 'دعوت از دوستان', view: 'referral' }}
          onSelect={() => {}}
        />
        <MobileNavItem
          item={{ label: 'مقایسه کسب‌وکارها', view: 'compare-specialists' }}
          onSelect={() => {}}
        />
      </div>

      {/* Bottom: User / Auth */}
      <div className="mt-auto border-t border-border p-4">
        {isAuthenticated && currentUser ? (
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border-2 border-primary/20">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {currentUser.firstName.charAt(0)}
                {currentUser.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {currentUser.displayName ||
                  `${currentUser.firstName} ${currentUser.lastName}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentUser.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
              aria-label="خروج از حساب"
              title="خروج از حساب کاربری"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full h-[40px]"
              onClick={handleLogin}
              title={VIEW_TITLE['login']}
              data-href={VIEW_HREF['login']}
            >
              ورود
            </Button>
            <Button
              className="w-full h-[40px]"
              onClick={handleRegister}
              title={VIEW_TITLE['register']}
              data-href={VIEW_HREF['register']}
            >
              ثبت‌نام
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Auth Section (Desktop) ============
function AuthSection() {
  const { isAuthenticated } = useAppStore();

  return (
    <div className="hidden sm:block">
      {isAuthenticated ? <UserMenu /> : <GuestActions />}
    </div>
  );
}

// ============ Category Mega Menu in Header (Desktop) ============
function HeaderCategoryMenuDesktop() {
  const [isOpen, setIsOpen] = useState(false);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const handleSelect = (category: MegaMenuCategory) => {
    navigateTo('browse-requests', { categoryId: category.value });
    setIsOpen(false);
  };

  return (
    <div className="hidden lg:flex items-center gap-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
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
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ============ Category Mega Menu in Header (Mobile) ============
function HeaderCategoryMenuMobile() {
  const [isOpen, setIsOpen] = useState(false);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const handleSelect = (category: MegaMenuCategory) => {
    navigateTo('browse-requests', { categoryId: category.value });
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
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============ Header Component ============
export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const {
    currentView,
    navigateTo,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useAppStore();

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 10);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-header)] w-full transition-all duration-300 ease-out',
        isScrolled
          ? 'header-glass header-scrolled shadow-md shadow-black/[0.04] dark:shadow-black/[0.15] -translate-y-px'
          : 'header-transparent'
      )}
      role="banner"
    >
      {/* Emerald gradient bottom line */}
      <div className="header-emerald-bottom-line absolute inset-x-0 bottom-0" />
      <div className={cn(
        'container-default border-b transition-colors duration-300',
        isScrolled ? 'border-border/30' : 'border-border/20',
      )}>
        <div className="flex h-[52px] items-center justify-between gap-4">
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

          {/* Center: Location Selector + Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-[580px] items-center gap-2 transition-all duration-300">
            <LocationSelector />
            <div className="flex-1 search-glow-focus rounded-xl">
              <HeaderSearchBar data={DEMO_SEARCH_DATA} />
            </div>
          </div>

          {/* Left: Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme Toggle — hidden on very small mobile, shown on sm+ */}
            <div className="hidden sm:flex">
              <ThemeToggle />
            </div>

            {/* Notifications */}
            <NotificationsButton />

            {/* Messages */}
            <MessagesButton />

            {/* Auth / User — desktop only */}
            <AuthSection />

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground hover:text-foreground lg:hidden"
                  aria-label="باز کردن منو"
                  title="باز کردن منوی موبایل"
                >
                  <Menu className="size-[20px]" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0 sm:w-[360px]">
                <MobileSheetContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* ═══ Second Row: Category Mega Menu ═══ */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2">
          {/* Mega menu trigger */}
          <HeaderCategoryMenuDesktop />
          <HeaderCategoryMenuMobile />

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-border/30 shrink-0" />

          {/* Category icon buttons */}
          <div className="flex items-center gap-1">
            {ALL_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const color = getCategoryColor(cat.value);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigateTo('browse-requests', { categoryId: cat.value })}
                  className="group flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 shrink-0 transition-all duration-200 hover:bg-accent"
                  title={cat.name}
                >
                  <Icon
                    className="size-4 transition-transform duration-200 group-hover:scale-110"
                    style={{ color }}
                  />
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground whitespace-nowrap transition-colors">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
