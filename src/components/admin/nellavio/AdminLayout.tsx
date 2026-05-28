'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { LayoutDashboard, X } from 'lucide-react';
import { SUPER_ADMIN_NAV } from '@/config/super-admin-nav';
import { sectionFromPathname, canAccessAdminNavItem } from '@/config/admin-routes';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { useAdminLayout } from '@/components/admin/context/AdminLayoutContext';
import { AdminSideMenu } from './AdminSideMenu';
import { AdminNavbar } from './AdminNavbar';

export const ADMIN_CONTENT_MAX = '90rem';

export function AdminLayout({
  children,
  onRefresh,
  isRefreshing,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const pathname = usePathname();
  const activeSection = sectionFromPathname(pathname);
  const { hasPermission } = useAdmin();
  const { theme, mobileMenuOpen, setMobileMenuOpen } = useAdminLayout();

  const nav = useMemo(() => {
    return SUPER_ADMIN_NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessAdminNavItem(item.id, hasPermission)),
    })).filter((group) => group.items.length > 0);
  }, [hasPermission]);

  return (
    <div
      className={`admin-nellavio admin-nellavio-${theme} flex min-h-screen min-h-dvh w-full overflow-x-hidden`}
      dir="rtl"
      style={{ ['--admin-content-max' as string]: ADMIN_CONTENT_MAX }}
    >
      <div className="admin-bg-mesh" aria-hidden />
      <div className="admin-bg-grid" aria-hidden />

      <div className="admin-shell-layer flex min-h-0 w-full min-w-0 flex-1">
        <AdminSideMenu />

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-100 lg:hidden">
            <div
              className="absolute inset-0 bg-(--color-overlayBg) backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden
            />
            <aside className="admin-mobile-drawer absolute inset-y-0 right-0 flex w-[min(88vw,20rem)] flex-col border-l border-(--color-mainBorder) bg-(--color-navigationBg)">
              <div className="admin-header-accent shrink-0" />
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-(--color-mainBorder) px-4">
                <div className="flex items-center gap-2.5">
                  <div className="admin-sidebar-brand flex size-9 items-center justify-center rounded-lg text-white shadow-md">
                    <LayoutDashboard className="size-4" />
                  </div>
                  <div>
                    <span className="admin-brand-title block">نیازفایندر</span>
                    <span className="admin-brand-subtitle">مرکز فرماندهی</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-icon-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="بستن منو"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3">
                {nav.map((group) => (
                  <div key={group.label} className="mb-5">
                    <div className="admin-section-label mb-2 px-3">{group.label}</div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`) ||
                        (item.id === 'overview' && activeSection === 'analytics');
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                            active
                              ? 'admin-nav-item-active'
                              : 'text-(--color-navItemText) hover:bg-(--color-navItemBgHover) hover:text-(--color-navItemTextActive)'
                          }`}
                        >
                          {active && <span className="admin-nav-rail" aria-hidden />}
                          <Icon className="relative z-1 size-4 shrink-0" />
                          <span className="relative z-1 min-w-0 flex-1">
                            <span className="block text-sm font-medium">{item.label}</span>
                            {item.description && (
                              <span className="mt-0.5 block truncate text-[11px] opacity-70">{item.description}</span>
                            )}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </aside>
          </div>
        )}

        <div className="admin-main-content flex min-h-0 min-w-0 flex-1 flex-col">
          <AdminNavbar onRefresh={onRefresh} isRefreshing={isRefreshing} />
          <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="admin-content-zone mx-auto w-full max-w-(--admin-content-max) px-3 py-5 sm:px-5 lg:px-8 lg:py-7">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
