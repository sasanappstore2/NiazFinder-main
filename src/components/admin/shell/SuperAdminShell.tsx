'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Crown, LogOut } from 'lucide-react';
import { SUPER_ADMIN_NAV } from '@/config/super-admin-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { SUPER_ADMIN_PHONE, isSuperAdminPhone } from '@/lib/super-admin';

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const currentUser = useAppStore((s) => s.currentUser);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') ?? 'overview';

  const isOwner = Boolean(currentUser?.role === 'SUPER_ADMIN' && isSuperAdminPhone(currentUser.phone));

  const nav = useMemo(() => SUPER_ADMIN_NAV, []);

  return (
    <div className="dark min-h-screen bg-[#050505] text-foreground" dir="rtl">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col lg:min-h-screen lg:flex-row">
        <aside className="lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:shrink-0">
          <div className="flex h-full flex-col border-b border-border/70 bg-[#070707]/95 shadow-2xl lg:border-b-0 lg:border-l">
            <div className="border-b border-border/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                  <Crown className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black">NiazFinder Admin</p>
                  <p className="mt-1 text-xs text-muted-foreground">داشبورد سوپرادمین (تم Nellavio)</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">SUPER_ADMIN</Badge>
                  <Badge variant="outline" dir="ltr">
                    {SUPER_ADMIN_PHONE}
                  </Badge>
                </div>
                <p className="mt-3 text-xs leading-6 text-muted-foreground">
                  ورود کارمندان با OTP انجام می‌شود. دسترسی‌ها در فاز RBAC به‌صورت تیک‌زدنی کنترل می‌شوند.
                </p>
              </div>
            </div>

            <nav aria-label="ناوبری سوپرادمین" className="flex-1 space-y-5 overflow-y-auto p-3">
              {nav.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="px-3 py-2 text-caption font-black uppercase tracking-[0.18em] text-muted-foreground">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeSection === item.id || (item.id === 'overview' && activeSection === 'overview');
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-right transition-colors ${
                          active
                            ? 'bg-emerald-500/15 text-emerald-300 shadow-sm ring-1 ring-emerald-500/25'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black">{item.label}</span>
                          {item.description && (
                            <span className={`mt-1 block truncate text-xs ${active ? 'text-emerald-100/70' : 'text-muted-foreground'}`}>
                              {item.description}
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="mt-auto border-t border-border/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    {currentUser?.displayName || `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'حساب کاربری'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isOwner ? 'مالک پنل' : 'کارمند (RBAC در حال پیاده‌سازی)'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label="ورود/خروج"
                  onClick={() => setAuthModalOpen(true)}
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
              <Separator className="my-4" />
              <div className="text-xs leading-6 text-muted-foreground">
                این Shell فقط اسکلت UI است. ماژول‌ها مرحله‌به‌مرحله به APIهای مدیریت‌شده و RBAC متصل می‌شوند.
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 pb-10 pt-6 lg:px-10">
          {children}
        </section>
      </div>
    </div>
  );
}

