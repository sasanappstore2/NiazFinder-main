'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  Database,
  Globe2,
  ListChecks,
  Users,
  Wallet,
} from 'lucide-react';
import { useAdminDashboardData } from '@/components/admin/hooks/useAdminData';
import {
  AdminChartCard,
  AdminKpiCard,
  AdminKpiSkeleton,
  AdminPageShell,
} from '@/components/admin/ui';
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';
import { formatNumber, ratio } from '@/components/admin/modules/shared/formatters';
import { formatShortDate } from '@/components/admin/modules/shared/formatters';
import { cn } from '@/lib/utils';

const CHART_TABS = [
  { id: 'growth', label: 'رشد' },
  { id: 'users', label: 'کاربران' },
  { id: 'market', label: 'بازار' },
] as const;

type ChartTab = (typeof CHART_TABS)[number]['id'];

const tooltipStyle = {
  background: 'var(--color-primaryBg)',
  border: '1px solid var(--color-mainBorder)',
  borderRadius: 8,
  fontSize: 12,
};

export function OverviewPanel() {
  const { overview, analytics, isLoading } = useAdminDashboardData();
  const [chartTab, setChartTab] = useState<ChartTab>('growth');

  const activeUserRatio = ratio(overview?.activeUsers, overview?.totalUsers);
  const openRequestRatio = ratio(overview?.openRequests, overview?.totalRequests);

  if (isLoading) {
    return (
      <AdminPageShell section="overview" layout="dashboard">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminKpiSkeleton key={i} />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  const timeline = analytics?.timeline ?? [];
  const requestStatus = analytics?.requestStatus ?? [];
  const userRoles = analytics?.userRoles ?? [];
  const topCategories = analytics?.topCategories?.slice(0, 5) ?? [];
  const activities = analytics?.recentActivity?.slice(0, 5) ?? [];

  const quickLinks = [
    { label: 'نیازهای باز', href: ADMIN_SECTION_ROUTES.requests, value: formatNumber(overview?.openRequests) },
    { label: 'کاربران', href: ADMIN_SECTION_ROUTES.users, value: formatNumber(overview?.totalUsers) },
    { label: 'دسته‌بندی‌ها', href: ADMIN_SECTION_ROUTES.categories, value: formatNumber(overview?.totalCategories) },
  ];

  return (
    <AdminPageShell
      section="overview"
      layout="dashboard"
      title="داشبورد"
      description="آمار کلیدی، نمودارها و فعالیت اخیر"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="کاربران"
          value={formatNumber(overview?.totalUsers)}
          change={Math.round(activeUserRatio)}
          changeLabel="فعال"
          icon={<Users className="size-5" />}
        />
        <AdminKpiCard
          title="نیازها"
          value={formatNumber(overview?.totalRequests)}
          change={Math.round(openRequestRatio)}
          changeLabel="باز"
          icon={<ListChecks className="size-5" />}
          accent="sky"
        />
        <AdminKpiCard
          title="پیشنهادها"
          value={formatNumber(overview?.totalProposals)}
          icon={<Database className="size-5" />}
          accent="violet"
        />
        <AdminKpiCard
          title="تراکنش‌ها"
          value={formatNumber(overview?.totalTransactions)}
          changeLabel={`${formatNumber(overview?.locations.activeCities)} شهر فعال`}
          icon={<Wallet className="size-5" />}
          accent="amber"
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <AdminChartCard
          className="lg:col-span-2"
          title="روند ۱۲ ماهه"
          description="تغییر شاخص‌ها در بازه زمانی"
          actions={
            <div className="flex gap-1">
              {CHART_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setChartTab(t.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    chartTab === t.id
                      ? 'bg-(--color-navItemActiveBg) text-(--color-coloredText)'
                      : 'text-(--color-secondaryText) hover:bg-(--color-navItemBgHover)'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-mainColor)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-mainColor)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-mainBorder)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--color-secondaryText)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-secondaryText)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                {chartTab === 'growth' && (
                  <>
                    <Area type="monotone" dataKey="users" stroke="var(--color-mainColor)" fill="url(#dashGrad)" strokeWidth={2} name="کاربر" />
                    <Area type="monotone" dataKey="requests" stroke="#5385c6" fill="transparent" strokeWidth={2} name="نیاز" />
                  </>
                )}
                {chartTab === 'users' && (
                  <Area type="monotone" dataKey="users" stroke="#5385c6" fill="#5385c6" fillOpacity={0.12} strokeWidth={2} name="کاربر" />
                )}
                {chartTab === 'market' && (
                  <>
                    <Area type="monotone" dataKey="requests" stroke="var(--color-mainColor)" fill="url(#dashGrad)" strokeWidth={2} name="نیاز" />
                    <Area type="monotone" dataKey="proposals" stroke="#a855f7" fill="transparent" strokeWidth={2} name="پیشنهاد" />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminChartCard>

        <AdminChartCard title="وضعیت نیازها" description="توزیع وضعیت ثبت‌شده">
          <div className="flex h-52 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={requestStatus} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2}>
                  {requestStatus.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || ['#3db985', '#5385c6', '#f59e0b', '#ef4444'][i % 4]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AdminChartCard>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <AdminChartCard title="نقش کاربران" description="توزیع نقش‌های ثبت‌شده">
          <div className="flex h-44 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={userRoles} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={72}>
                  {userRoles.map((e, i) => (
                    <Cell key={e.name} fill={e.color || ['#3db985', '#5385c6', '#f59e0b', '#64748b'][i % 4]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AdminChartCard>

        <AdminChartCard title="دسته‌های پرتقاضا" description="بر اساس حجم نیاز">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCategories} layout="vertical" margin={{ left: 4, right: 8 }}>
                <CartesianGrid stroke="var(--color-mainBorder)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--color-secondaryText)', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fill: 'var(--color-secondaryText)', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="requests" fill="var(--color-mainColor)" radius={[0, 4, 4, 0]} name="نیاز" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminChartCard>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <AdminChartCard className="lg:col-span-2" title="فعالیت اخیر" description="آخرین رویدادهای عملیاتی">
          <div className="max-h-44 space-y-1.5 overflow-y-auto">
            {activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-(--color-secondaryText)">فعالیتی ثبت نشده</p>
            ) : (
              activities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-2.5 rounded-lg border border-(--color-mainBorder) px-3 py-2 transition-colors hover:bg-(--color-tableRowBgHover)"
                >
                  <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-(--color-mainColor)" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{a.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-(--color-secondaryText)">{a.description}</p>
                    <p className="mt-0.5 text-[10px] text-(--color-secondaryText)">
                      {formatShortDate(a.createdAt)} · {a.meta}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminChartCard>

        <div className="flex flex-col gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-1 items-center justify-between rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg) px-4 py-3 transition-all hover:border-(--color-coloredText)/30 hover:shadow-sm"
            >
              <div>
                <p className="text-xs text-(--color-secondaryText)">{link.label}</p>
                <p className="mt-0.5 font-semibold">{link.value}</p>
              </div>
              <ArrowUpRight className="size-4 text-(--color-secondaryText) transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-(--color-coloredText)" />
            </Link>
          ))}
          <Link
            href={ADMIN_SECTION_ROUTES.locations}
            className="group flex items-center justify-between rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg) px-4 py-3 transition-all hover:border-(--color-coloredText)/30 hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Globe2 className="size-4 text-(--color-coloredText)" />
              <span className="text-sm font-medium">مکان‌ها</span>
            </div>
            <ArrowUpRight className="size-4 text-(--color-secondaryText)" />
          </Link>
        </div>
      </div>
    </AdminPageShell>
  );
}
