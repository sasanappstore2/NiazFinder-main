'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { SUPER_ADMIN_NAV } from '@/config/super-admin-nav';
import { sectionFromPathname, canAccessAdminNavItem } from '@/config/admin-routes';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { useAdminLayout } from '@/components/admin/context/AdminLayoutContext';
import { useAdminOverview } from '@/components/admin/hooks/useAdminData';
import { useModerationStats } from '@/components/admin/hooks/useModerationStats';
import { useAppStore } from '@/lib/store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AdminSideMenu() {
  const pathname = usePathname();
  const activeSection = sectionFromPathname(pathname);
  const { me, hasPermission } = useAdmin();
  const { sidebarCollapsed, toggleSidebar, theme } = useAdminLayout();
  const { overview } = useAdminOverview();
  const { pending: moderationPending } = useModerationStats();
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  const nav = useMemo(() => {
    return SUPER_ADMIN_NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessAdminNavItem(item.id, hasPermission)),
    })).filter((group) => group.items.length > 0);
  }, [hasPermission]);

  const badgeFor = (id: string) => {
    if (id === 'requests' && moderationPending > 0) return moderationPending;
    if (id === 'requests' && overview?.openRequests) return overview.openRequests;
    return null;
  };

  const displayName =
    me?.user.displayName ||
    `${me?.user.firstName ?? ''} ${me?.user.lastName ?? ''}`.trim() ||
    'حساب کاربری';

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={`hidden shrink-0 self-stretch border-l border-(--color-mainBorder) bg-(--color-navigationBg)/95 backdrop-blur-xl transition-[width] duration-200 ease-out lg:flex lg:h-full lg:max-h-dvh lg:flex-col ${
          sidebarCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64 xl:w-[17rem]'
        }`}
      >
        <div className="admin-header-accent shrink-0" />

        <div
          className={`flex h-[4.25rem] shrink-0 items-center border-b border-(--color-mainBorder) ${
            sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'
          }`}
        >
          <div className="admin-sidebar-brand flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ring-2 ring-white/10">
            <LayoutDashboard className="size-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="admin-brand-title truncate">نیازفایندر</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="admin-brand-subtitle truncate">مرکز فرماندهی</p>
                <span className="admin-env-pill shrink-0">Live</span>
              </div>
            </div>
          )}
        </div>

        <nav aria-label="ناوبری سوپرادمین" className="flex-1 space-y-5 overflow-x-hidden overflow-y-auto p-3">
          {nav.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <div className="admin-section-label mb-2 px-3">{group.label}</div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`) ||
                    (item.id === 'overview' && activeSection === 'analytics');
                  const badge = badgeFor(item.id);
                  const link = (
                    <Link
                      href={item.href}
                      className={`admin-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 ${
                        active
                          ? 'admin-nav-item-active'
                          : 'text-(--color-navItemText) hover:bg-(--color-navItemBgHover) hover:text-(--color-navItemTextActive)'
                      } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                    >
                      {active && <span className="admin-nav-rail" aria-hidden />}
                      <Icon className="relative z-1 size-[1.125rem] shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="relative z-1 flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{item.label}</span>
                            {badge !== null && badge > 0 && (
                              <span className="shrink-0 rounded-full bg-(--color-mainColor) px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                {badge > 99 ? '99+' : badge.toLocaleString('fa-IR')}
                              </span>
                            )}
                          </span>
                          {item.description && (
                            <span className="truncate text-[11px] leading-snug text-(--color-tertiaryText)">
                              {item.description}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                  );

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className={`admin-tooltip admin-tooltip-${theme} max-w-[200px]`}
                        >
                          <p className="font-medium">{item.label}</p>
                          {item.description && (
                            <p className="admin-tooltip-desc mt-0.5 text-[11px] leading-snug">{item.description}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return <div key={item.id}>{link}</div>;
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-(--color-mainBorder) p-3">
          {!sidebarCollapsed && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-(--color-cardBorder) bg-(--color-navItemActiveBg) p-3">
              <div className="admin-sidebar-brand flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="text-[11px] text-(--color-secondaryText)">
                  {me?.isOwner ? 'مالک پلتفرم' : 'کارمند · RBAC'}
                </p>
              </div>
            </div>
          )}
          <div className={`flex gap-1 ${sidebarCollapsed ? 'flex-col items-center' : ''}`}>
            <button
              type="button"
              onClick={toggleSidebar}
              className="admin-icon-btn"
              aria-label={sidebarCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="admin-icon-btn"
              aria-label="ورود یا خروج"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
