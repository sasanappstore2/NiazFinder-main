'use client';

import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Bell,
  ChevronLeft,
  Menu,
  Moon,
  RefreshCcw,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { SUPER_ADMIN_NAV } from '@/config/super-admin-nav';
import { ADMIN_SECTION_ROUTES, sectionFromPathname } from '@/config/admin-routes';
import { useAdminLayout } from '@/components/admin/context/AdminLayoutContext';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AdminNavbar({
  onRefresh,
  isRefreshing,
}: {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const pathname = usePathname();
  const section = sectionFromPathname(pathname);
  const { theme, toggleTheme, mobileMenuOpen, toggleNavPanel } = useAdminLayout();
  const { me } = useAdmin();
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const [search, setSearch] = useState('');

  const currentItem = useMemo(
    () => SUPER_ADMIN_NAV.flatMap((g) => g.items).find((i) => i.id === section),
    [section]
  );

  const displayName =
    me?.user.displayName ||
    `${me?.user.firstName ?? ''} ${me?.user.lastName ?? ''}`.trim() ||
    'کاربر';

  const PageIcon = currentItem?.icon;

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-(--color-mainBorder) bg-(--color-primaryBg)/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="admin-header-accent" />
      <div className="mx-auto flex h-[3.75rem] max-w-(--admin-content-max) items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-8">
        <button
          type="button"
          className="admin-icon-btn lg:hidden"
          onClick={toggleNavPanel}
          aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
          {PageIcon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--color-mainColorMuted) text-(--color-coloredText)">
              <PageIcon className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <nav aria-label="مسیر" className="admin-breadcrumb mb-0.5 flex items-center gap-1 text-[11px] text-(--color-tertiaryText)">
              <Link href={ADMIN_SECTION_ROUTES.overview}>سوپرادمین</Link>
              <ChevronLeft className="size-3 opacity-40" aria-hidden />
              <span className="text-(--color-secondaryText)">{currentItem?.label ?? 'پنل'}</span>
            </nav>
            <p className="truncate text-sm font-semibold leading-tight">
              {currentItem?.label ?? 'سوپرادمین'}
            </p>
          </div>
        </div>

        <div className="relative hidden min-w-0 flex-1 lg:block lg:max-w-sm xl:max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-(--color-tertiaryText)" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در پنل مدیریت..."
            className="admin-input h-9 border-(--color-inputBorder) bg-(--color-inputBg) pr-10 text-sm"
          />
        </div>

        <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            className="admin-icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'تم روشن' : 'تم تیره'}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <Button variant="ghost" size="icon" className="relative size-9 text-(--color-secondaryText)" aria-label="اعلان‌ها">
            <Bell className="size-4" />
            <span className="absolute left-2 top-2 size-2 rounded-full bg-(--color-mainColor) ring-2 ring-(--color-primaryBg)" />
          </Button>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 gap-1.5 border-(--color-mainBorder) bg-transparent px-2.5 text-xs sm:flex"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">بروزرسانی</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="admin-user-chip ms-1">
                <div className="admin-sidebar-brand flex size-8 items-center justify-center rounded-full text-xs font-bold text-white">
                  {displayName.slice(0, 1)}
                </div>
                <span className="hidden max-w-[7rem] truncate text-sm font-medium sm:inline">{displayName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="border-b border-border px-3 py-2">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{me?.isOwner ? 'مالک پلتفرم' : 'کارمند'}</p>
              </div>
              <DropdownMenuItem asChild>
                <Link href={ADMIN_SECTION_ROUTES.settings} className="flex items-center gap-2">
                  <Settings className="size-4" />
                  تنظیمات
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <User className="size-4" />
                پروفایل
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAuthModalOpen(true)}>ورود / خروج</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
