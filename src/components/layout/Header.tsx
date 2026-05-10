'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LocateFixed,
  Search,
  Bell,
  MessageSquare,
  Menu,
  User,
  LogOut,
  LayoutDashboard,
  X,
  Bookmark,
  FileText,
  CreditCard,
  Gift,
  GitCompareArrows,
  ChevronLeft,
  Settings,
} from 'lucide-react';

import { ThemeToggle } from '@/components/shared/ThemeToggle';

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

// ============ Navigation Items ============
interface NavItem {
  label: string;
  view: AppView;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'صفحه اصلی', view: 'home' },
  { label: 'ثبت نیاز', view: 'post-need' },
  { label: 'متخصص‌ها', view: 'browse-specialists' },
  { label: 'نیازها', view: 'browse-requests' },
];

// ============ Mobile Nav Item ============
function MobileNavItem({ item, onSelect }: { item: NavItem; onSelect: () => void }) {
  const { currentView, navigateTo } = useAppStore();
  const isActive = currentView === item.view;

  return (
    <button
      onClick={() => {
        navigateTo(item.view);
        onSelect();
      }}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <span className="text-base">{item.label}</span>
    </button>
  );
}

// ============ Search Bar ============
function SearchBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <div className="relative flex items-center">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <Input
              type="text"
              placeholder="جستجو در خدمات..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border-0 bg-muted/80 ps-4 pe-10 text-sm backdrop-blur-sm focus-visible:bg-muted"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setIsExpanded((prev) => !prev);
          if (isExpanded) setQuery('');
        }}
        className="size-9 text-muted-foreground hover:text-foreground"
        aria-label={isExpanded ? 'بستن جستجو' : 'جستجو'}
      >
        {isExpanded ? <X className="size-4" /> : <Search className="size-4" />}
      </Button>
    </div>
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
      aria-label="اعلان‌ها"
    >
      <Bell className="size-4" />
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
  const { navigateTo } = useAppStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigateTo('messages')}
      className="relative size-9 text-muted-foreground hover:text-foreground"
      aria-label="پیام‌ها"
    >
      <MessageSquare className="size-4" />
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
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ورود
      </Button>
      <Button
        size="sm"
        onClick={handleRegister}
        className="text-sm font-medium"
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

  const initials = currentUser.firstName.charAt(0) + currentUser.lastName.charAt(0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-9 rounded-full p-0">
          <Avatar className="size-8 border-2 border-primary/20">
            <AvatarImage src={currentUser.avatar} alt={currentUser.displayName || `${currentUser.firstName} ${currentUser.lastName}`} />
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
              {currentUser.displayName || `${currentUser.firstName} ${currentUser.lastName}`}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigateTo('profile')}>
            <User className="ms-2 size-4" />
            پروفایل
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigateTo('dashboard')}>
            <LayoutDashboard className="ms-2 size-4" />
            داشبورد
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigateTo('browse-requests')}>
            <Bookmark className="ms-2 size-4" />
            علاقه‌مندی‌ها
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigateTo('dashboard')}>
            <FileText className="ms-2 size-4" />
            پیشنهادها
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigateTo('pricing')}>
            <CreditCard className="ms-2 size-4" />
            تعرفه‌ها
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigateTo('referral')}>
            <Gift className="ms-2 size-4" />
            دعوت از دوستان
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigateTo('compare-specialists')}>
            <GitCompareArrows className="ms-2 size-4" />
            مقایسه متخصص‌ها
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigateTo('notification-settings')}>
            <Settings className="ms-2 size-4" />
            تنظیمات اعلان‌ها
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} variant="destructive">
          <LogOut className="ms-2 size-4" />
          خروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============ Mobile Sheet Content ============
function MobileSheetContent() {
  const { isAuthenticated, currentUser, logout, setAuthModalOpen, setAuthModalTab } = useAppStore();

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
      <nav className="flex flex-col gap-1 p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          منو
        </p>
        {NAV_ITEMS.map((item) => (
          <MobileNavItem key={item.view} item={item} onSelect={() => {}} />
        ))}
      </nav>

      <Separator />

      {/* Quick Actions */}
      <div className="flex flex-col gap-1 p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          دسترسی سریع
        </p>
        <MobileNavItem item={{ label: 'اعلان‌ها', view: 'notifications' }} onSelect={() => {}} />
        <MobileNavItem item={{ label: 'پیام‌ها', view: 'messages' }} onSelect={() => {}} />
        {isAuthenticated && (
          <>
            <MobileNavItem item={{ label: 'داشبورد', view: 'dashboard' }} onSelect={() => {}} />
            <MobileNavItem item={{ label: 'پروفایل', view: 'profile' }} onSelect={() => {}} />
            <MobileNavItem item={{ label: 'علاقه‌مندی‌ها', view: 'browse-requests' }} onSelect={() => {}} />
            <MobileNavItem item={{ label: 'پیشنهادها', view: 'dashboard' }} onSelect={() => {}} />
          </>
        )}
      </div>

      {/* More */}
      <div className="flex flex-col gap-1 p-4">
        <p className="mb-2 flex items-center gap-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          بیشتر
          <ChevronLeft className="size-3" />
        </p>
        <MobileNavItem item={{ label: 'تعرفه‌ها', view: 'pricing' }} onSelect={() => {}} />
        <MobileNavItem item={{ label: 'دعوت از دوستان', view: 'referral' }} onSelect={() => {}} />
        <MobileNavItem item={{ label: 'مقایسه متخصص‌ها', view: 'compare-specialists' }} onSelect={() => {}} />
      </div>

      <div className="mt-auto border-t border-border p-4">
        {isAuthenticated && currentUser ? (
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border-2 border-primary/20">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {currentUser.firstName.charAt(0)}{currentUser.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{currentUser.displayName || `${currentUser.firstName} ${currentUser.lastName}`}</p>
              <p className="text-xs text-muted-foreground">{currentUser.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full" onClick={handleLogin}>
              ورود
            </Button>
            <Button className="w-full" onClick={handleRegister}>
              ثبت‌نام
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Auth Section ============
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
  const { currentView, navigateTo, mobileMenuOpen, setMobileMenuOpen } = useAppStore();

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 10);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'sticky top-0 z-50 w-full border-b transition-all duration-300',
        isScrolled
          ? 'border-border/50 bg-background/80 shadow-sm backdrop-blur-xl'
          : 'border-transparent bg-background'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Right: Logo */}
        <button
          onClick={() => navigateTo('home')}
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
          aria-label={SITE_NAME}
        >
          <LocateFixed className="size-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-primary sm:text-xl">
            {SITE_NAME}
          </span>
        </button>

        {/* Center: Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => navigateTo(item.view)}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="header-active-nav"
                    className="absolute inset-x-1 -bottom-[9px] h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Left: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search Bar - Desktop */}
          <div className="hidden md:block">
            <SearchBar />
          </div>

          {/* Theme Toggle - Desktop */}
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>

          {/* Notifications */}
          <NotificationsButton />

          {/* Messages */}
          <MessagesButton />

          {/* Auth / User */}
          <AuthSection />

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:text-foreground lg:hidden"
                aria-label="منو"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0 sm:w-[360px]">
              <MobileSheetContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}
