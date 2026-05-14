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
  Settings,
} from 'lucide-react';

import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { HeaderSearchBar, DEMO_SEARCH_DATA } from '@/components/shared/HeaderSearchBar';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { MobileLocationSelector } from '@/components/shared/MobileLocationSelector';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { SITE_NAME } from '@/lib/constants';
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

// ============ Notifications Button ============
function NotificationsButton() {
  const { unreadNotificationCount, navigateTo } = useAppStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigateTo('notifications')}
      className="relative size-9 text-muted-foreground hover:text-foreground"
      aria-label={`اعلان‌ها${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} خوانده نشده)` : ''}`}
      title={VIEW_TITLE['notifications']}
      data-href={VIEW_HREF['notifications']}
    >
      <Bell className="size-[16px]" />
      {unreadNotificationCount > 0 && (
        <Badge className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-destructive p-0 text-[10px] font-bold text-white">
          {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
        </Badge>
      )}
    </Button>
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
        'sticky top-0 z-[var(--z-header)] w-full border-b transition-all duration-150',
        isScrolled
          ? 'border-border/50 bg-background/80 shadow-sm backdrop-blur-xl'
          : 'border-transparent bg-background'
      )}
      role="banner"
    >
      <div className="container-default">
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
          <div className="hidden lg:flex flex-1 max-w-[580px] items-center gap-2">
            <LocationSelector />
            <div className="flex-1">
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
      </div>
    </header>
  );
}
