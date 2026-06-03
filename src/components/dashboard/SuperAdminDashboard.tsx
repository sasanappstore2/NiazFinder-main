'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarIcon,
  CheckCircle2,
  CircleDot,
  Command,
  Crown,
  Database,
  Edit3,
  FileText,
  FolderTree,
  Gauge,
  GitBranch,
  Globe2,
  HardDrive,
  Inbox,
  KeyRound,
  Layers3,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  MapPinned,
  MapPin,
  MessageSquare,
  Network,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  Workflow,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { SUPER_ADMIN_PHONE } from '@/lib/super-admin';
import {
  routeForSection,
  toDashboardSection,
  ADMIN_SECTION_PERMISSIONS,
  type AdminSectionId,
} from '@/config/admin-routes';
import { RbacManager } from '@/components/admin/rbac/RbacManager';
import { ChatReviewPanel } from '@/components/admin/chat-review/ChatReviewPanel';
import {
  AdminPanel,
  AdminFormField,
  AdminStatTile,
  AdminToggleRow,
  AdminListCard,
  AdminPanelActions,
} from '@/components/admin/ui';
import { LocationsHierarchyView } from '@/components/admin/locations/LocationsHierarchyView';
import { NeighborhoodLocationForm } from '@/components/admin/locations/NeighborhoodLocationForm';
import {
  NeighborhoodsManagePage,
  type NeighborhoodManageContext,
} from '@/components/admin/locations/NeighborhoodsManagePage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Section =
  | 'overview'
  | 'analytics'
  | 'marketplace'
  | 'crm'
  | 'growth'
  | 'charts'
  | 'requests'
  | 'categories'
  | 'users'
  | 'locations'
  | 'billing'
  | 'messages'
  | 'files'
  | 'workflow'
  | 'calendar'
  | 'settings'
  | 'system';
type LocationType = 'province' | 'city' | 'neighborhood';

interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalRequests: number;
  openRequests: number;
  totalProposals: number;
  totalCategories: number;
  inactiveCategories: number;
  totalReviews: number;
  totalTransactions: number;
  locations: {
    countries: number;
    provinces: number;
    activeProvinces: number;
    cities: number;
    activeCities: number;
    neighborhoods: number;
    activeNeighborhoods: number;
  };
}

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  parentId: string | null;
  order: number;
  isActive: boolean;
  requestCount: number;
  skillCount: number;
  childCount: number;
  children: AdminCategory[];
}

interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  order: number;
}

interface ManagedNeighborhood {
  id: string;
  name: string;
  nameEn?: string;
  areas?: string[];
  isActive: boolean;
  order: number;
}

interface ManagedCity {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  isPopular?: boolean;
  isIsland?: boolean;
  order: number;
  neighborhoods: ManagedNeighborhood[];
}

interface ManagedProvince {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  order: number;
  cities: ManagedCity[];
}

interface ManagedCountry {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  provinces: ManagedProvince[];
}

interface LocationData {
  countries: ManagedCountry[];
  updatedAt: string;
  stats?: OverviewStats['locations'];
}

type TimelineKey = 'users' | 'requests' | 'proposals' | 'transactions' | 'reviews' | 'revenue';
type Tone = 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'slate';

interface AnalyticsTimelinePoint {
  key: string;
  label: string;
  users: number;
  requests: number;
  proposals: number;
  transactions: number;
  reviews: number;
  revenue: number;
}

interface AnalyticsCountGroup {
  name: string;
  label: string;
  value: number;
  color: string;
}

interface AnalyticsTopCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  requests: number;
  skills: number;
  children: number;
  score: number;
}

interface AnalyticsGoal {
  label: string;
  value: number;
  target: number;
  percent: number;
  color: string;
}

interface AnalyticsActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  meta: string;
  createdAt: string;
  tone: Tone;
}

interface AnalyticsNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface AnalyticsCalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  tone: Tone;
  count: number;
}

interface AnalyticsData {
  generatedAt: string;
  timeline: AnalyticsTimelinePoint[];
  requestStatus: AnalyticsCountGroup[];
  proposalStatus: AnalyticsCountGroup[];
  userRoles: AnalyticsCountGroup[];
  transactionStatus: AnalyticsCountGroup[];
  topCategories: AnalyticsTopCategory[];
  goals: AnalyticsGoal[];
  recentActivity: AnalyticsActivity[];
  communications: {
    totalMessages: number;
    unreadMessages: number;
    totalNotifications: number;
    unreadNotifications: number;
    recentNotifications: AnalyticsNotification[];
  };
  calendarEvents: AnalyticsCalendarEvent[];
}

interface CategoryFormState {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  parentId: string;
  order: string;
  isActive: boolean;
}

interface LocationFormState {
  id?: string;
  type: LocationType;
  name: string;
  nameEn: string;
  countryId: string;
  provinceId: string;
  cityId: string;
  order: string;
  isActive: boolean;
  isPopular: boolean;
  isIsland: boolean;
  areasText: string;
}

const initialCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  icon: 'Globe',
  image: '',
  parentId: 'root',
  order: '0',
  isActive: true,
};

const initialLocationForm: LocationFormState = {
  type: 'province',
  name: '',
  nameEn: '',
  countryId: 'iran',
  provinceId: '',
  cityId: '',
  order: '0',
  isActive: true,
  isPopular: false,
  isIsland: false,
  areasText: '',
};

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString('fa-IR');
}

function formatCompactNumber(value: number | undefined) {
  return new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function formatCurrency(value: number | undefined) {
  return `${formatCompactNumber(value)} تومان`;
}

function formatPercent(value: number | undefined) {
  return `${formatNumber(Math.round(value ?? 0))}٪`;
}

function ratio(part: number | undefined, total: number | undefined) {
  if (!part || !total) return 0;
  return Math.min(100, Math.max(0, (part / total) * 100));
}

function formatUpdatedAt(value: string | undefined) {
  if (!value) return 'نامشخص';
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatShortDate(value: string | undefined) {
  if (!value) return 'نامشخص';
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

interface SectionItem {
  id: Section;
  label: string;
  description: string;
  icon: ElementType;
}

const navGroups: Array<{
  label: string;
  items: SectionItem[];
}> = [
  {
    label: 'نمای کلی',
    items: [
      {
        id: 'overview',
        label: 'اتاق فرمان',
        description: 'شاخص‌ها، سلامت عملیاتی و دسترسی‌ها',
        icon: LayoutDashboard,
      },
      {
        id: 'analytics',
        label: 'تحلیل‌ها',
        description: 'روندها، قیف‌ها و کیفیت عملیات',
        icon: BarChart3,
      },
      {
        id: 'marketplace',
        label: 'بازار نیازها',
        description: 'نیازها، پیشنهادها و تعاملات',
        icon: Database,
      },
      {
        id: 'crm',
        label: 'CRM کاربران',
        description: 'کاربران، اعتماد و وضعیت حساب‌ها',
        icon: Users,
      },
      {
        id: 'growth',
        label: 'رشد پلتفرم',
        description: 'ظرفیت سرویس و پوشش بازار',
        icon: Activity,
      },
      {
        id: 'charts',
        label: 'نمودارها',
        description: 'نمای تصویری شاخص‌های کلیدی',
        icon: Gauge,
      },
    ],
  },
  {
    label: 'عملیات',
    items: [
      {
        id: 'requests',
        label: 'نیازها',
        description: 'کنترل وضعیت نیازهای ثبت‌شده',
        icon: ListChecks,
      },
      {
        id: 'categories',
        label: 'معماری خدمات',
        description: 'دسته‌بندی‌ها و زیردسته‌بندی‌ها',
        icon: FolderTree,
      },
      {
        id: 'users',
        label: 'کاربران',
        description: 'نقش‌ها، مسدودی و دسترسی‌ها',
        icon: Users,
      },
      {
        id: 'locations',
        label: 'جغرافیای سرویس',
        description: 'استان، شهر و محله',
        icon: MapPinned,
      },
      {
        id: 'billing',
        label: 'مالی و فاکتورها',
        description: 'تراکنش‌ها، درآمد و تسویه',
        icon: Workflow,
      },
    ],
  },
  {
    label: 'برنامه‌ها',
    items: [
      {
        id: 'messages',
        label: 'پیام‌ها',
        description: 'گفتگوها و اعلان‌های عملیاتی',
        icon: Command,
      },
      {
        id: 'files',
        label: 'فایل‌ها',
        description: 'دارایی‌ها، مدارک و پیوست‌ها',
        icon: Layers3,
      },
      {
        id: 'workflow',
        label: 'کانبان عملیات',
        description: 'کارها، صف‌ها و پیگیری تیمی',
        icon: GitBranch,
      },
      {
        id: 'calendar',
        label: 'تقویم',
        description: 'رویدادها و زمان‌بندی مدیریتی',
        icon: CalendarIcon,
      },
    ],
  },
  {
    label: 'سیستم',
    items: [
      {
        id: 'settings',
        label: 'تنظیمات',
        description: 'پیکربندی، برند و سیاست‌ها',
        icon: Settings2,
      },
      {
        id: 'system',
        label: 'حاکمیت سیستم',
        description: 'دسترسی، سیاست‌ها و عملیات حساس',
        icon: ShieldCheck,
      },
    ],
  },
];

const sectionItems = navGroups.flatMap((group) => group.items);

function getSectionMeta(section: Section) {
  return sectionItems.find((item) => item.id === section) ?? sectionItems[0];
}

function UnauthorizedView() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-red-500/10 text-red-600">
        <Lock className="size-10" />
      </div>
      <h1 className="text-2xl font-black">دسترسی سوپرادمین محدود است</h1>
      <p className="mt-3 leading-7 text-muted-foreground">
        برای ورود به پنل، باید مالک پلتفرم باشید یا نقش کارمند با مجوزهای لازم داشته باشید.
      </p>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <AdminFormField label={label} hint={hint}>{children}</AdminFormField>;
}

const TONE_COLORS: Record<Tone, string> = {
  emerald: '#10b981',
  sky: '#3b82f6',
  amber: '#f59e0b',
  rose: '#ef4444',
  violet: '#a855f7',
  slate: '#64748b',
};

function MetricCard({
  title,
  value,
  valueLabel,
  caption,
  icon: Icon,
  tone = 'emerald',
  trend,
  trendKey = 'requests',
}: {
  title: string;
  value?: number;
  valueLabel?: string;
  caption: string;
  icon: ElementType;
  tone?: Tone;
  trend?: AnalyticsTimelinePoint[];
  trendKey?: TimelineKey;
}) {
  const toneMap = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
    sky: 'border-sky-500/20 bg-sky-500/10 text-sky-600',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-600',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-600',
    slate: 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300',
  }[tone];
  const gradientId = `spark-${tone}-${trendKey}-${title.replace(/[^\w-]/g, '-')}`;

  return (
    <Card className="overflow-hidden rounded-lg border-border/70 bg-card/95 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-black tracking-normal">{valueLabel ?? formatNumber(value)}</p>
          </div>
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${toneMap}`}>
            <Icon className="size-5" />
          </div>
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">{caption}</p>
        {trend && trend.length > 1 && (
          <div className="mt-3 h-12" role="img" aria-label={`روند ${title} در ۱۲ ماه گذشته`}>
            <ChartContainer
              config={{ value: { label: title, color: TONE_COLORS[tone] } }}
              className="h-full w-full"
            >
              <AreaChart data={trend.map((item) => ({ label: item.label, value: item[trendKey] }))}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TONE_COLORS[tone]} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={TONE_COLORS[tone]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={TONE_COLORS[tone]}
                  fill={`url(#${gradientId})`}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Panel({
  title,
  description,
  icon,
  action,
  children,
  className = '',
  variant = 'default',
}: {
  title: string;
  description?: string;
  icon: ElementType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'form' | 'stats';
}) {
  return (
    <AdminPanel
      title={title}
      description={description}
      icon={icon}
      action={action}
      className={className}
      variant={variant}
    >
      {children}
    </AdminPanel>
  );
}

function ProgressRow({
  label,
  value,
  total,
  tone = 'bg-emerald-500',
}: {
  label: string;
  value: number | undefined;
  total: number | undefined;
  tone?: string;
}) {
  const percent = ratio(value, total);

  return (
    <div className="admin-progress-row">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-(--color-secondaryText)">{label}</span>
        <span className="font-bold text-(--color-primaryText)">{formatPercent(percent)}</span>
      </div>
      <div className="admin-progress-row__track">
        <div className={`admin-progress-row__fill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <Badge
      variant={active ? 'default' : 'secondary'}
      className={active ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
    >
      {active ? 'فعال' : 'غیرفعال'}
    </Badge>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone = 'indigo',
}: {
  label: string;
  value: number | undefined;
  icon: ElementType;
  tone?: 'indigo' | 'sky' | 'amber' | 'violet' | 'emerald';
}) {
  return (
    <AdminStatTile label={label} value={formatNumber(value)} icon={icon} tone={tone} />
  );
}

function ActionButton({
  icon: Icon,
  children,
  onClick,
  tone = 'default',
}: {
  icon: ElementType;
  children: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={tone === 'danger' ? 'destructive' : 'outline'}
      className="h-8 rounded-lg px-2.5 text-xs"
      onClick={onClick}
    >
      <Icon className="size-3.5" />
      {children}
    </Button>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      title={label}
      className={`size-8 rounded-lg ${danger ? 'text-red-600 hover:text-red-700' : ''}`}
      onClick={onClick}
    >
      <Icon className="size-4" />
    </Button>
  );
}

function GovernanceItem({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-background text-emerald-600">
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-black">{title}</h3>
        </div>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

interface ModuleMetric {
  title: string;
  value?: number;
  valueLabel?: string;
  caption: string;
  icon: ElementType;
  tone?: Tone;
  trendKey?: TimelineKey;
}

interface ModuleAction {
  label: string;
  description: string;
  icon: ElementType;
  onClick: () => void;
  primary?: boolean;
}

interface ModuleConfig {
  eyebrow: string;
  title: string;
  description: string;
  icon: ElementType;
  metrics: ModuleMetric[];
  actions: ModuleAction[];
  insights: Array<{
    title: string;
    description: string;
    icon: ElementType;
  }>;
}

function ModulePage({
  config,
  progress,
}: {
  config: ModuleConfig;
  progress: Array<{
    label: string;
    value: number | undefined;
    total: number | undefined;
    tone?: string;
  }>;
}) {
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      <Panel
        title={config.title}
        description={config.description}
        icon={Icon}
        action={<Badge variant="outline">{config.eyebrow}</Badge>}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {config.metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="شاخص‌های همگام با سایت" description="این اعداد از داده‌های زنده همین پروژه خوانده می‌شوند." icon={Gauge}>
          <div className="grid gap-5 md:grid-cols-2">
            {progress.map((item) => (
              <ProgressRow key={item.label} {...item} />
            ))}
          </div>
        </Panel>

        <Panel title="کنترل‌های سریع" description="میانبرهای عملیاتی متناسب با همین ماژول." icon={Command}>
          <div className="grid gap-3">
            {config.actions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={`group flex items-center gap-3 rounded-lg border p-3 text-right transition-colors ${
                    action.primary
                      ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
                      : 'border-border/60 bg-muted/20 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                    <ActionIcon className="size-4" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">{action.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.description}</span>
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {config.insights.map((insight) => (
          <GovernanceItem
            key={insight.title}
            title={insight.title}
            description={insight.description}
            icon={insight.icon}
          />
        ))}
      </div>
    </div>
  );
}

interface ChartSeries {
  key: TimelineKey;
  label: string;
  color: string;
}

const defaultSeries: ChartSeries[] = [
  { key: 'users', label: 'کاربران', color: TONE_COLORS.emerald },
  { key: 'requests', label: 'نیازها', color: TONE_COLORS.sky },
  { key: 'proposals', label: 'پیشنهادها', color: TONE_COLORS.violet },
  { key: 'revenue', label: 'درآمد', color: TONE_COLORS.amber },
];

function formatChartValue(value: number | string | undefined, key?: TimelineKey) {
  const numericValue = Number(value ?? 0);
  return key === 'revenue' ? formatCurrency(numericValue) : formatCompactNumber(numericValue);
}

function buildChartConfig(series: ChartSeries[]): ChartConfig {
  return series.reduce<ChartConfig>((config, item) => {
    config[item.key] = { label: item.label, color: item.color };
    return config;
  }, {});
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm leading-7 text-muted-foreground">
      {label}
    </div>
  );
}

function TimelineAreaPanel({
  title,
  description,
  data,
  series,
}: {
  title: string;
  description: string;
  data: AnalyticsTimelinePoint[];
  series: ChartSeries[];
}) {
  if (!data.length) {
    return (
      <Panel title={title} description={description} icon={BarChart3}>
        <EmptyState label="هنوز داده کافی برای رسم روند ۱۲ ماهه وجود ندارد." />
      </Panel>
    );
  }

  return (
    <Panel title={title} description={description} icon={BarChart3} className="min-w-0">
      <div className="mb-3 flex flex-wrap gap-2">
        {series.map((item) => (
          <Badge key={item.key} variant="outline" className="gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </Badge>
        ))}
      </div>
      <div role="img" aria-label={description} className="min-w-0">
        <ChartContainer config={buildChartConfig(series)} className="h-[320px] w-full min-w-0">
          <AreaChart data={data} margin={{ top: 16, right: 12, left: 12, bottom: 0 }}>
            <defs>
              {series.map((item) => (
                <linearGradient key={item.key} id={`trend-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={item.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} />
            <YAxis
              orientation="right"
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            {series.map((item) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                fill={`url(#trend-${item.key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        خلاصه قابل دسترس: این نمودار روند ماهانه {series.map((item) => item.label).join('، ')} را در ۱۲ ماه اخیر نشان می‌دهد.
      </p>
    </Panel>
  );
}

function DonutPanel({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: AnalyticsCountGroup[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Panel title={title} description={description} icon={CircleDot}>
      {!total ? (
        <EmptyState label="هنوز داده‌ای برای این تقسیم‌بندی ثبت نشده است." />
      ) : (
        <div className="grid gap-4">
          <div className="relative h-60" role="img" aria-label={`${title}: ${formatNumber(total)} مورد`}>
            <ChartContainer config={{ value: { label: title, color: TONE_COLORS.emerald } }} className="h-full w-full">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">{formatNumber(total)}</span>
              <span className="text-xs text-muted-foreground">کل موارد</span>
            </div>
          </div>
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate font-bold">{item.label}</span>
                </span>
                <span className="font-black">{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function BarListPanel({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<{ id: string; label: string; value: number; meta: string; color?: string }>;
}) {
  const max = Math.max(...rows.map((item) => item.value), 1);

  return (
    <Panel title={title} description={description} icon={Network}>
      {!rows.length ? (
        <EmptyState label="داده قابل رتبه‌بندی هنوز موجود نیست." />
      ) : (
        <div className="space-y-3">
          {rows.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-black">{item.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, (item.value / max) * 100)}%`,
                    backgroundColor: item.color ?? TONE_COLORS.emerald,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function GoalsPanel({ goals }: { goals: AnalyticsGoal[] }) {
  return (
    <Panel title="اهداف ماهانه" description="پیشرفت شاخص‌های مدیریتی که باید در یک نگاه قابل تصمیم‌گیری باشند." icon={Gauge}>
      {!goals.length ? (
        <EmptyState label="هدف عملیاتی هنوز از API دریافت نشده است." />
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-black">{goal.label}</span>
                <span className="text-xs font-bold text-muted-foreground">{formatPercent(goal.percent)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, goal.percent))}%`, backgroundColor: goal.color }}
                />
              </div>
              <div className="flex justify-between text-caption text-muted-foreground">
                <span>{formatNumber(goal.value)}</span>
                <span>هدف: {formatNumber(goal.target)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ActivityPanel({ activities }: { activities: AnalyticsActivity[] }) {
  const toneClass: Record<Tone, string> = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
    slate: 'bg-slate-500',
  };

  return (
    <Panel title="جریان فعالیت زنده" description="آخرین نیازها، کاربران، پیشنهادها و تراکنش‌ها در یک فید مدیریتی." icon={Activity}>
      {!activities.length ? (
        <EmptyState label="فعالیت جدیدی برای نمایش وجود ندارد." />
      ) : (
        <div className="space-y-2">
          {activities.slice(0, 8).map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${toneClass[item.tone] ?? toneClass.slate}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-black">{item.title}</h3>
                  <span className="text-caption text-muted-foreground">{formatShortDate(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                <p className="mt-1 text-caption text-muted-foreground">{item.meta}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function HorizontalAnalyticsChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; value: number; fill: string }>;
}) {
  if (!data.length) {
    return (
      <Panel title={title} description={description} icon={BarChart3}>
        <EmptyState label="داده کافی برای نمودار ستونی وجود ندارد." />
      </Panel>
    );
  }

  return (
    <Panel title={title} description={description} icon={BarChart3}>
      <div role="img" aria-label={description}>
        <ChartContainer config={{ value: { label: title, color: TONE_COLORS.emerald } }} className="h-[300px] w-full">
          <RechartsBarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid horizontal={false} strokeDasharray="4 4" />
            <XAxis type="number" hide />
            <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={90} orientation="right" />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="value" radius={[8, 8, 8, 8]} isAnimationActive={false}>
              {data.map((item) => (
                <Cell key={item.label} fill={item.fill} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ChartContainer>
      </div>
    </Panel>
  );
}

function CommandCenterPage({
  overview,
  analytics,
  rootCategoryCount,
  childCategoryCount,
  activeUserRatio,
  activeCityRatio,
  activeNeighborhoodRatio,
}: {
  overview: OverviewStats | null;
  analytics: AnalyticsData | null;
  rootCategoryCount: number;
  childCategoryCount: number;
  activeUserRatio: number;
  activeCityRatio: number;
  activeNeighborhoodRatio: number;
}) {
  const topCategoryRows = (analytics?.topCategories ?? []).map((item, index) => ({
    id: item.id,
    label: item.name,
    value: item.score,
    meta: `${formatNumber(item.requests)} نیاز · ${formatNumber(item.children)} زیردسته`,
    color: [TONE_COLORS.emerald, TONE_COLORS.sky, TONE_COLORS.violet, TONE_COLORS.amber][index % 4],
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="کل کاربران" value={overview?.totalUsers} caption={`${formatPercent(activeUserRatio)} کاربر فعال`} icon={Users} tone="emerald" trend={analytics?.timeline} trendKey="users" />
        <MetricCard title="نیازهای ثبت‌شده" value={overview?.totalRequests} caption={`${formatNumber(overview?.openRequests)} نیاز باز`} icon={Database} tone="sky" trend={analytics?.timeline} trendKey="requests" />
        <MetricCard title="معماری دسته‌بندی" value={overview?.totalCategories} caption={`${formatNumber(childCategoryCount)} زیردسته عملیاتی`} icon={Network} tone="violet" trend={analytics?.timeline} trendKey="proposals" />
        <MetricCard title="شهرهای فعال" value={overview?.locations.activeCities} caption={`${formatPercent(activeCityRatio)} پوشش فعال شهری`} icon={Globe2} tone="amber" trend={analytics?.timeline} trendKey="transactions" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <TimelineAreaPanel
          title="روند رشد و عملیات پلتفرم"
          description="کاربران، نیازها، پیشنهادها و درآمد ۱۲ ماه اخیر از API سوپرادمین خوانده می‌شود."
          data={analytics?.timeline ?? []}
          series={defaultSeries}
        />
        <div className="grid gap-4">
          <DonutPanel title="وضعیت نیازها" description="توزیع وضعیت نیازهای ثبت‌شده در سایت." data={analytics?.requestStatus ?? []} />
          <GoalsPanel goals={analytics?.goals ?? []} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <BarListPanel title="دسته‌های اثرگذار" description="دسته‌ها بر اساس حجم نیاز، مهارت و زیردسته رتبه‌بندی شده‌اند." rows={topCategoryRows} />
        <ActivityPanel activities={analytics?.recentActivity ?? []} />
      </div>

      <Panel title="دسترسی مالک و سلامت سرویس" description="کنترل‌های حساس، پوشش سرویس و ریسک‌های فوری." icon={KeyRound}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile label="شماره مجاز" value={1} icon={Crown} />
          <SummaryTile label="دسته اصلی" value={rootCategoryCount} icon={FolderTree} />
          <SummaryTile label="محله فعال" value={overview?.locations.activeNeighborhoods} icon={MapPinned} />
          <SummaryTile label="پوشش محله" value={activeNeighborhoodRatio} icon={Gauge} />
        </div>
      </Panel>
    </div>
  );
}

function getSectionSeries(section: Section): ChartSeries[] {
  if (section === 'billing') {
    return [
      { key: 'revenue', label: 'درآمد', color: TONE_COLORS.emerald },
      { key: 'transactions', label: 'تراکنش‌ها', color: TONE_COLORS.amber },
      { key: 'proposals', label: 'پیشنهادها', color: TONE_COLORS.violet },
    ];
  }

  if (section === 'crm' || section === 'users' || section === 'messages') {
    return [
      { key: 'users', label: 'کاربران', color: TONE_COLORS.emerald },
      { key: 'reviews', label: 'نظرات', color: TONE_COLORS.amber },
      { key: 'requests', label: 'نیازها', color: TONE_COLORS.sky },
    ];
  }

  return defaultSeries;
}

function getSectionDonutData(section: Section, analytics: AnalyticsData | null) {
  if (!analytics) return [];
  if (section === 'crm' || section === 'users') return analytics.userRoles;
  if (section === 'billing') return analytics.transactionStatus;
  if (section === 'growth' || section === 'charts') return analytics.proposalStatus;
  return analytics.requestStatus;
}

function AdvancedModulePage({
  config,
  progress,
  analytics,
  section,
}: {
  config: ModuleConfig;
  progress: Array<{
    label: string;
    value: number | undefined;
    total: number | undefined;
    tone?: string;
  }>;
  analytics: AnalyticsData | null;
  section: Section;
}) {
  const Icon = config.icon;
  const series = getSectionSeries(section);
  const donutData = getSectionDonutData(section, analytics);
  const topCategoryRows = (analytics?.topCategories ?? []).map((item, index) => ({
    id: item.id,
    label: item.name,
    value: item.score,
    meta: `${formatNumber(item.requests)} نیاز`,
    color: [TONE_COLORS.emerald, TONE_COLORS.sky, TONE_COLORS.violet, TONE_COLORS.amber][index % 4],
  }));
  const horizontalBars = donutData.map((item) => ({
    label: item.label,
    value: item.value,
    fill: item.color,
  }));

  return (
    <div className="space-y-4">
      <Panel
        title={config.title}
        description={config.description}
        icon={Icon}
        action={<Badge variant="outline">{config.eyebrow}</Badge>}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {config.metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              {...metric}
              trend={analytics?.timeline}
              trendKey={metric.trendKey ?? series[0]?.key ?? 'requests'}
            />
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <TimelineAreaPanel
          title="روند ماهانه ماژول"
          description={`تحلیل ۱۲ ماهه ${config.title} بر اساس داده‌های زنده سایت.`}
          data={analytics?.timeline ?? []}
          series={series}
        />
        <div className="grid gap-4">
          <DonutPanel title="تقسیم‌بندی وضعیت" description="توزیع وضعیت‌های کلیدی این ماژول برای تصمیم سریع." data={donutData} />
          <GoalsPanel goals={analytics?.goals ?? []} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="شاخص‌های همگام با سایت" description="این اعداد از APIهای داخلی سوپرادمین خوانده می‌شوند." icon={Gauge}>
          <div className="grid gap-5">
            {progress.map((item) => (
              <ProgressRow key={item.label} {...item} />
            ))}
          </div>
        </Panel>
        <Panel title="کنترل‌های سریع" description="میانبرهای عملیاتی متناسب با همین ماژول." icon={Command}>
          <div className="grid gap-3">
            {config.actions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={`group flex items-center gap-3 rounded-lg border p-3 text-right transition-colors ${
                    action.primary
                      ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
                      : 'border-border/60 bg-muted/20 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                    <ActionIcon className="size-4" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">{action.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.description}</span>
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              );
            })}
          </div>
        </Panel>
        <BarListPanel title="رتبه‌بندی دسته‌ها" description="مهم‌ترین مسیرهای خدماتی سایت بر اساس فعالیت." rows={topCategoryRows} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <HorizontalAnalyticsChart title="نمای ستونی وضعیت‌ها" description="مقایسه مقدار هر وضعیت به صورت ستونی و قابل اسکن." data={horizontalBars} />
        <ActivityPanel activities={analytics?.recentActivity ?? []} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {config.insights.map((insight) => (
          <GovernanceItem
            key={insight.title}
            title={insight.title}
            description={insight.description}
            icon={insight.icon}
          />
        ))}
      </div>
    </div>
  );
}

function MessagesHubPage({
  overview,
  analytics,
  setSection,
}: {
  overview: OverviewStats | null;
  analytics: AnalyticsData | null;
  setSection: (section: Section) => void;
}) {
  const notifications = analytics?.communications.recentNotifications ?? [];
  const unreadMessages = analytics?.communications.unreadMessages ?? 0;
  const unreadNotifications = analytics?.communications.unreadNotifications ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="کل پیام‌ها" value={analytics?.communications.totalMessages} caption={`${formatNumber(unreadMessages)} پیام خوانده‌نشده`} icon={MessageSquare} tone="emerald" trend={analytics?.timeline} trendKey="users" />
        <MetricCard title="کل اعلان‌ها" value={analytics?.communications.totalNotifications} caption={`${formatNumber(unreadNotifications)} اعلان خوانده‌نشده`} icon={Bell} tone="amber" trend={analytics?.timeline} trendKey="requests" />
        <MetricCard title="نیازهای باز" value={overview?.openRequests} caption="رخدادهای قابل پیگیری" icon={Inbox} tone="sky" trend={analytics?.timeline} trendKey="requests" />
        <MetricCard title="پیشنهادها" value={overview?.totalProposals} caption="تعاملات بازار" icon={Mail} tone="violet" trend={analytics?.timeline} trendKey="proposals" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr_360px]">
        <Panel title="صندوق مدیریتی" description="فیلترهای عملیاتی برای کنترل پیام‌ها و اعلان‌ها." icon={Inbox}>
          <div className="space-y-2">
            {[
              { label: 'همه اعلان‌ها', value: analytics?.communications.totalNotifications, icon: Bell },
              { label: 'خوانده‌نشده‌ها', value: unreadNotifications + unreadMessages, icon: CircleDot },
              { label: 'پیام‌های سیستم', value: analytics?.communications.totalMessages, icon: MessageSquare },
              { label: 'نیازهای قابل پیگیری', value: overview?.openRequests, icon: ListChecks },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-right transition-colors ${
                    index === 0 ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border/60 bg-muted/20 hover:bg-muted/50'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-black">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  <Badge variant={index === 0 ? 'default' : 'secondary'} className={index === 0 ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>
                    {formatNumber(item.value)}
                  </Badge>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="اعلان‌های اخیر" description="رخدادهای آخر سیستم با وضعیت خوانده‌شدن و متن کوتاه." icon={Mail}>
          {!notifications.length ? (
            <EmptyState label="اعلان جدیدی ثبت نشده است." />
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
              {notifications.map((item) => (
                <div key={item.id} className={`flex items-start gap-3 p-4 ${item.isRead ? 'bg-card' : 'bg-emerald-500/10'}`}>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background text-emerald-500">
                    <Bell className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-black">{item.title}</h3>
                      <span className="text-caption text-muted-foreground">{formatShortDate(item.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.message}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline">{item.type}</Badge>
                      {!item.isRead && <Badge className="bg-emerald-600 hover:bg-emerald-600">جدید</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="grid gap-4">
          <DonutPanel title="وضعیت نیازها" description="اعلان‌ها باید با فشار عملیاتی نیازها همسو شوند." data={analytics?.requestStatus ?? []} />
          <Panel title="اقدام‌های ارتباطی" description="میانبرهای امن برای پیگیری ارتباطات." icon={Command}>
            <div className="grid gap-2">
              <Button className="justify-start rounded-lg" onClick={() => window.location.assign('/messages')}>
                <MessageSquare className="size-4" />
                باز کردن پیام‌های سایت
              </Button>
              <Button variant="outline" className="justify-start rounded-lg" onClick={() => setSection('requests')}>
                <ListChecks className="size-4" />
                پیگیری نیازهای باز
              </Button>
              <Button variant="outline" className="justify-start rounded-lg" onClick={() => setSection('users')}>
                <Users className="size-4" />
                بررسی کاربران
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      <ChatReviewPanel />
    </div>
  );
}

function FilesHubPage({
  overview,
  analytics,
  categories,
  setSection,
}: {
  overview: OverviewStats | null;
  analytics: AnalyticsData | null;
  categories: AdminCategory[];
  setSection: (section: Section) => void;
}) {
  const assetCards = [
    { title: 'ساختار خدمات', subtitle: 'دسته‌ها و زیردسته‌ها', value: overview?.totalCategories, icon: FolderTree, action: () => setSection('categories') },
    { title: 'داده جغرافیا', subtitle: 'استان، شهر و محله', value: overview?.locations.neighborhoods, icon: MapPinned, action: () => setSection('locations') },
    { title: 'محتوای نیازها', subtitle: 'درخواست‌های ثبت‌شده', value: overview?.totalRequests, icon: Database, action: () => setSection('requests') },
    { title: 'گزارش‌های مدیریتی', subtitle: 'تحلیل و نمودارها', value: analytics?.timeline.length, icon: FileText, action: () => setSection('analytics') },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="دارایی‌های ساختاری" value={overview?.totalCategories} caption="دسته، زیردسته و مسیرهای ثبت نیاز" icon={HardDrive} tone="violet" trend={analytics?.timeline} trendKey="requests" />
        <MetricCard title="پوشش جغرافیا" value={overview?.locations.neighborhoods} caption={`${formatNumber(overview?.locations.activeNeighborhoods)} محله فعال`} icon={MapPinned} tone="amber" trend={analytics?.timeline} trendKey="users" />
        <MetricCard title="محتوای عملیاتی" value={overview?.totalRequests} caption="نیازها و داده‌های بازار" icon={Database} tone="sky" trend={analytics?.timeline} trendKey="requests" />
        <MetricCard title="فضای آماده اتصال" value={4} caption="ساختار آماده برای storage واقعی" icon={UploadCloud} tone="emerald" trend={analytics?.timeline} trendKey="transactions" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Panel title="فضای ذخیره‌سازی" description="نمای مدیریتی دارایی‌های داخلی پروژه." icon={HardDrive}>
          <div className="space-y-4">
            <ProgressRow label="داده‌های ساختاری" value={categories.length} total={Math.max(overview?.totalCategories ?? 1, 1)} tone="bg-violet-500" />
            <ProgressRow label="جغرافیای فعال" value={overview?.locations.activeNeighborhoods} total={overview?.locations.neighborhoods} tone="bg-amber-500" />
            <ProgressRow label="محتوای بازار" value={overview?.openRequests} total={overview?.totalRequests} tone="bg-sky-500" />
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-6 text-muted-foreground">
              این صفحه فعلاً دارایی‌های داده‌ای سایت را مدیریت می‌کند و برای اتصال به سرویس فایل آماده است.
            </div>
          </div>
        </Panel>

        <Panel title="فایل‌منیجر مدیریتی" description="کارت‌های عملیاتی برای دسترسی سریع به دارایی‌های مهم." icon={Layers3}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {assetCards.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.action}
                  className="group min-h-44 rounded-lg border border-border/70 bg-muted/20 p-4 text-right transition-colors hover:bg-muted/50"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-xl border bg-background text-emerald-500">
                      <Icon className="size-6" />
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <h3 className="font-black">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.subtitle}</p>
                  <p className="mt-4 text-2xl font-black">{formatNumber(item.value)}</p>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <BarListPanel
          title="پوشه‌های پرمصرف خدمات"
          description="دسته‌ها مثل پوشه‌های اصلی محصول دیده می‌شوند و سریع قابل بازبینی هستند."
          rows={(analytics?.topCategories ?? []).map((item) => ({
            id: item.id,
            label: item.name,
            value: item.score,
            meta: `${formatNumber(item.requests)} نیاز · ${formatNumber(item.skills)} مهارت`,
            color: TONE_COLORS.violet,
          }))}
        />
        <ActivityPanel activities={analytics?.recentActivity ?? []} />
      </div>
    </div>
  );
}

function WorkflowBoardPage({
  overview,
  analytics,
  categories,
  setSection,
}: {
  overview: OverviewStats | null;
  analytics: AnalyticsData | null;
  categories: AdminCategory[];
  setSection: (section: Section) => void;
}) {
  const inactiveCategories = categories
    .flatMap((category) => [category, ...category.children])
    .filter((category) => !category.isActive)
    .slice(0, 4);
  const columns = [
    {
      title: 'فوری',
      icon: AlertTriangle,
      count: overview?.openRequests ?? 0,
      cards: [
        { title: 'بازبینی نیازهای باز', text: `${formatNumber(overview?.openRequests)} نیاز باز باید از نظر کیفیت و زمان پاسخ کنترل شود.`, badge: 'نیاز', tone: 'sky' as Tone, action: () => setSection('requests') },
        { title: 'کنترل اعلان‌ها', text: `${formatNumber(analytics?.communications.unreadNotifications)} اعلان خوانده‌نشده در صف مدیریتی است.`, badge: 'اعلان', tone: 'amber' as Tone, action: () => setSection('messages') },
      ],
    },
    {
      title: 'در حال انجام',
      icon: Workflow,
      count: overview?.totalProposals ?? 0,
      cards: [
        { title: 'تحلیل پیشنهادها', text: `${formatNumber(overview?.totalProposals)} پیشنهاد برای ارزیابی کیفیت پاسخ بازار ثبت شده است.`, badge: 'پیشنهاد', tone: 'violet' as Tone, action: () => setSection('marketplace') },
        { title: 'پایش مالی', text: `${formatNumber(overview?.totalTransactions)} تراکنش در شاخص‌های مالی دیده می‌شود.`, badge: 'مالی', tone: 'emerald' as Tone, action: () => setSection('billing') },
      ],
    },
    {
      title: 'بازبینی',
      icon: SlidersHorizontal,
      count: inactiveCategories.length,
      cards: inactiveCategories.length
        ? inactiveCategories.map((category) => ({
            title: category.name,
            text: `دسته با اسلاگ ${category.slug} غیرفعال است و نیاز به تصمیم دارد.`,
            badge: 'دسته',
            tone: 'rose' as Tone,
            action: () => setSection('categories'),
          }))
        : [{ title: 'ساختار دسته‌ها پایدار است', text: 'دسته غیرفعال محدودی برای بازبینی فوری پیدا نشد.', badge: 'کیفیت', tone: 'emerald' as Tone, action: () => setSection('categories') }],
    },
    {
      title: 'آماده توسعه',
      icon: Globe2,
      count: overview?.locations.activeCities ?? 0,
      cards: [
        { title: 'گسترش جغرافیایی', text: `${formatNumber(overview?.locations.activeCities)} شهر فعال و ${formatNumber(overview?.locations.activeNeighborhoods)} محله فعال آماده توسعه است.`, badge: 'رشد', tone: 'emerald' as Tone, action: () => setSection('locations') },
        { title: 'برنامه دوره‌ای', text: 'رویدادهای تقویم مدیریتی برای پیگیری رشد و امنیت آماده شده‌اند.', badge: 'تقویم', tone: 'sky' as Tone, action: () => setSection('calendar') },
      ],
    },
  ];
  const toneMap: Record<Tone, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    slate: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="کارهای فوری" value={overview?.openRequests} caption="نیازهای باز و اعلان‌های مهم" icon={AlertTriangle} tone="sky" trend={analytics?.timeline} trendKey="requests" />
        <MetricCard title="پاسخ بازار" value={overview?.totalProposals} caption="پیشنهادهای ثبت‌شده" icon={Workflow} tone="violet" trend={analytics?.timeline} trendKey="proposals" />
        <MetricCard title="بازبینی ساختار" value={inactiveCategories.length} caption="دسته‌های غیرفعال" icon={SlidersHorizontal} tone="rose" trend={analytics?.timeline} trendKey="reviews" />
        <MetricCard title="توسعه منطقه‌ای" value={overview?.locations.activeCities} caption="شهرهای فعال" icon={Globe2} tone="emerald" trend={analytics?.timeline} trendKey="users" />
      </div>

      <div className="grid gap-4 xl:grid-cols-4" role="list" aria-label="برد کانبان عملیات سوپرادمین">
        {columns.map((column) => {
          const Icon = column.icon;
          return (
            <section key={column.title} className="rounded-lg border border-border/70 bg-card/95 p-4" aria-label={column.title}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-black">
                  <Icon className="size-4 text-emerald-500" />
                  {column.title}
                </h2>
                <Badge variant="secondary">{formatNumber(column.count)}</Badge>
              </div>
              <div className="space-y-3">
                {column.cards.map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    onClick={card.action}
                    className="group w-full rounded-lg border border-border/60 bg-muted/20 p-3 text-right transition-colors hover:bg-muted/50"
                  >
                    <Badge variant="outline" className={toneMap[card.tone]}>{card.badge}</Badge>
                    <h3 className="mt-3 text-sm font-black">{card.title}</h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-6 text-muted-foreground">{card.text}</p>
                    <div className="mt-3 flex items-center justify-between text-caption text-muted-foreground">
                      <span>قابل اقدام</span>
                      <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <TimelineAreaPanel title="روند پشتیبان کانبان" description="روند ۱۲ ماهه کارهای عملیاتی برای تشخیص فشار تیمی." data={analytics?.timeline ?? []} series={defaultSeries} />
    </div>
  );
}

function CalendarHubPage({
  overview,
  analytics,
  setSection,
}: {
  overview: OverviewStats | null;
  analytics: AnalyticsData | null;
  setSection: (section: Section) => void;
}) {
  const events = analytics?.calendarEvents ?? [];
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
  const eventByDay = new Map(events.map((event) => [new Date(event.date).toDateString(), event]));
  const toneMap: Record<Tone, string> = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    violet: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
    slate: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="رویدادهای مدیریتی" value={events.length} caption="بازبینی‌های زمان‌بندی‌شده" icon={CalendarDays} tone="emerald" trend={analytics?.timeline} trendKey="requests" />
        <MetricCard title="نیازهای باز" value={overview?.openRequests} caption="اولویت جلسه روزانه" icon={ListChecks} tone="sky" trend={analytics?.timeline} trendKey="requests" />
        <MetricCard title="هشدارهای امنیتی" value={overview?.bannedUsers} caption="حساب‌های مسدود" icon={ShieldCheck} tone="rose" trend={analytics?.timeline} trendKey="users" />
        <MetricCard title="رشد منطقه‌ای" value={overview?.locations.activeCities} caption="شهرهای فعال برای بررسی" icon={Globe2} tone="amber" trend={analytics?.timeline} trendKey="transactions" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel title="تقویم ۱۴ روزه عملیات" description="رویدادهای مهم از داده‌های زنده پنل ساخته می‌شوند." icon={CalendarIcon}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7" role="grid" aria-label="تقویم عملیاتی دو هفته آینده">
            {days.map((day) => {
              const event = eventByDay.get(day.toDateString());
              return (
                <div key={day.toISOString()} className="min-h-32 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-black">{formatShortDate(day.toISOString())}</span>
                    {day.toDateString() === today.toDateString() && <Badge className="bg-emerald-600 hover:bg-emerald-600">امروز</Badge>}
                  </div>
                  {event ? (
                    <button
                      type="button"
                      onClick={() => setSection(event.id === 'category-cleanup' ? 'categories' : event.id === 'growth-review' ? 'locations' : event.id === 'security-review' ? 'system' : 'requests')}
                      className={`w-full rounded-lg border p-2 text-right text-xs leading-5 ${toneMap[event.tone]}`}
                    >
                      <span className="block font-black">{event.title}</span>
                      <span className="mt-1 block text-muted-foreground">{event.description}</span>
                      <span className="mt-2 inline-flex rounded-full bg-background/60 px-2 py-0.5 font-bold">{formatNumber(event.count)}</span>
                    </button>
                  ) : (
                    <p className="text-xs leading-6 text-muted-foreground">رویداد مدیریتی ثبت نشده است.</p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel title="رویدادهای پیش‌رو" description="اقدام‌های قابل پیگیری با مسیر مستقیم." icon={CalendarDays}>
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black">{event.title}</h3>
                    <Badge variant="secondary">{formatShortDate(event.date)}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{event.description}</p>
                  <p className="mt-2 text-caption text-muted-foreground">شاخص مرتبط: {formatNumber(event.count)}</p>
                </div>
              ))}
            </div>
          </Panel>
          <GoalsPanel goals={analytics?.goals ?? []} />
        </div>
      </div>
    </div>
  );
}

function SettingsHubPage({
  overview,
  analytics,
  inactiveCategoryCount,
  loadAll,
  setSection,
}: {
  overview: OverviewStats | null;
  analytics: AnalyticsData | null;
  inactiveCategoryCount: number;
  loadAll: () => void;
  setSection: (section: Section) => void;
}) {
  const controls = [
    { title: 'حاکمیت دسترسی', description: `قفل شماره مالک روی ${SUPER_ADMIN_PHONE} و نقش SUPER_ADMIN.`, icon: ShieldCheck, action: () => setSection('system') },
    { title: 'معماری خدمات', description: `${formatNumber(inactiveCategoryCount)} دسته یا زیردسته نیازمند تصمیم.`, icon: FolderTree, action: () => setSection('categories') },
    { title: 'نقشه سرویس', description: `${formatNumber(overview?.locations.activeCities)} شهر فعال و ${formatNumber(overview?.locations.activeNeighborhoods)} محله فعال.`, icon: MapPinned, action: () => setSection('locations') },
    { title: 'همگام‌سازی داده', description: `آخرین تحلیل: ${formatUpdatedAt(analytics?.generatedAt)}`, icon: RefreshCcw, action: loadAll },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="مالک پنل" value={1} caption={SUPER_ADMIN_PHONE} icon={Crown} tone="emerald" trend={analytics?.timeline} trendKey="users" />
        <MetricCard title="دسته غیرفعال" value={inactiveCategoryCount} caption="نیازمند بازبینی ساختار" icon={FolderTree} tone="amber" trend={analytics?.timeline} trendKey="requests" />
        <MetricCard title="حساب مسدود" value={overview?.bannedUsers} caption="ریسک دسترسی و اعتماد" icon={AlertTriangle} tone="rose" trend={analytics?.timeline} trendKey="users" />
        <MetricCard title="APIهای حساس" value={4} caption="overview/categories/locations/analytics" icon={ServerCog} tone="violet" trend={analytics?.timeline} trendKey="transactions" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="مرکز تنظیمات مدیریتی" description="تنظیمات به اقدام‌های روشن و قابل کنترل تبدیل شده‌اند." icon={Settings2}>
          <div className="grid gap-3 md:grid-cols-2">
            {controls.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.action}
                  className="group rounded-lg border border-border/60 bg-muted/20 p-4 text-right transition-colors hover:bg-muted/50"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg border bg-background text-emerald-500">
                      <Icon className="size-5" />
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <h3 className="font-black">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.description}</p>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel title="کیفیت و دسترسی‌پذیری" description="کنترل‌های UX برای مدیریت سریع و کم‌خطا." icon={Sparkles}>
          <div className="space-y-3">
            <ProgressRow label="خواندن اعلان‌ها" value={Math.max((analytics?.communications.totalNotifications ?? 0) - (analytics?.communications.unreadNotifications ?? 0), 0)} total={analytics?.communications.totalNotifications} />
            <ProgressRow label="کاربران فعال" value={overview?.activeUsers} total={overview?.totalUsers} tone="bg-sky-500" />
            <ProgressRow label="پوشش شهرها" value={overview?.locations.activeCities} total={overview?.locations.cities} tone="bg-amber-500" />
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-6 text-muted-foreground">
              ناوبری دارای برچسب، بخش اصلی دارای anchor و کنترل‌های icon-only دارای aria-label هستند.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function dashboardSectionToRoute(section: Section): string {
  const map: Partial<Record<Section, AdminSectionId>> = {
    overview: 'overview',
    analytics: 'analytics',
    categories: 'categories',
    locations: 'locations',
    requests: 'requests',
    crm: 'users',
    users: 'users',
    messages: 'messages',
    system: 'system',
    settings: 'settings',
    marketplace: 'requests',
    growth: 'analytics',
    charts: 'analytics',
    billing: 'analytics',
  };
  return routeForSection(map[section] ?? 'overview');
}

export function SuperAdminDashboard({
  section: sectionProp = 'overview',
  embedded = false,
  onLocationsFullPage,
}: {
  section?: AdminSectionId;
  embedded?: boolean;
  /** وقتی مدیریت محله‌ها تمام‌صفحه است — برای مخفی کردن هدر LocationsPanel */
  onLocationsFullPage?: (active: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { me, hasPermission, apiFetch: adminApiFetch } = useAdmin();
  const dashboardSection = toDashboardSection(sectionProp) as Section;
  const [section, setSectionState] = useState<Section>(dashboardSection);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<FlatCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(initialCategoryForm);
  const [locations, setLocations] = useState<LocationData | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormState>(initialLocationForm);
  const [neighborhoodManage, setNeighborhoodManage] =
    useState<NeighborhoodManageContext | null>(null);
  const [neighborhoodFormVisible, setNeighborhoodFormVisible] = useState(false);

  const isAllowed = Boolean(
    me &&
      (me.isOwner ||
        hasPermission('superadmin:access') ||
        hasPermission(ADMIN_SECTION_PERMISSIONS[sectionProp]))
  );

  useEffect(() => {
    setSectionState(dashboardSection);
  }, [dashboardSection]);

  useEffect(() => {
    if (sectionProp !== 'locations') {
      setNeighborhoodManage(null);
      onLocationsFullPage?.(false);
    }
  }, [sectionProp, onLocationsFullPage]);

  const openNeighborhoodManage = useCallback(
    (ctx: NeighborhoodManageContext) => {
      setNeighborhoodFormVisible(false);
      setLocationForm(initialLocationForm);
      setNeighborhoodManage(ctx);
      onLocationsFullPage?.(true);
    },
    [onLocationsFullPage]
  );

  const closeNeighborhoodManage = useCallback(() => {
    setNeighborhoodManage(null);
    setNeighborhoodFormVisible(false);
    setLocationForm(initialLocationForm);
    onLocationsFullPage?.(false);
  }, [onLocationsFullPage]);

  const setSection = useCallback(
    (next: Section) => {
      if (embedded) {
        const target = dashboardSectionToRoute(next);
        if (target !== pathname) {
          router.push(target);
        }
        return;
      }
      setSectionState(next);
    },
    [embedded, router, pathname]
  );

  const apiFetch = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    return adminApiFetch<T>(url, init);
  }, [adminApiFetch]);

  const loadAll = useCallback(async () => {
    if (!isAllowed) return;

    setIsLoading(true);
    try {
      const [overviewData, categoryData, locationData, analyticsData] = await Promise.all([
        apiFetch<{ stats: OverviewStats }>('/api/super-admin/overview'),
        apiFetch<{ categories: AdminCategory[]; flatCategories: FlatCategory[] }>('/api/super-admin/categories'),
        apiFetch<LocationData>('/api/super-admin/locations'),
        apiFetch<AnalyticsData>('/api/super-admin/analytics'),
      ]);

      setOverview(overviewData.stats);
      setCategories(categoryData.categories);
      setFlatCategories(categoryData.flatCategories);
      setLocations(locationData);
      setAnalytics(analyticsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در دریافت اطلاعات');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, isAllowed]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAll();
    });
  }, [loadAll]);

  useEffect(() => {
    const handler = () => {
      void loadAll();
    };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [loadAll]);

  const provinces = useMemo(() => {
    return locations?.countries.find((country) => country.id === 'iran')?.provinces ?? [];
  }, [locations]);

  useEffect(() => {
    setNeighborhoodManage((prev) => {
      if (!prev) return prev;
      const province = provinces.find((p) => p.id === prev.provinceId);
      const city = province?.cities.find((c) => c.id === prev.city.id);
      if (!city || city === prev.city) return prev;
      return { ...prev, city };
    });
  }, [provinces]);

  const selectedProvince = useMemo(() => {
    return provinces.find((province) => province.id === locationForm.provinceId) ?? provinces[0];
  }, [locationForm.provinceId, provinces]);

  const cities = selectedProvince?.cities ?? [];

  const selectedCity = useMemo(() => {
    return cities.find((city) => city.id === locationForm.cityId) ?? cities[0];
  }, [cities, locationForm.cityId]);

  const saveCategory = async () => {
    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug,
      description: categoryForm.description,
      icon: categoryForm.icon,
      image: categoryForm.image,
      parentId: categoryForm.parentId === 'root' ? null : categoryForm.parentId,
      order: Number(categoryForm.order) || 0,
      isActive: categoryForm.isActive,
    };

    try {
      if (categoryForm.id) {
        await apiFetch(`/api/super-admin/categories/${categoryForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('دسته‌بندی بروزرسانی شد');
      } else {
        await apiFetch('/api/super-admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('دسته‌بندی جدید ساخته شد');
      }
      setCategoryForm(initialCategoryForm);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در ذخیره دسته‌بندی');
    }
  };

  const editCategory = (category: AdminCategory | FlatCategory) => {
    const fullCategory = 'children' in category
      ? category
      : [...categories, ...categories.flatMap((item) => item.children)].find((item) => item.id === category.id);

    if (!fullCategory) return;

    setSection('categories');
    setCategoryForm({
      id: fullCategory.id,
      name: fullCategory.name,
      slug: fullCategory.slug,
      description: fullCategory.description || '',
      icon: fullCategory.icon || '',
      image: fullCategory.image || '',
      parentId: fullCategory.parentId || 'root',
      order: String(fullCategory.order ?? 0),
      isActive: fullCategory.isActive,
    });
  };

  const deleteCategory = async (id: string) => {
    try {
      const result = await apiFetch<{ mode: 'deleted' | 'deactivated'; message?: string }>(
        `/api/super-admin/categories/${id}`,
        { method: 'DELETE' }
      );
      toast.success(result.message || (result.mode === 'deleted' ? 'دسته‌بندی حذف شد' : 'دسته‌بندی غیرفعال شد'));
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در حذف دسته‌بندی');
    }
  };

  const saveLocation = async () => {
    const areas =
      locationForm.type === 'neighborhood' && locationForm.areasText.trim()
        ? locationForm.areasText
            .split(/[\n,،]/)
            .map((a) => a.trim())
            .filter(Boolean)
        : undefined;

    const payload = {
      ...locationForm,
      provinceId: locationForm.provinceId || selectedProvince?.id || '',
      cityId: locationForm.cityId || selectedCity?.id || '',
      order: Number(locationForm.order) || 0,
      areas,
    };

    try {
      const method = locationForm.id ? 'PATCH' : 'POST';
      const nextLocations = await apiFetch<LocationData>('/api/super-admin/locations', {
        method,
        body: JSON.stringify(payload),
      });
      setLocations(nextLocations);
      if (neighborhoodManage) {
        setNeighborhoodFormVisible(false);
        setLocationForm(initialLocationForm);
      } else {
        setLocationForm({
          ...initialLocationForm,
          provinceId: locationForm.provinceId,
          cityId: locationForm.cityId,
          type: locationForm.type,
        });
      }
      toast.success(locationForm.id ? 'موقعیت بروزرسانی شد' : 'موقعیت جدید ساخته شد');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در ذخیره موقعیت');
    }
  };

  const editLocation = (
    type: LocationType,
    item: ManagedProvince | ManagedCity | ManagedNeighborhood,
    ctx?: { provinceId?: string; cityId?: string }
  ) => {
    if (!embedded) {
      setSection('locations');
    }
    const areasText =
      type === 'neighborhood' && 'areas' in item && item.areas?.length
        ? item.areas.join('\n')
        : '';
    setLocationForm((current) => ({
      ...current,
      id: item.id,
      type,
      name: item.name,
      nameEn: item.nameEn || '',
      order: String(item.order ?? 0),
      isActive: item.isActive,
      isPopular: 'isPopular' in item ? Boolean(item.isPopular) : false,
      isIsland: 'isIsland' in item ? Boolean(item.isIsland) : false,
      areasText,
      provinceId: ctx?.provinceId ?? (type === 'province' ? item.id : current.provinceId),
      cityId: ctx?.cityId ?? (type === 'city' ? item.id : type === 'neighborhood' ? current.cityId : ''),
    }));
  };

  const startAddNeighborhood = (ctx: {
    provinceId: string;
    cityId: string;
  }) => {
    if (!embedded) {
      setSection('locations');
    }
    setLocationForm({
      ...initialLocationForm,
      type: 'neighborhood',
      provinceId: ctx.provinceId,
      cityId: ctx.cityId,
    });
  };

  const deleteLocation = async (type: LocationType, id: string) => {
    try {
      const nextLocations = await apiFetch<LocationData>('/api/super-admin/locations', {
        method: 'DELETE',
        body: JSON.stringify({ type, id }),
      });
      setLocations(nextLocations);
      toast.success('موقعیت حذف شد');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در حذف موقعیت');
    }
  };

  const sectionMeta = getSectionMeta(section);
  const SectionIcon = sectionMeta.icon;
  const rootCategoryCount = categories.length;
  const childCategoryCount = categories.reduce((sum, category) => sum + category.children.length, 0);
  const inactiveCategoryCount = categories.reduce((sum, category) => {
    const inactiveChildren = category.children.filter((child) => !child.isActive).length;
    return sum + (!category.isActive ? 1 : 0) + inactiveChildren;
  }, 0);
  const activeUserRatio = ratio(overview?.activeUsers, overview?.totalUsers);
  const openRequestRatio = ratio(overview?.openRequests, overview?.totalRequests);
  const activeCityRatio = ratio(overview?.locations.activeCities, overview?.locations.cities);
  const activeNeighborhoodRatio = ratio(overview?.locations.activeNeighborhoods, overview?.locations.neighborhoods);
  const progressMetrics = [
    { label: 'کاربران فعال', value: overview?.activeUsers, total: overview?.totalUsers },
    { label: 'نیازهای باز', value: overview?.openRequests, total: overview?.totalRequests, tone: 'bg-sky-500' },
    { label: 'شهرهای فعال', value: overview?.locations.activeCities, total: overview?.locations.cities, tone: 'bg-amber-500' },
    { label: 'محله‌های فعال', value: overview?.locations.activeNeighborhoods, total: overview?.locations.neighborhoods, tone: 'bg-violet-500' },
  ];
  const moduleConfigs: Partial<Record<Section, ModuleConfig>> = {
    analytics: {
      eyebrow: 'Analytics',
      title: 'تحلیل‌های مدیریتی',
      description: 'معادل صفحه Analytics مرجع، اما متصل به شاخص‌های واقعی نیاز فایندر.',
      icon: BarChart3,
      metrics: [
        { title: 'نرخ کاربران فعال', value: activeUserRatio, valueLabel: formatPercent(activeUserRatio), caption: `${formatNumber(overview?.activeUsers)} کاربر فعال`, icon: Users, tone: 'emerald' },
        { title: 'نرخ نیازهای باز', value: openRequestRatio, valueLabel: formatPercent(openRequestRatio), caption: `${formatNumber(overview?.openRequests)} نیاز در صف`, icon: ListChecks, tone: 'sky' },
        { title: 'پوشش شهری', value: activeCityRatio, valueLabel: formatPercent(activeCityRatio), caption: `${formatNumber(overview?.locations.activeCities)} شهر فعال`, icon: Globe2, tone: 'amber' },
        { title: 'اعتماد اجتماعی', value: overview?.totalReviews, caption: 'کل نظرات ثبت‌شده', icon: ShieldCheck, tone: 'violet' },
      ],
      actions: [
        { label: 'بررسی نیازهای باز', description: 'حرکت به ماژول نیازها و کنترل صف عملیاتی', icon: ListChecks, onClick: () => setSection('requests'), primary: true },
        { label: 'بهینه‌سازی دسته‌بندی', description: 'تحلیل معماری خدمات و مسیرهای ورودی کاربران', icon: FolderTree, onClick: () => setSection('categories') },
        { label: 'کنترل پوشش شهرها', description: 'بررسی استان، شهر و محله‌های فعال', icon: MapPinned, onClick: () => setSection('locations') },
      ],
      insights: [
        { title: 'قیف عملیاتی', description: 'نسبت نیازهای باز به کل نیازها به عنوان فشار عملیاتی پنل نمایش داده می‌شود.', icon: Gauge },
        { title: 'کیفیت پوشش', description: 'پوشش فعال شهر و محله مستقیماً از داده‌های جغرافیایی سوپرادمین خوانده می‌شود.', icon: MapPinned },
        { title: 'ریسک حساب‌ها', description: 'کاربران مسدود و فعال برای تصمیم‌گیری سریع در CRM کنار هم قرار گرفته‌اند.', icon: AlertTriangle },
      ],
    },
    marketplace: {
      eyebrow: 'eCommerce',
      title: 'بازار نیازها',
      description: 'مرکز کنترل عرضه و تقاضا، مشابه صفحه eCommerce ولی برای نیازها و پیشنهادهای سایت.',
      icon: Database,
      metrics: [
        { title: 'کل نیازها', value: overview?.totalRequests, caption: 'تمام درخواست‌های ثبت‌شده', icon: Database, tone: 'emerald' },
        { title: 'نیازهای باز', value: overview?.openRequests, caption: `${formatPercent(openRequestRatio)} از کل نیازها`, icon: ListChecks, tone: 'sky' },
        { title: 'پیشنهادها', value: overview?.totalProposals, caption: 'پیشنهادهای ارسال‌شده متخصصان', icon: Workflow, tone: 'violet' },
        { title: 'نظرات', value: overview?.totalReviews, caption: 'بازخوردهای ثبت‌شده', icon: ShieldCheck, tone: 'amber' },
      ],
      actions: [
        { label: 'رفتن به نیازهای عمومی', description: 'مشاهده بازار سمت کاربر برای کنترل تجربه', icon: ArrowUpRight, onClick: () => window.location.assign('/browse?type=need'), primary: true },
        { label: 'تنظیم دسته‌بندی‌ها', description: 'اصلاح مسیرهای ثبت نیاز و سرویس‌ها', icon: FolderTree, onClick: () => setSection('categories') },
        { label: 'تحلیل بازار', description: 'نمایش روندها و ظرفیت عملیاتی', icon: BarChart3, onClick: () => setSection('analytics') },
      ],
      insights: [
        { title: 'صف باز', description: 'نیازهای باز مهم‌ترین سیگنال فشار عملیاتی بازار هستند.', icon: CircleDot },
        { title: 'عمق تعامل', description: 'پیشنهادها و نظرات نشان می‌دهند هر نیاز چقدر پاسخ دریافت می‌کند.', icon: Activity },
        { title: 'کنترل ساختار', description: 'هر تغییر در دسته‌بندی‌ها مستقیماً روی ثبت نیاز و SEO اثر دارد.', icon: Network },
      ],
    },
    crm: {
      eyebrow: 'CRM',
      title: 'CRM کاربران',
      description: 'دید مدیریتی روی کاربران، وضعیت حساب‌ها، اعتماد و دسترسی‌ها.',
      icon: Users,
      metrics: [
        { title: 'کل کاربران', value: overview?.totalUsers, caption: 'حساب‌های ثبت‌شده', icon: Users, tone: 'emerald' },
        { title: 'کاربران فعال', value: overview?.activeUsers, caption: `${formatPercent(activeUserRatio)} نرخ فعال بودن`, icon: CheckCircle2, tone: 'sky' },
        { title: 'مسدودها', value: overview?.bannedUsers, caption: 'حساب‌های نیازمند بازبینی', icon: AlertTriangle, tone: 'rose' },
        { title: 'نظرات', value: overview?.totalReviews, caption: 'سیگنال اعتماد کاربران', icon: ShieldCheck, tone: 'violet' },
      ],
      actions: [
        { label: 'مدیریت کاربران', description: 'باز کردن پنل نقش‌ها، مسدودسازی و دسترسی‌ها', icon: Users, onClick: () => window.location.assign('/admin/users'), primary: true },
        { label: 'حاکمیت دسترسی', description: 'بررسی سیاست‌های مالک و APIهای حساس', icon: ShieldCheck, onClick: () => setSection('system') },
        { label: 'تحلیل کاربران', description: 'بازگشت به صفحه تحلیل نرخ فعالیت', icon: BarChart3, onClick: () => setSection('analytics') },
      ],
      insights: [
        { title: 'مالک یکتا', description: `دسترسی سوپرادمین فقط برای شماره ${SUPER_ADMIN_PHONE} معتبر است.`, icon: KeyRound },
        { title: 'ریسک فعال', description: 'کاربران مسدود در کنار نرخ فعالیت دیده می‌شوند تا تصمیم‌گیری سریع‌تر شود.', icon: AlertTriangle },
        { title: 'اعتماد بازار', description: 'نظرات کاربران به عنوان سیگنال کیفیت تجربه در CRM نمایش داده می‌شود.', icon: ShieldCheck },
      ],
    },
    growth: {
      eyebrow: 'SaaS',
      title: 'رشد پلتفرم',
      description: 'نمای SaaS از ظرفیت خدمات، شهرها، محله‌ها و آمادگی توسعه.',
      icon: Activity,
      metrics: [
        { title: 'دسته‌ها', value: overview?.totalCategories, caption: `${formatNumber(childCategoryCount)} زیردسته عملیاتی`, icon: Network, tone: 'violet' },
        { title: 'شهرهای فعال', value: overview?.locations.activeCities, caption: `${formatPercent(activeCityRatio)} پوشش فعال`, icon: Globe2, tone: 'amber' },
        { title: 'محله‌های فعال', value: overview?.locations.activeNeighborhoods, caption: `${formatPercent(activeNeighborhoodRatio)} پوشش محله`, icon: MapPinned, tone: 'sky' },
        { title: 'تراکنش‌ها', value: overview?.totalTransactions, caption: 'سیگنال رشد تجاری', icon: Workflow, tone: 'emerald' },
      ],
      actions: [
        { label: 'گسترش جغرافیا', description: 'افزودن استان، شهر یا محله جدید', icon: MapPinned, onClick: () => setSection('locations'), primary: true },
        { label: 'گسترش خدمات', description: 'افزودن دسته و زیردسته جدید', icon: FolderTree, onClick: () => setSection('categories') },
        { label: 'نمای مالی', description: 'رفتن به شاخص‌های مالی و فاکتورها', icon: Workflow, onClick: () => setSection('billing') },
      ],
      insights: [
        { title: 'ظرفیت سرویس', description: 'افزایش دسته‌ها بدون کنترل کیفیت، مسیر ثبت نیاز را پیچیده می‌کند.', icon: SlidersHorizontal },
        { title: 'پوشش منطقه‌ای', description: 'فعال بودن شهرها و محله‌ها برای رشد واقعی بازار حیاتی است.', icon: Globe2 },
        { title: 'آمادگی درآمد', description: 'تراکنش‌ها در کنار رشد سرویس‌ها برای تصمیم‌های تجاری نمایش داده می‌شوند.', icon: Workflow },
      ],
    },
    charts: {
      eyebrow: 'Charts',
      title: 'نمودارهای عملیاتی',
      description: 'نمای فشرده و تصویری از مهم‌ترین نسبت‌های مدیریتی.',
      icon: Gauge,
      metrics: [
        { title: 'فعالیت کاربران', value: activeUserRatio, valueLabel: formatPercent(activeUserRatio), caption: 'نسبت کاربران فعال', icon: Users, tone: 'emerald' },
        { title: 'فشار نیازها', value: openRequestRatio, valueLabel: formatPercent(openRequestRatio), caption: 'نسبت نیازهای باز', icon: ListChecks, tone: 'sky' },
        { title: 'شهر فعال', value: activeCityRatio, valueLabel: formatPercent(activeCityRatio), caption: 'پوشش شهری', icon: Globe2, tone: 'amber' },
        { title: 'محله فعال', value: activeNeighborhoodRatio, valueLabel: formatPercent(activeNeighborhoodRatio), caption: 'پوشش محله‌ای', icon: MapPinned, tone: 'violet' },
      ],
      actions: [
        { label: 'تحلیل کامل', description: 'رفتن به صفحه تحلیل‌های مدیریتی', icon: BarChart3, onClick: () => setSection('analytics'), primary: true },
        { label: 'بازار نیازها', description: 'مشاهده فشار نیازها و پیشنهادها', icon: Database, onClick: () => setSection('marketplace') },
        { label: 'رشد پلتفرم', description: 'بررسی ظرفیت و پوشش سرویس', icon: Activity, onClick: () => setSection('growth') },
      ],
      insights: [
        { title: 'بدون وابستگی خارجی', description: 'نمودارها با CSS و داده‌های داخلی ساخته شده‌اند؛ کتابخانه جدید اضافه نشده است.', icon: Gauge },
        { title: 'همگام با API', description: 'همه درصدها از APIهای سوپرادمین و داده‌های همین سایت محاسبه می‌شوند.', icon: ServerCog },
        { title: 'تصمیم سریع', description: 'چهار نسبت اصلی برای تشخیص وضعیت پلتفرم در یک نگاه آماده شده‌اند.', icon: Sparkles },
      ],
    },
    requests: {
      eyebrow: 'Orders',
      title: 'نیازها و سفارش‌ها',
      description: 'معادل Orders مرجع برای کنترل صف نیازها، پیشنهادها و وضعیت بازار.',
      icon: ListChecks,
      metrics: [
        { title: 'کل نیازها', value: overview?.totalRequests, caption: 'تمام نیازهای ثبت‌شده', icon: Database, tone: 'emerald' },
        { title: 'نیاز باز', value: overview?.openRequests, caption: `${formatPercent(openRequestRatio)} باز`, icon: CircleDot, tone: 'sky' },
        { title: 'پیشنهادها', value: overview?.totalProposals, caption: 'پیشنهادهای متخصصان', icon: Workflow, tone: 'violet' },
        { title: 'دسته‌های فعال', value: overview?.totalCategories, caption: 'مسیرهای ثبت نیاز', icon: FolderTree, tone: 'amber' },
      ],
      actions: [
        { label: 'مشاهده نیازها', description: 'باز کردن صفحه عمومی نیازها برای کنترل سمت کاربر', icon: ArrowUpRight, onClick: () => window.location.assign('/browse?type=need'), primary: true },
        { label: 'اصلاح مسیر ثبت نیاز', description: 'رفتن به مدیریت دسته‌بندی‌ها', icon: FolderTree, onClick: () => setSection('categories') },
        { label: 'کنترل شهرها', description: 'اطمینان از پوشش صحیح جغرافیا', icon: MapPinned, onClick: () => setSection('locations') },
      ],
      insights: [
        { title: 'اولویت صف', description: 'نیازهای باز باید قبل از رشد دسته‌ها و شهرها پایش شوند.', icon: ListChecks },
        { title: 'کیفیت پاسخ', description: 'پیشنهادهای ثبت‌شده نشان می‌دهند بازار چقدر به نیازها واکنش می‌دهد.', icon: Activity },
        { title: 'وابستگی دسته', description: 'حذف دسته‌های دارای وابستگی در API به غیرفعال‌سازی امن تبدیل می‌شود.', icon: ShieldCheck },
      ],
    },
    users: {
      eyebrow: 'Customers',
      title: 'کاربران و مشتریان',
      description: 'معادل Customers مرجع با اتصال به پنل واقعی کاربران سایت.',
      icon: Users,
      metrics: [
        { title: 'کل کاربران', value: overview?.totalUsers, caption: 'همه حساب‌ها', icon: Users, tone: 'emerald' },
        { title: 'فعال', value: overview?.activeUsers, caption: `${formatPercent(activeUserRatio)} نرخ فعالیت`, icon: CheckCircle2, tone: 'sky' },
        { title: 'مسدود', value: overview?.bannedUsers, caption: 'نیازمند بازبینی', icon: AlertTriangle, tone: 'rose' },
        { title: 'مالک پنل', value: 1, caption: SUPER_ADMIN_PHONE, icon: Crown, tone: 'violet' },
      ],
      actions: [
        { label: 'باز کردن مدیریت کاربران', description: 'ورود به صفحه کامل نقش‌ها و مسدودسازی', icon: Users, onClick: () => window.location.assign('/admin/users'), primary: true },
        { label: 'بررسی CRM', description: 'بازگشت به تحلیل کاربران', icon: Users, onClick: () => setSection('crm') },
        { label: 'حاکمیت دسترسی', description: 'کنترل سیاست‌های سوپرادمین', icon: ShieldCheck, onClick: () => setSection('system') },
      ],
      insights: [
        { title: 'کنترل نقش', description: 'مدیریت نقش‌ها در مسیر جداگانه کاربران حفظ شده و از اینجا قابل دسترسی است.', icon: KeyRound },
        { title: 'ریسک مسدودی', description: 'حساب‌های مسدود به عنوان هشدار عملیاتی در پنل دیده می‌شوند.', icon: AlertTriangle },
        { title: 'مالکیت امن', description: 'شماره مالک در UI و API قفل شده است.', icon: Crown },
      ],
    },
    billing: {
      eyebrow: 'Invoices',
      title: 'مالی و فاکتورها',
      description: 'نمای مدیریتی از تراکنش‌ها و سیگنال‌های تجاری پلتفرم.',
      icon: Workflow,
      metrics: [
        { title: 'تراکنش‌ها', value: overview?.totalTransactions, caption: 'کل تراکنش‌های ثبت‌شده', icon: Workflow, tone: 'emerald' },
        { title: 'پیشنهادها', value: overview?.totalProposals, caption: 'ظرفیت تبدیل به پرداخت', icon: Activity, tone: 'sky' },
        { title: 'کاربران', value: overview?.totalUsers, caption: 'پایه مشتریان', icon: Users, tone: 'violet' },
        { title: 'نیازها', value: overview?.totalRequests, caption: 'تقاضای بازار', icon: Database, tone: 'amber' },
      ],
      actions: [
        { label: 'بازار نیازها', description: 'دیدن سمت تقاضا و پیشنهادها', icon: Database, onClick: () => setSection('marketplace'), primary: true },
        { label: 'رشد پلتفرم', description: 'بررسی ظرفیت درآمدزایی سرویس‌ها', icon: Activity, onClick: () => setSection('growth') },
        { label: 'تنظیمات مالی', description: 'رفتن به تنظیمات و سیاست‌های سیستم', icon: Settings2, onClick: () => setSection('settings') },
      ],
      insights: [
        { title: 'شاخص درآمد', description: 'فعلاً تراکنش‌ها به عنوان شاخص اصلی مالی از API خوانده می‌شوند.', icon: Workflow },
        { title: 'پتانسیل تبدیل', description: 'پیشنهادها و نیازها کنار هم ظرفیت پرداخت آینده را نشان می‌دهند.', icon: BarChart3 },
        { title: 'مسیر توسعه', description: 'در صورت اضافه شدن API مالی کامل، همین صفحه آماده اتصال مستقیم است.', icon: ServerCog },
      ],
    },
    messages: {
      eyebrow: 'Mail / Chat',
      title: 'پیام‌ها و اعلان‌ها',
      description: 'هاب ارتباطی برای پیگیری گفتگوها، اعلان‌ها و رخدادهای عملیاتی.',
      icon: Command,
      metrics: [
        { title: 'کاربران', value: overview?.totalUsers, caption: 'مخاطبان پیام‌ها', icon: Users, tone: 'emerald' },
        { title: 'نیازهای باز', value: overview?.openRequests, caption: 'رخدادهای قابل پیگیری', icon: ListChecks, tone: 'sky' },
        { title: 'پیشنهادها', value: overview?.totalProposals, caption: 'تعاملات بازار', icon: Activity, tone: 'violet' },
        { title: 'نظرات', value: overview?.totalReviews, caption: 'بازخوردهای کاربران', icon: ShieldCheck, tone: 'amber' },
      ],
      actions: [
        { label: 'رفتن به پیام‌ها', description: 'باز کردن inbox داخلی سایت', icon: ArrowUpRight, onClick: () => window.location.assign('/messages'), primary: true },
        { label: 'کاربران هدف', description: 'تحلیل کاربران و وضعیت حساب‌ها', icon: Users, onClick: () => setSection('crm') },
        { label: 'نیازهای باز', description: 'پیگیری نیازهای فعال', icon: ListChecks, onClick: () => setSection('requests') },
      ],
      insights: [
        { title: 'اعلان عملیاتی', description: 'نیازهای باز و پیشنهادها سیگنال‌های اصلی برای اعلان مدیریتی هستند.', icon: CircleDot },
        { title: 'حریم ارتباطات', description: 'این بخش طراحی مدیریتی دارد و بدون API اختصاصی، پیام خصوصی را نمایش نمی‌دهد.', icon: ShieldCheck },
        { title: 'قابل توسعه', description: 'پس از آماده شدن API گفتگو، همین هاب می‌تواند به inbox زنده تبدیل شود.', icon: ServerCog },
      ],
    },
    files: {
      eyebrow: 'Files',
      title: 'فایل‌ها و دارایی‌ها',
      description: 'فضای مدیریتی برای مدارک، تصاویر، پیوست‌ها و داده‌های ساختاری سایت.',
      icon: Layers3,
      metrics: [
        { title: 'دسته‌ها', value: overview?.totalCategories, caption: 'دارایی ساختار خدمات', icon: FolderTree, tone: 'violet' },
        { title: 'محله‌ها', value: overview?.locations.neighborhoods, caption: 'داده جغرافیایی', icon: MapPinned, tone: 'amber' },
        { title: 'نیازها', value: overview?.totalRequests, caption: 'محتوای عملیاتی', icon: Database, tone: 'sky' },
        { title: 'کاربران', value: overview?.totalUsers, caption: 'دارایی حساب‌ها', icon: Users, tone: 'emerald' },
      ],
      actions: [
        { label: 'مدیریت دسته‌ها', description: 'اصلاح داده‌های ساختار خدمات', icon: FolderTree, onClick: () => setSection('categories'), primary: true },
        { label: 'مدیریت جغرافیا', description: 'اصلاح استان، شهر و محله', icon: MapPinned, onClick: () => setSection('locations') },
        { label: 'تنظیمات', description: 'رفتن به سیاست‌های سیستم و پیکربندی', icon: Settings2, onClick: () => setSection('settings') },
      ],
      insights: [
        { title: 'داده‌های محلی', description: 'اطلاعات جغرافیایی از فایل مدیریت‌شده پروژه خوانده و ویرایش می‌شود.', icon: Layers3 },
        { title: 'دارایی سرویس', description: 'دسته‌ها و زیردسته‌ها دارایی اصلی SEO و تجربه ثبت نیاز هستند.', icon: Network },
        { title: 'آماده اتصال', description: 'در صورت اضافه شدن storage، این صفحه می‌تواند مدیریت فایل واقعی را پوشش دهد.', icon: ServerCog },
      ],
    },
    workflow: {
      eyebrow: 'Kanban',
      title: 'کانبان عملیات',
      description: 'نمای پروژه‌ای برای صف‌ها، کارهای باز و پیگیری‌های مدیریتی.',
      icon: GitBranch,
      metrics: [
        { title: 'نیازهای باز', value: overview?.openRequests, caption: 'ستون پیگیری فوری', icon: ListChecks, tone: 'sky' },
        { title: 'پیشنهادها', value: overview?.totalProposals, caption: 'ستون پاسخ متخصصان', icon: Workflow, tone: 'violet' },
        { title: 'دسته‌های غیرفعال', value: inactiveCategoryCount, caption: 'ستون پاکسازی ساختار', icon: AlertTriangle, tone: 'rose' },
        { title: 'شهرهای فعال', value: overview?.locations.activeCities, caption: 'ستون توسعه منطقه', icon: MapPinned, tone: 'amber' },
      ],
      actions: [
        { label: 'پاکسازی دسته‌ها', description: 'بررسی دسته‌های غیرفعال و ساختار خدمات', icon: FolderTree, onClick: () => setSection('categories'), primary: true },
        { label: 'صف نیازها', description: 'بررسی نیازهای باز و پیشنهادها', icon: ListChecks, onClick: () => setSection('requests') },
        { label: 'صف شهرها', description: 'بررسی پوشش جغرافیایی', icon: MapPinned, onClick: () => setSection('locations') },
      ],
      insights: [
        { title: 'ستون فوری', description: 'نیازهای باز باید مثل ستون فوری کانبان دیده شوند.', icon: CircleDot },
        { title: 'ستون کیفیت', description: 'دسته‌های غیرفعال یا وابسته، کارهای نگهداری ساختار هستند.', icon: SlidersHorizontal },
        { title: 'ستون توسعه', description: 'گسترش شهرها و محله‌ها به عنوان کار توسعه بازار نمایش داده می‌شود.', icon: Globe2 },
      ],
    },
    calendar: {
      eyebrow: 'Calendar',
      title: 'تقویم مدیریتی',
      description: 'برنامه‌ریزی بازبینی‌ها، پاکسازی داده‌ها و کنترل‌های دوره‌ای.',
      icon: CalendarIcon,
      metrics: [
        { title: 'نیازهای باز امروز', value: overview?.openRequests, caption: 'اولویت پیگیری', icon: ListChecks, tone: 'sky' },
        { title: 'حساب‌های مسدود', value: overview?.bannedUsers, caption: 'بازبینی امنیتی', icon: AlertTriangle, tone: 'rose' },
        { title: 'دسته‌های غیرفعال', value: inactiveCategoryCount, caption: 'نگهداری محتوا', icon: FolderTree, tone: 'amber' },
        { title: 'محله‌های فعال', value: overview?.locations.activeNeighborhoods, caption: 'پایش پوشش', icon: MapPinned, tone: 'violet' },
      ],
      actions: [
        { label: 'بازبینی امنیتی', description: 'رفتن به سیاست‌های دسترسی', icon: ShieldCheck, onClick: () => setSection('system'), primary: true },
        { label: 'برنامه پاکسازی', description: 'باز کردن کانبان عملیات', icon: GitBranch, onClick: () => setSection('workflow') },
        { label: 'تحلیل دوره‌ای', description: 'رفتن به صفحه تحلیل‌ها', icon: BarChart3, onClick: () => setSection('analytics') },
      ],
      insights: [
        { title: 'ریتم مدیریتی', description: 'تقویم برای تبدیل شاخص‌ها به بازبینی‌های دوره‌ای طراحی شده است.', icon: CalendarIcon },
        { title: 'هشدارها', description: 'مسدودی‌ها و نیازهای باز، رویدادهای اولویت‌دار پنل هستند.', icon: AlertTriangle },
        { title: 'نگهداری داده', description: 'دسته‌ها و محله‌ها به صورت دوره‌ای باید پاکسازی و کامل شوند.', icon: Layers3 },
      ],
    },
    settings: {
      eyebrow: 'Settings',
      title: 'تنظیمات پلتفرم',
      description: 'پیکربندی مدیریتی، سیاست‌ها و مسیرهای عملیاتی کلان.',
      icon: Settings2,
      metrics: [
        { title: 'شماره مالک', value: 1, caption: SUPER_ADMIN_PHONE, icon: Crown, tone: 'emerald' },
        { title: 'دسته غیرفعال', value: inactiveCategoryCount, caption: 'نیازمند تصمیم', icon: FolderTree, tone: 'amber' },
        { title: 'کاربر مسدود', value: overview?.bannedUsers, caption: 'کنترل امنیتی', icon: AlertTriangle, tone: 'rose' },
        { title: 'APIهای حساس', value: 4, caption: 'overview/categories/locations/users', icon: ServerCog, tone: 'violet' },
      ],
      actions: [
        { label: 'حاکمیت سیستم', description: 'بررسی کنترل‌های حساس و دسترسی مالک', icon: ShieldCheck, onClick: () => setSection('system'), primary: true },
        { label: 'مدیریت کاربران', description: 'کنترل نقش‌ها و مسدودسازی', icon: Users, onClick: () => window.location.assign('/admin/users') },
        { label: 'بازخوانی داده‌ها', description: 'همگام‌سازی دوباره همه APIهای سوپرادمین', icon: RefreshCcw, onClick: loadAll },
      ],
      insights: [
        { title: 'تنظیمات امن', description: 'تغییرات حساس فقط از مسیر شماره مالک و نقش SUPER_ADMIN مجاز است.', icon: KeyRound },
        { title: 'همگام‌سازی', description: 'هر بار بروزرسانی، overview، دسته‌ها و جغرافیا را همزمان می‌خواند.', icon: RefreshCcw },
        { title: 'آماده توسعه', description: 'این بخش برای اضافه شدن تنظیمات مالی، SEO و اعلان‌ها ساختار دارد.', icon: Settings2 },
      ],
    },
  };
  const moduleConfig = moduleConfigs[section];
  const getSectionBadge = (id: Section) => {
    if (id === 'requests') return formatNumber(overview?.openRequests);
    if (id === 'categories') return formatNumber(rootCategoryCount + childCategoryCount);
    if (id === 'users') return formatNumber(overview?.totalUsers);
    if (id === 'locations') return formatNumber(overview?.locations.activeCities);
    if (id === 'billing') return formatNumber(overview?.totalTransactions);
    if (id === 'workflow') return formatNumber(inactiveCategoryCount + (overview?.openRequests ?? 0));
    return null;
  };

  if (!isAllowed) return <UnauthorizedView />;

  return (
    <div className={`space-y-4 ${embedded ? '' : 'dark min-h-screen bg-[#050505] text-foreground px-4 pb-8 pt-4 sm:px-6 lg:px-8'}`} dir="rtl">
      {!embedded && (
        <>
          <div className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-border/70 bg-[#050505]/90 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative max-w-xl flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="جستجو در صفحات و عملیات سوپرادمین"
                  readOnly
                  value=""
                  placeholder="جستجو در صفحات، عملیات و داده‌های سوپرادمین..."
                  className="h-11 rounded-lg border-border/70 bg-card/70 pr-10"
                />
                <Badge variant="secondary" dir="ltr" className="absolute left-2 top-1/2 -translate-y-1/2">⌘K</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="rounded-lg bg-emerald-600 hover:bg-emerald-700" onClick={() => setSection('requests')}>
                  <Plus className="size-4" />
                  نیاز جدید
                </Button>
                <Button aria-label="همگام‌سازی داده‌های سوپرادمین" variant="outline" className="rounded-lg" onClick={loadAll} disabled={isLoading}>
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                  همگام‌سازی
                </Button>
                <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => setSection('settings')} aria-label="تنظیمات">
                  <Settings2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <header className="rounded-lg border border-border/70 bg-card/95 p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-foreground">
                  <SectionIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1.5">
                      <CircleDot className="size-3 text-emerald-600" />
                      زنده
                    </Badge>
                    <Badge variant="secondary">آخرین همگام‌سازی: {formatUpdatedAt(locations?.updatedAt)}</Badge>
                  </div>
                  <h1 className="text-2xl font-black tracking-normal sm:text-3xl">{sectionMeta.label}</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                    {sectionMeta.description}
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button variant="outline" className="rounded-lg" onClick={() => setSection('categories')}>
                  <FolderTree className="size-4" />
                  ساختار خدمات
                </Button>
                <Button variant="outline" className="rounded-lg" onClick={() => setSection('locations')}>
                  <MapPinned className="size-4" />
                  نقشه سرویس
                </Button>
                <Button aria-label="تازه‌سازی داده‌های مدیریتی" className="rounded-lg" onClick={loadAll} disabled={isLoading}>
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                  تازه‌سازی
                </Button>
              </div>
            </div>
          </header>
        </>
      )}

          {isLoading && !(embedded && section === 'locations' && neighborhoodManage) && (
            <Panel title="در حال دریافت اطلاعات مدیریتی" description="داده‌های عملیاتی از API سوپرادمین خوانده می‌شود." icon={Loader2}>
              <div className="flex items-center justify-center gap-3 py-14 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
                در حال دریافت اطلاعات...
              </div>
            </Panel>
          )}

          {!isLoading && section === 'overview' && (
            <CommandCenterPage
              overview={overview}
              analytics={analytics}
              rootCategoryCount={rootCategoryCount}
              childCategoryCount={childCategoryCount}
              activeUserRatio={activeUserRatio}
              activeCityRatio={activeCityRatio}
              activeNeighborhoodRatio={activeNeighborhoodRatio}
            />
          )}

          {!isLoading && section === 'messages' && (
            <MessagesHubPage overview={overview} analytics={analytics} setSection={setSection} />
          )}

          {!isLoading && section === 'files' && (
            <FilesHubPage
              overview={overview}
              analytics={analytics}
              categories={categories}
              setSection={setSection}
            />
          )}

          {!isLoading && section === 'workflow' && (
            <WorkflowBoardPage
              overview={overview}
              analytics={analytics}
              categories={categories}
              setSection={setSection}
            />
          )}

          {!isLoading && section === 'calendar' && (
            <CalendarHubPage overview={overview} analytics={analytics} setSection={setSection} />
          )}

          {!isLoading && section === 'settings' && (
            <SettingsHubPage
              overview={overview}
              analytics={analytics}
              inactiveCategoryCount={inactiveCategoryCount}
              loadAll={loadAll}
              setSection={setSection}
            />
          )}

          {!isLoading && moduleConfig && !['messages', 'files', 'workflow', 'calendar', 'settings'].includes(section) && (
            <AdvancedModulePage
              config={moduleConfig}
              progress={progressMetrics}
              analytics={analytics}
              section={section}
            />
          )}

          {!isLoading && section === 'categories' && (
            <div className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
              <Panel
                variant="form"
                title={categoryForm.id ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی'}
                description="ساختار خدمات، اسلاگ، آیکن و وضعیت انتشار را کنترل کنید."
                icon={SlidersHorizontal}
                className="h-fit xl:sticky xl:top-20"
              >
                <div className="space-y-4">
                <Field label="نام">
                  <Input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} />
                </Field>
                <Field label="اسلاگ">
                  <Input dir="ltr" value={categoryForm.slug} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} placeholder="auto-generated-if-empty" />
                </Field>
                <Field label="والد">
                  <Select value={categoryForm.parentId} onValueChange={(value) => setCategoryForm({ ...categoryForm, parentId: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">دسته‌بندی اصلی</SelectItem>
                      {flatCategories.filter((category) => !category.parentId && category.id !== categoryForm.id).map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="آیکن Lucide">
                    <Input dir="ltr" value={categoryForm.icon} onChange={(event) => setCategoryForm({ ...categoryForm, icon: event.target.value })} />
                  </Field>
                  <Field label="ترتیب">
                    <PersianDigitInput
                      variant="plain"
                      value={categoryForm.order}
                      onChange={(order) => setCategoryForm({ ...categoryForm, order })}
                    />
                  </Field>
                </div>
                <Field label="تصویر">
                  <Input dir="ltr" value={categoryForm.image} onChange={(event) => setCategoryForm({ ...categoryForm, image: event.target.value })} />
                </Field>
                <Field label="توضیحات">
                  <Textarea value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} />
                </Field>
                <AdminToggleRow label="فعال باشد">
                  <Switch checked={categoryForm.isActive} onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })} />
                </AdminToggleRow>
                <AdminPanelActions>
                  <Button onClick={saveCategory} className="admin-btn-save flex-1">
                    <Save className="size-4" />
                    ذخیره
                  </Button>
                  <Button variant="outline" onClick={() => setCategoryForm(initialCategoryForm)}>
                    پاک‌سازی
                  </Button>
                </AdminPanelActions>
                </div>
              </Panel>

              <div className="space-y-5">
                <Panel variant="stats" title="خلاصه معماری خدمات" description="شاخص‌های ساختار دسته‌بندی قبل از ویرایش سریع." icon={FolderTree}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SummaryTile label="دسته اصلی" value={rootCategoryCount} icon={FolderTree} tone="indigo" />
                    <SummaryTile label="زیردسته" value={childCategoryCount} icon={GitBranch} tone="sky" />
                    <SummaryTile label="غیرفعال" value={inactiveCategoryCount} icon={AlertTriangle} tone="amber" />
                  </div>
                </Panel>

                <Panel title="ساختار دسته‌بندی‌ها" description="ویرایش، غیرفعال‌سازی و حذف امن دسته‌ها و زیردسته‌ها." icon={Network}>
                  <div className="space-y-3">
                {categories.map((category) => (
                  <AdminListCard key={category.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black">{category.name}</h3>
                          <StatusPill active={category.isActive} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{category.slug}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatNumber(category.requestCount)} نیاز، {formatNumber(category.skillCount)} مهارت، {formatNumber(category.children.length)} زیردسته
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <ActionButton icon={Edit3} onClick={() => editCategory(category)}>ویرایش</ActionButton>
                        <ActionButton icon={Trash2} onClick={() => deleteCategory(category.id)} tone="danger">حذف</ActionButton>
                      </div>
                    </div>
                    {category.children.length > 0 && (
                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {category.children.map((child) => (
                          <div key={child.id} className="admin-list-card admin-list-card--nested flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-bold">
                                <Layers3 className="size-4 text-muted-foreground" />
                                <span className="truncate">{child.name}</span>
                                {!child.isActive && <Badge variant="secondary">غیرفعال</Badge>}
                              </div>
                              <p className="mt-1 text-caption text-muted-foreground" dir="ltr">{child.slug}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <IconAction icon={Edit3} label="ویرایش زیردسته" onClick={() => editCategory(child)} />
                              <IconAction icon={Trash2} label="حذف زیردسته" onClick={() => deleteCategory(child.id)} danger />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AdminListCard>
                ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {section === 'locations' && neighborhoodManage && (
            <>
              {neighborhoodFormVisible &&
                locationForm.type === 'neighborhood' &&
                locationForm.cityId === neighborhoodManage.city.id && (
                  <NeighborhoodLocationForm
                    cityName={neighborhoodManage.city.name}
                    values={{
                      id: locationForm.id,
                      name: locationForm.name,
                      nameEn: locationForm.nameEn,
                      order: locationForm.order,
                      isActive: locationForm.isActive,
                      areasText: locationForm.areasText,
                    }}
                    onChange={(patch) => setLocationForm((current) => ({ ...current, ...patch }))}
                    onSave={() => void saveLocation()}
                    onCancel={() => {
                      setNeighborhoodFormVisible(false);
                      setLocationForm(initialLocationForm);
                    }}
                  />
                )}
              <NeighborhoodsManagePage
                city={neighborhoodManage.city}
                provinceName={neighborhoodManage.provinceName}
                onBack={closeNeighborhoodManage}
                onEdit={(n) => {
                  editLocation('neighborhood', n, {
                    provinceId: neighborhoodManage.provinceId,
                    cityId: neighborhoodManage.city.id,
                  });
                  setNeighborhoodFormVisible(true);
                }}
                onDelete={(id) => deleteLocation('neighborhood', id)}
                onAdd={() => {
                  startAddNeighborhood({
                    provinceId: neighborhoodManage.provinceId,
                    cityId: neighborhoodManage.city.id,
                  });
                  setNeighborhoodFormVisible(true);
                }}
              />
            </>
          )}

          {!isLoading && section === 'locations' && !neighborhoodManage && (
            <div className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
              <Panel
                variant="form"
                title={locationForm.id ? 'ویرایش موقعیت' : 'افزودن موقعیت'}
                description="استان، شهر و محله به صورت سلسله‌مراتبی مدیریت می‌شود."
                icon={MapPinned}
                className="h-fit xl:sticky xl:top-20"
              >
                <div className="space-y-4">
                <Field label="نوع">
                  <Select value={locationForm.type} onValueChange={(value) => setLocationForm({ ...locationForm, type: value as LocationType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="province">استان</SelectItem>
                      <SelectItem value="city">شهر</SelectItem>
                      <SelectItem value="neighborhood">محله</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {locationForm.type !== 'province' && (
                  <Field label="استان والد">
                    <Select value={locationForm.provinceId || selectedProvince?.id || ''} onValueChange={(value) => setLocationForm({ ...locationForm, provinceId: value, cityId: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem key={province.id} value={province.id}>{province.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                {locationForm.type === 'neighborhood' && (
                  <Field label="شهر والد">
                    <Select value={locationForm.cityId || selectedCity?.id || ''} onValueChange={(value) => setLocationForm({ ...locationForm, cityId: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {cities.map((city, cityIndex) => (
                          <SelectItem key={`${selectedProvince?.id || 'province'}-${city.id}-${cityIndex}`} value={city.id}>{city.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field label="نام فارسی">
                  <Input value={locationForm.name} onChange={(event) => setLocationForm({ ...locationForm, name: event.target.value })} />
                </Field>
                <Field label="نام انگلیسی">
                  <Input dir="ltr" value={locationForm.nameEn} onChange={(event) => setLocationForm({ ...locationForm, nameEn: event.target.value })} />
                </Field>
                <Field label="ترتیب">
                  <PersianDigitInput
                    variant="plain"
                    value={locationForm.order}
                    onChange={(order) => setLocationForm({ ...locationForm, order })}
                  />
                </Field>
                {locationForm.type === 'neighborhood' && (
                  <Field label="زیرمحدوده‌ها (هر خط یا با ویرگول)">
                    <Textarea
                      value={locationForm.areasText}
                      onChange={(event) =>
                        setLocationForm({ ...locationForm, areasText: event.target.value })
                      }
                      placeholder={'بهارستان\nارغوان\nرضاشهر'}
                      className="min-h-[100px]"
                    />
                  </Field>
                )}
                <div className="grid gap-2">
                  <AdminToggleRow label="فعال باشد">
                    <Switch checked={locationForm.isActive} onCheckedChange={(checked) => setLocationForm({ ...locationForm, isActive: checked })} />
                  </AdminToggleRow>
                  {locationForm.type === 'city' && (
                    <>
                      <AdminToggleRow label="شهر محبوب">
                        <Switch checked={locationForm.isPopular} onCheckedChange={(checked) => setLocationForm({ ...locationForm, isPopular: checked })} />
                      </AdminToggleRow>
                      <AdminToggleRow label="جزیره">
                        <Switch checked={locationForm.isIsland} onCheckedChange={(checked) => setLocationForm({ ...locationForm, isIsland: checked })} />
                      </AdminToggleRow>
                    </>
                  )}
                </div>
                <AdminPanelActions>
                  <Button onClick={saveLocation} className="admin-btn-save flex-1">
                    <Save className="size-4" />
                    ذخیره
                  </Button>
                  <Button variant="outline" onClick={() => setLocationForm(initialLocationForm)}>
                    پاک‌سازی
                  </Button>
                </AdminPanelActions>
                </div>
              </Panel>

              <div className="space-y-5">
                <LocationsHierarchyView
                  provinces={provinces}
                  stats={locations?.stats}
                  onEditProvince={(p) => editLocation('province', p)}
                  onDeleteProvince={(id) => deleteLocation('province', id)}
                  onEditCity={(city, provinceId) => editLocation('city', city, { provinceId })}
                  onDeleteCity={(id) => deleteLocation('city', id)}
                  onManageNeighborhoods={openNeighborhoodManage}
                />
              </div>
            </div>
          )}

          {!isLoading && section === 'system' && (
            <div className="space-y-4">
              <Panel title="حاکمیت و عملیات حساس" description="کنترل‌های اصلی برای نقش‌ها، دسترسی‌ها و عملیات سطح مالک." icon={ServerCog}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button variant="outline" className="h-14 justify-start rounded-lg" onClick={() => window.location.assign('/admin/users')}>
                    <Users className="size-5" />
                    مدیریت کاربران، نقش‌ها و مسدودسازی
                    <ArrowUpRight className="me-auto size-4" />
                  </Button>
                  <Button variant="outline" className="h-14 justify-start rounded-lg" onClick={() => setSection('categories')}>
                    <FolderTree className="size-5" />
                    ساخت و ویرایش ساختار خدمات
                    <ArrowUpRight className="me-auto size-4" />
                  </Button>
                  <Button variant="outline" className="h-14 justify-start rounded-lg" onClick={() => setSection('locations')}>
                    <MapPinned className="size-5" />
                    مدیریت استان، شهر و محله
                    <ArrowUpRight className="me-auto size-4" />
                  </Button>
                  <Button variant="outline" className="h-14 justify-start rounded-lg" onClick={loadAll}>
                    <RefreshCcw className="size-5" />
                    بازخوانی داده‌های مدیریتی
                    <ArrowUpRight className="me-auto size-4" />
                  </Button>
                </div>
              </Panel>

              <RbacManager />

              <div className="grid gap-4 xl:grid-cols-3">
                <GovernanceItem
                  icon={ShieldCheck}
                  title="سیاست دسترسی"
                  description={`نقش SUPER_ADMIN فقط برای شماره ${SUPER_ADMIN_PHONE} معتبر است و در API هم دوباره بررسی می‌شود.`}
                />
                <GovernanceItem
                  icon={Command}
                  title="دامنه عملیات"
                  description="دسته‌بندی‌ها، موقعیت‌ها، کاربران و شاخص‌های پلتفرم از یک نقطه کنترل می‌شوند."
                />
                <GovernanceItem
                  icon={Settings2}
                  title="مدیریت تغییر"
                  description="حذف دسته‌بندی‌های دارای وابستگی به غیرفعال‌سازی امن تبدیل می‌شود تا داده‌های سایت آسیب نبینند."
                />
              </div>

              <Separator />

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-7 text-amber-900 dark:text-amber-200">
                عملیات این صفحه مستقیم روی ساختار عمومی سایت اثر می‌گذارد؛ قبل از حذف یا غیرفعال‌سازی، وابستگی‌های دسته‌بندی و موقعیت را بررسی کنید.
              </div>
            </div>
          )}
    </div>
  );
}
