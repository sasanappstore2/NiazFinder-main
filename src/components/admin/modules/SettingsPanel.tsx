'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  FolderTree,
  Globe2,
  Loader2,
  MapPinned,
  Moon,
  RefreshCcw,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { useAdminLayout } from '@/components/admin/context/AdminLayoutContext';
import { AdminKpiCard, AdminKpiSkeleton, AdminPageShell } from '@/components/admin/ui';
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type OverviewStats = {
  totalUsers: number;
  bannedUsers: number;
  totalCategories: number;
  inactiveCategories: number;
  locations: {
    activeCities: number;
    activeNeighborhoods: number;
  };
};

type SystemSettings = {
  chatEnabled: boolean;
  voiceEnabled: boolean;
  maintenanceMode: boolean;
};

export function SettingsPanel() {
  const { apiFetch, me } = useAdmin();
  const { theme, setTheme } = useAdminLayout();
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewRes, settingsRes] = await Promise.all([
        apiFetch<{ stats: OverviewStats }>('/api/super-admin/overview'),
        apiFetch<{ settings: SystemSettings }>('/api/super-admin/settings').catch(() => null),
      ]);
      setOverview(overviewRes.stats);
      if (settingsRes) setSystemSettings(settingsRes.settings);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  const saveSettings = async (patch: Partial<SystemSettings>) => {
    try {
      const res = await apiFetch<{ settings: SystemSettings }>('/api/super-admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setSystemSettings(res.settings);
      toast.success('تنظیمات ذخیره شد');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [load]);

  const shortcuts = [
    {
      label: 'نقش‌ها و دسترسی‌ها',
      description: 'مدیریت RBAC و کارمندان',
      href: ADMIN_SECTION_ROUTES.system,
      icon: ShieldCheck,
    },
    {
      label: 'دسته‌بندی‌ها',
      description: 'ساختار خدمات و فیلترها',
      href: ADMIN_SECTION_ROUTES.categories,
      icon: FolderTree,
    },
    {
      label: 'مکان‌ها',
      description: 'استان، شهر و محله',
      href: ADMIN_SECTION_ROUTES.locations,
      icon: MapPinned,
    },
    {
      label: 'داشبورد',
      description: 'آمار و نمودارهای عملیاتی',
      href: ADMIN_SECTION_ROUTES.overview,
      icon: Globe2,
    },
  ];

  if (isLoading && !overview) {
    return (
      <AdminPageShell section="settings" layout="form">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminKpiSkeleton key={i} />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      section="settings"
      layout="form"
      description="پیکربندی ظاهر پنل و میانبرهای مدیریتی"
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
          <RefreshCcw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="کاربران"
          value={(overview?.totalUsers ?? 0).toLocaleString('fa-IR')}
          changeLabel={`${(overview?.bannedUsers ?? 0).toLocaleString('fa-IR')} مسدود`}
          icon={<ShieldCheck className="size-5" />}
        />
        <AdminKpiCard
          title="دسته‌بندی‌ها"
          value={(overview?.totalCategories ?? 0).toLocaleString('fa-IR')}
          changeLabel={`${(overview?.inactiveCategories ?? 0).toLocaleString('fa-IR')} غیرفعال`}
          icon={<FolderTree className="size-5" />}
          accent="amber"
        />
        <AdminKpiCard
          title="شهرهای فعال"
          value={(overview?.locations.activeCities ?? 0).toLocaleString('fa-IR')}
          changeLabel="پوشش جغرافیایی"
          icon={<MapPinned className="size-5" />}
          accent="blue"
        />
        <AdminKpiCard
          title="نقش شما"
          value={me?.isOwner ? 'مالک' : 'کارمند'}
          changeLabel={me?.user.phone ?? '—'}
          icon={<ShieldCheck className="size-5" />}
          accent="violet"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg) p-5">
          <h2 className="text-base font-semibold">ظاهر پنل</h2>
          <p className="mt-1 text-sm text-(--color-secondaryText)">تم تاریک یا روشن — فقط در سوپرادمین</p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-(--color-mainBorder) p-4">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="size-5 text-(--color-coloredText)" /> : <Sun className="size-5 text-(--color-coloredText)" />}
                <div>
                  <p className="font-semibold">{theme === 'dark' ? 'تم تاریک' : 'تم روشن'}</p>
                  <p className="text-xs text-(--color-secondaryText)">انتخاب شما ذخیره می‌شود</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="admin-theme" className="text-xs text-(--color-secondaryText)">
                  {theme === 'dark' ? 'تاریک' : 'روشن'}
                </Label>
                <Switch
                  id="admin-theme"
                  checked={theme === 'light'}
                  onCheckedChange={(checked) => setTheme(checked ? 'light' : 'dark')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`rounded-lg border p-3 text-right transition-colors ${
                  theme === 'dark'
                    ? 'border-(--color-coloredText) bg-(--color-coloredText)/10'
                    : 'border-(--color-mainBorder) hover:bg-(--color-navItemBgHover)'
                }`}
              >
                <Moon className="mb-2 size-4" />
                <p className="text-sm font-semibold">تاریک</p>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`rounded-lg border p-3 text-right transition-colors ${
                  theme === 'light'
                    ? 'border-(--color-coloredText) bg-(--color-coloredText)/10'
                    : 'border-(--color-mainBorder) hover:bg-(--color-navItemBgHover)'
                }`}
              >
                <Sun className="mb-2 size-4" />
                <p className="text-sm font-semibold">روشن</p>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg) p-5">
          <h2 className="text-base font-semibold">عملیات سریع</h2>
          <p className="mt-1 text-sm text-(--color-secondaryText)">میانبر به بخش‌های پرکاربرد</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-lg border border-(--color-mainBorder) p-3 transition-colors hover:bg-(--color-navItemBgHover)"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--color-coloredText)/10 text-(--color-coloredText)">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-xs text-(--color-secondaryText)">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {systemSettings && (
        <div className="mt-4 rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg) p-5">
          <h2 className="text-base font-semibold">تنظیمات سیستم</h2>
          <p className="mt-1 text-sm text-(--color-secondaryText)">feature flags و حالت maintenance</p>
          <div className="mt-4 space-y-3">
            {([
              ['chatEnabled', 'چت فعال'],
              ['voiceEnabled', 'تماس صوتی فعال'],
              ['maintenanceMode', 'حالت maintenance'],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-(--color-mainBorder) p-3">
                <span className="text-sm">{label}</span>
                <Switch
                  checked={Boolean(systemSettings[key])}
                  onCheckedChange={(checked) => saveSettings({ [key]: checked })}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
