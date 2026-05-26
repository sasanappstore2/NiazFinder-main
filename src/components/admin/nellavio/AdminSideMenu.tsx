'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { Crown, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  const { sidebarCollapsed, toggleSidebar } = useAdminLayout();
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
        className={`hidden shrink-0 border-l border-(--color-mainBorder) bg-(--color-navigationBg) transition-[width] duration-200 ease-out lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:h-dvh ${
          sidebarCollapsed ? 'lg:w-18' : 'lg:w-60 xl:w-64'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-(--color-mainBorder) px-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: 'var(--color-logoBg)' }}>
            <Crown className="size-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">NiazFinder</p>
              <p className="truncate text-[11px] text-(--color-secondaryText)">Enterprise Admin</p>
            </div>
          )}
        </div>

        <nav aria-label="ناوبری سوپرادمین" className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3">
          {nav.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-(--color-navSectionTitle)">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id || (item.id === 'overview' && activeSection === 'analytics');
                  const badge = badgeFor(item.id);
                  const link = (
                    <Link
                      href={item.href}
                      className={`admin-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 ${
                        active
                          ? 'admin-nav-item-active bg-(--color-navItemActiveBg)'
                          : 'text-(--color-navItemText) hover:bg-(--color-navItemBgHover) hover:text-(--color-navItemTextActive)'
                      } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                    >
                      {active && <span className="admin-nav-rail" aria-hidden />}
                      <Icon className="relative z-1 size-4 shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="relative z-1 flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{item.label}</span>
                          {badge !== null && badge > 0 && (
                            <span className="rounded-full bg-(--color-mainColor) px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {badge > 99 ? '99+' : badge.toLocaleString('fa-IR')}
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
                        <TooltipContent side="left">{item.label}</TooltipContent>
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
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-(--color-navItemActiveBg) p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--color-logoBg) text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="text-[11px] text-(--color-secondaryText)">{me?.isOwner ? 'مالک پلتفرم' : 'کارمند'}</p>
              </div>
            </div>
          )}
          <div className={`flex gap-1 ${sidebarCollapsed ? 'flex-col items-center' : ''}`}>
            <button type="button" onClick={toggleSidebar} className="admin-icon-btn" aria-label={sidebarCollapsed ? 'باز کردن' : 'جمع کردن'}>
              {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
            <button type="button" onClick={() => setAuthModalOpen(true)} className="admin-icon-btn" aria-label="خروج">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
