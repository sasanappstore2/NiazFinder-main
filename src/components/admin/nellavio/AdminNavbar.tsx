'use client';

import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
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

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-(--color-mainBorder) bg-(--color-primaryBg)/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-(--admin-content-max) items-center gap-3 px-3 sm:px-4 lg:px-6">
        <button
          type="button"
          className="admin-icon-btn xl:hidden"
          onClick={toggleNavPanel}
          aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <div className="relative hidden min-w-0 flex-1 md:block md:max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-(--color-secondaryText)" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در پنل..."
            className="admin-input h-10 pr-10"
          />
        </div>

        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="truncate text-sm font-semibold">{currentItem?.label ?? 'سوپرادمین'}</p>
          <p className="truncate text-[11px] text-(--color-secondaryText)">{currentItem?.description}</p>
        </div>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" className="hidden size-9 sm:flex" aria-label="بازه زمانی">
            <Calendar className="size-4" />
          </Button>

          <button type="button" className="admin-icon-btn" onClick={toggleTheme} aria-label="تم">
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <Button variant="ghost" size="icon" className="relative size-9" aria-label="اعلان‌ها">
            <Bell className="size-4" />
            <span className="absolute left-1.5 top-1.5 size-2 rounded-full bg-(--color-mainColor)" />
          </Button>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 border-(--color-mainBorder) sm:flex"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="admin-user-chip">
                <div className="flex size-8 items-center justify-center rounded-full bg-(--color-logoBg) text-xs font-bold text-white">
                  {displayName.slice(0, 1)}
                </div>
                <span className="hidden max-w-24 truncate text-sm font-medium sm:inline">{displayName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={ADMIN_SECTION_ROUTES.settings} className="flex items-center gap-2">
                  <Settings className="size-4" />
                  تنظیمات
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <User className="size-4" />
                {me?.isOwner ? 'مالک' : 'کارمند'}
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
