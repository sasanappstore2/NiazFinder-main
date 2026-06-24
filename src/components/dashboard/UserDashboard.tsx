'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ClipboardList,
  MessageSquare,
  CheckCircle,
  Star,
  Wallet,
  Save,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  BadgeCheck,
  ChevronLeft,
  Check,
  AtSign,
  AlertCircle,
  Loader2,
  MapPinned,
  Pencil,
  Plus,
} from 'lucide-react';
import {
  detectUserCity,
  detectUserLocationFromGps,
  GeoLocationError,
  isGeolocationSupported,
} from '@/lib/location/detect-user-city';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api-client';
import { formatBudgetRange, getStatusLabel, getTimeAgo } from '@/lib/constants';
import type { ServiceRequest } from '@/lib/types';
import { SmartLeadsSection } from '@/components/dashboard/SmartLeadsSection';
import { PrivateLeadsPanel } from '@/components/dashboard/PrivateLeadsPanel';
import { NeedResolveWizard } from '@/components/need/NeedResolveWizard';
import { WalletHistory } from '@/components/dashboard/WalletHistory';
import { PageContainer } from '@/components/layout/PageContainer';
import { canManageBusinessProfile } from '@/lib/business/can-manage-business-profile';
import { routeBuilder } from '@/config/routes';
import { toPersianDigits } from '@/lib/format/digits';
import { cn } from '@/lib/utils';

// ============ MOCK DATA (wallet API not wired yet) ============

interface DashboardStats {
  totalRequests: number;
  activeRequests: number;
  completedProjects: number;
  pendingProposals: number;
  avgRating: number;
}

// ============ HELPERS ============

function getStatusColor(status: string): string {
  switch (status) {
    case 'OPEN': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200';
    case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200';
    case 'COMPLETED': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200';
    case 'CLOSED': case 'CANCELLED': return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200';
    case 'ACCEPTED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200';
    case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200';
    case 'REJECTED': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200';
  }
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`;
}

/** Profile completeness over a stable 6-field set — drives the momentum ring. */
interface CompletenessUser {
  avatar?: string | null;
  bio?: string | null;
  city?: string | null;
  phone?: string | null;
  username?: string | null;
  isVerified?: boolean | null;
}
function computeProfileCompleteness(u: CompletenessUser | null | undefined): number {
  if (!u) return 0;
  const checks = [
    Boolean(u.avatar),
    Boolean(u.bio?.trim()),
    Boolean(u.city?.trim()),
    Boolean(u.phone?.trim()),
    Boolean(u.username?.trim()),
    Boolean(u.isVerified),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

/** Lightweight SVG completeness ring — neutral track, emerald progress. */
function ProgressRing({ value, size = 56 }: { value: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circ - (clamped / 100) * circ;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
          style={{ strokeDasharray: circ, strokeDashoffset: offset }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums text-primary">
        {toPersianDigits(clamped)}٪
      </span>
    </div>
  );
}

const DASHBOARD_TABS = ['requests', 'wallet', 'profile'] as const;
type DashboardTab = (typeof DASHBOARD_TABS)[number];

function resolveDashboardTab(param: string | null): DashboardTab {
  if (param === 'proposals' || param === 'business') return 'requests';
  if (!param || !DASHBOARD_TABS.includes(param as DashboardTab)) {
    return 'requests';
  }
  return param as DashboardTab;
}

// ============ MAIN COMPONENT ============

export function UserDashboard() {
  const { currentUser, isAuthenticated, authHydrated, setAuthModalOpen, updateProfile, updateProfileAPI, isLoading } = useAppStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const canManageBusiness = canManageBusinessProfile(currentUser?.role);
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => resolveDashboardTab(tabFromUrl));
  const [requestFilter, setRequestFilter] = useState<string>('ALL');
  const [userRequests, setUserRequests] = useState<ServiceRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [resolveRequestId, setResolveRequestId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!authHydrated || !isAuthenticated) {
      setUserRequests([]);
      setRequestsLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setRequestsLoading(true);
      try {
        const res = await apiFetch<{ data: ServiceRequest[] }>('/api/requests?mine=1&limit=50');
        if (!cancelled && res?.data) setUserRequests(res.data);
      } catch {
        if (!cancelled) toast.error('بارگذاری آگهی‌های شما ناموفق بود');
      } finally {
        if (!cancelled) setRequestsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, isAuthenticated, currentUser?.id]);

  const reloadRequests = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: ServiceRequest[] }>('/api/requests?mine=1&limit=50');
      if (res?.data) setUserRequests(res.data);
    } catch {
      toast.error('بارگذاری آگهی\u200cهای شما ناموفق بود');
    }
  }, []);

  // Fetch wallet on mount (not only on the wallet tab) so the hero can show the
  // real balance — same endpoint, just earlier.
  useEffect(() => {
    if (!authHydrated || !isAuthenticated) return;
    void (async () => {
      try {
        const res = await apiFetch<{ wallet: { balance: number } }>('/api/wallet');
        setWalletBalance(res.wallet?.balance ?? 0);
      } catch {
        setWalletBalance(0);
      }
    })();
  }, [authHydrated, isAuthenticated, currentUser?.id]);

  useEffect(() => {
    if (!authHydrated || !isAuthenticated) {
      setDashboardStats(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch<{ stats: DashboardStats }>('/api/dashboard');
        if (!cancelled && res?.stats) setDashboardStats(res.stats);
      } catch {
        // stats are optional — requests tab still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, isAuthenticated, currentUser?.id]);

  useEffect(() => {
    setActiveTab(resolveDashboardTab(tabFromUrl));
  }, [tabFromUrl]);

  useEffect(() => {
    if (tabFromUrl === 'business' && canManageBusiness) {
      router.replace(routeBuilder.myBusiness());
    }
  }, [tabFromUrl, canManageBusiness, router]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(resolveDashboardTab(value));
  }, []);

  const filteredRequests = useMemo(() => {
    if (requestFilter === 'ALL') return userRequests;
    return userRequests.filter((r) => r.status === requestFilter);
  }, [requestFilter, userRequests]);

  const initialProfile = useMemo(() => ({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    city: currentUser?.city || '',
    bio: currentUser?.bio || '',
    username: currentUser?.username || '',
  }), [currentUser]);

  const completeness = useMemo(() => computeProfileCompleteness(currentUser), [currentUser]);

  // The single highest-payoff next step (Hick's law: collapse N choices → 1).
  // Incomplete profile (goal-gradient nudge) beats posting; both routes are robust.
  const nextBestAction = useMemo(() => {
    if (completeness < 100) {
      return { label: 'تکمیل پروفایل', goProfile: true };
    }
    if (userRequests.length === 0) {
      return { label: 'ثبت اولین نیاز', goProfile: false };
    }
    return { label: 'ثبت نیاز جدید', goProfile: false };
  }, [completeness, userRequests.length]);

  const [profileForm, setProfileForm] = useState(initialProfile);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/;

  const validateUsername = useCallback((value: string): string | null => {
    if (!value || value.trim() === '') return null;
    const v = value.trim();
    if (v.length < 3) return 'نام کاربری باید حداقل ۳ کاراکتر باشد';
    if (v.length > 30) return 'نام کاربری نمی‌تواند بیشتر از ۳۰ کاراکتر باشد';
    if (!/^[a-zA-Z]/.test(v)) return 'نام کاربری باید با یک حرف انگلیسی شروع شود';
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'فقط حروف انگلیسی، اعداد و خط تیره (_) مجاز است';
    if (!USERNAME_REGEX.test(v)) return 'نام کاربری نامعتبر است';
    return null;
  }, []);

  const handleUsernameChange = useCallback((value: string) => {
    const sanitized = value.replace(/[^a-zA-Z0-9_]/g, '');
    setProfileForm((prev) => ({ ...prev, username: sanitized }));
    setUsernameError(validateUsername(sanitized));
  }, [validateUsername]);

  const handleDetectLocation = useCallback(async () => {
    if (!isGeolocationSupported()) {
      toast.error('مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند.');
      return;
    }

    setIsDetectingLocation(true);
    try {
      const geo = await detectUserLocationFromGps({ highAccuracy: true });
      if (geo?.cityName) {
        setProfileForm((prev) => ({ ...prev, city: geo.cityName }));
        toast.success('شهر شما تشخیص داده شد', { description: geo.cityName });
        return;
      }

      const nearest = await detectUserCity();
      if (nearest?.name) {
        setProfileForm((prev) => ({ ...prev, city: nearest.name }));
        toast.success('شهر شما تشخیص داده شد', { description: nearest.name });
        return;
      }

      toast.error('شهر از موقعیت شما پیدا نشد.');
    } catch (e) {
      if (e instanceof GeoLocationError && e.code === 'denied') {
        toast.error('اجازه دسترسی به موقعیت داده نشد. در تنظیمات مرورگر اجازه دهید.');
      } else {
        toast.error('تشخیص موقعیت ناموفق بود.');
      }
    } finally {
      setIsDetectingLocation(false);
    }
  }, []);

  if (!isAuthenticated || !currentUser) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6 p-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-linear-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 flex items-center justify-center shadow-sm">
            <UserIcon className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">دسترسی محدود است</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">لطفاً ابتدا وارد حساب کاربری خود شوید</p>
          </div>
          <Button onClick={() => setAuthModalOpen(true)} size="lg" className="px-8" title="ورود به حساب کاربری">ورود به حساب کاربری</Button>
        </div>
      </div>
    );
  }

  const handleProfileSave = async () => {
    // Validate username if set
    const usernameVal = profileForm.username.trim();
    if (usernameVal) {
      const err = validateUsername(usernameVal);
      if (err) {
        setUsernameError(err);
        toast.error(err);
        return;
      }
    }
    updateProfile({
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      email: profileForm.email,
      phone: profileForm.phone,
      city: profileForm.city,
      bio: profileForm.bio,
      username: profileForm.username || undefined,
    });
    const success = await updateProfileAPI({
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      email: profileForm.email,
      phone: profileForm.phone,
      city: profileForm.city,
      bio: profileForm.bio,
      username: profileForm.username || null,
    });
    if (success) {
      toast.success('پروفایل با موفقیت ذخیره شد');
    } else {
      const apiError = useAppStore.getState().error;
      toast.error(apiError || 'خطا در ذخیره پروفایل');
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <PageContainer width="wide" className="py-5 sm:py-6 space-y-5" noVerticalPadding>
        {/* ============ ACCOUNT HERO ============ */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          {/* the single saturated brand touch — a hairline emerald top edge */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-linear-to-l from-emerald-400 via-emerald-500 to-emerald-600" />

          {/* Zone A — identity + momentum ring */}
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <Avatar className="size-12 sm:size-14 shrink-0 ring-2 ring-primary/15 ring-offset-2 ring-offset-card">
              <AvatarImage src={currentUser.avatar} alt={currentUser.firstName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
                {getInitials(currentUser.firstName, currentUser.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base sm:text-lg font-bold tracking-tight text-foreground">
                  سلام {currentUser.firstName} 👋
                </h1>
                {currentUser.isVerified && (
                  <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="حساب تأییدشده" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {currentUser.username ? (
                  <span className="inline-flex min-w-0 items-center gap-1 truncate" dir="ltr">
                    <AtSign className="size-3 shrink-0" />
                    {currentUser.username}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="text-primary hover:underline"
                  >
                    نام کاربری تعیین نشده
                  </button>
                )}
                <span className="text-border" aria-hidden>·</span>
                <span className="shrink-0">{currentUser.role === 'CLIENT' ? 'کاربر' : 'کسب‌وکار'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="shrink-0 rounded-full transition-transform hover:scale-105"
              title={`پروفایلت ${toPersianDigits(completeness)}٪ کامله`}
              aria-label="تکمیل پروفایل"
            >
              <ProgressRing value={completeness} />
            </button>
          </div>

          {/* Zone B — wallet balance + the single next-best action. Stacks on
              mobile (8-digit balances + a CTA never fit one row) → CTA full-width. */}
          <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">موجودی کیف پول</p>
              <p className="mt-0.5 flex items-baseline gap-1.5 text-lg sm:text-2xl font-bold tabular-nums tracking-tight text-foreground">
                <Wallet className="size-4 shrink-0 self-center text-amber-500" />
                {walletBalance == null ? (
                  <span className="inline-block h-6 w-20 rounded bg-muted animate-pulse" />
                ) : (
                  walletBalance.toLocaleString('fa-IR')
                )}
                <span className="text-xs font-medium text-muted-foreground">تومان</span>
              </p>
            </div>
            <Button
              onClick={() =>
                nextBestAction.goProfile
                  ? setActiveTab('profile')
                  : router.push(routeBuilder.needNew())
              }
              className="h-11 w-full shrink-0 gap-1.5 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
              title={nextBestAction.label}
            >
              {nextBestAction.goProfile ? <UserIcon className="size-4" /> : <Plus className="size-4" />}
              <span className="text-sm">{nextBestAction.label}</span>
            </Button>
          </div>

          {/* Zone C — compact metric strip (a calm "account statement", no rainbow) */}
          <div className="grid grid-cols-4 divide-x divide-x-reverse divide-border/60 border-t border-border/60">
            {[
              {
                label: 'نیازهای فعال',
                value: toPersianDigits(
                  dashboardStats?.activeRequests ??
                    userRequests.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length
                ),
                active: true,
                loading: false,
              },
              {
                label: 'پیشنهادها',
                value: dashboardStats ? toPersianDigits(dashboardStats.pendingProposals) : null,
                active: false,
                loading: dashboardStats === null,
              },
              {
                label: 'تکمیل‌شده',
                value: dashboardStats ? toPersianDigits(dashboardStats.completedProjects) : null,
                active: false,
                loading: dashboardStats === null,
              },
              {
                label: 'امتیاز',
                value: dashboardStats?.avgRating ? toPersianDigits(dashboardStats.avgRating) : '—',
                active: false,
                loading: dashboardStats === null,
                star: Boolean(dashboardStats?.avgRating),
              },
            ].map((m) => (
              <div key={m.label} className="px-2 py-3 text-center">
                <div
                  className={cn(
                    'inline-flex items-baseline justify-center gap-1 text-lg sm:text-2xl font-bold leading-none tabular-nums',
                    m.active ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {m.loading ? (
                    <span className="inline-block h-6 w-7 rounded bg-muted animate-pulse" />
                  ) : (
                    <>
                      {m.value}
                      {m.star && <Star className="size-3.5 self-center text-amber-500" />}
                    </>
                  )}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs leading-tight text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {canManageBusiness && (
          <div className="mb-6">
            <SmartLeadsSection />
            {canManageBusiness ? <PrivateLeadsPanel /> : null}
          </div>
        )}

        {/* ============ MAIN TABS ============ */}
        <div>
          <Tabs value={activeTab} onValueChange={handleTabChange} dir="rtl" className="w-full">
            <TabsList className="mb-5 grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border/60 bg-muted/50 p-1">
              <TabsTrigger value="requests" className="min-h-10 rounded-lg py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <ClipboardList className="w-4 h-4 ml-1.5" />نیازهای من
              </TabsTrigger>
              <TabsTrigger value="wallet" className="min-h-10 rounded-lg py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <Wallet className="w-4 h-4 ml-1.5" />کیف پول
              </TabsTrigger>
              <TabsTrigger value="profile" className="min-h-10 rounded-lg py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <UserIcon className="w-4 h-4 ml-1.5" />پروفایل
              </TabsTrigger>
            </TabsList>

            {/* ============ TAB 1: MY NEEDS ============ */}
            <TabsContent value="requests">
              <div className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  { key: 'ALL', label: 'همه' },
                  { key: 'OPEN', label: 'باز' },
                  { key: 'IN_PROGRESS', label: 'در حال انجام' },
                  { key: 'COMPLETED', label: 'تکمیل شده' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setRequestFilter(filter.key)}
                    className={cn(
                      'min-h-9 shrink-0 whitespace-nowrap rounded-md px-3.5 text-xs font-medium transition-colors',
                      requestFilter === filter.key
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {requestsLoading ? (
                  <Card className="rounded-xl border-border/70 shadow-none">
                    <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                      <Loader2 className="size-5 animate-spin" />
                      در حال بارگذاری نیازها…
                    </CardContent>
                  </Card>
                ) : filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-12 text-center">
                    <div className="grid size-12 place-items-center rounded-full bg-primary/10">
                      <ClipboardList className="size-6 text-primary" />
                    </div>
                    {userRequests.length === 0 ? (
                      <>
                        <p className="text-sm font-medium text-foreground">هنوز نیازی ثبت نکرده‌ای</p>
                        <p className="max-w-xs text-xs text-muted-foreground">
                          اولین نیازت رو ثبت کن تا کسب‌وکارها برات پیشنهاد بفرستن
                        </p>
                        <Button
                          onClick={() => router.push(routeBuilder.needNew())}
                          className="mt-1 h-10 gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Plus className="size-4" />
                          ثبت اولین نیاز
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">نیازی با این فیلتر نیست</p>
                        <Button variant="ghost" size="sm" onClick={() => setRequestFilter('ALL')} className="text-primary hover:text-primary">
                          نمایش همه
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  filteredRequests.map((request) => (
                    <Card key={request.id} className="rounded-xl border-border/70 shadow-none transition-colors hover:border-primary/30">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-base text-foreground truncate max-w-full">{request.categoryIcon} {request.title}</h3>
                              <Badge variant="outline" className="text-xs shrink-0">{request.categoryName}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${getStatusColor(request.status)}`}>{getStatusLabel(request.status)}</Badge>
                              {request.moderationStatus && request.moderationStatus !== 'APPROVED' ? (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                                  {request.moderationStatus === 'PENDING'
                                    ? 'در صف بازبینی'
                                    : request.moderationStatus === 'REJECTED_SOFT'
                                      ? 'نیاز به اصلاح'
                                      : 'رد شده'}
                                </Badge>
                              ) : null}
                              <Badge variant="secondary" className="text-xs">
                                {request.priority === 'URGENT' ? '🔴' : request.priority === 'HIGH' ? '🟠' : '🟢'}{' '}
                                اولویت: {request.priority === 'URGENT' ? 'فوری' : request.priority === 'HIGH' ? 'زیاد' : 'عادی'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" />{formatBudgetRange(request.budgetMin, request.budgetMax)}</span>
                              <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" />{request.proposalCount} پیشنهاد</span>
                              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{getTimeAgo(request.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {(request.status === 'OPEN' || request.status === 'IN_PROGRESS') ? (
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => setResolveRequestId(request.id)}
                              >
                                <CheckCircle className="w-4 h-4 ml-1" />
                                نیازم رفع شد
                              </Button>
                            ) : null}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => router.push(routeBuilder.needEdit(request.id))}
                              title="ویرایش آگهی"
                            >
                              <Pencil className="w-4 h-4" />
                              ویرایش
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => router.push(routeBuilder.listing(request.id, request.title))}
                              title="مشاهده جزئیات نیاز"
                            >
                              مشاهده<ChevronLeft className="w-4 h-4 mr-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ============ TAB 2: WALLET & PAYMENTS ============ */}
            <TabsContent value="wallet">
              <WalletHistory balance={walletBalance ?? undefined} />
            </TabsContent>

            {/* ============ TAB 4: PROFILE ============ */}
            <TabsContent value="profile">
              <Card className="rounded-xl border-border/70 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><UserIcon className="w-5 h-5" />حساب کاربری</CardTitle>
                  <CardDescription>اطلاعاتت رو به‌روز نگه دار</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">نام</Label>
                      <Input id="firstName" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} placeholder="نام" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">نام خانوادگی</Label>
                      <Input id="lastName" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} placeholder="نام خانوادگی" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">ایمیل</Label>
                    <Input id="email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="email@example.com" dir="ltr" className="text-start" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">شماره تماس</Label>
                      <Input id="phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="۰۹۱۲۱۲۳۴۵۶۷" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">شهر</Label>
                      <div className="flex gap-2">
                        <Input
                          id="city"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                          placeholder="شهر"
                          className="min-w-0 flex-1"
                          disabled={isDetectingLocation}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 shrink-0 gap-1.5 px-3"
                          disabled={isDetectingLocation || !isGeolocationSupported()}
                          onClick={() => void handleDetectLocation()}
                          title="تشخیص شهر از موقعیت من"
                        >
                          {isDetectingLocation ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MapPinned className="w-4 h-4" />
                          )}
                          <span className="text-sm">موقعیت من</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">نام کاربری</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none select-none" dir="ltr">@</span>
                      <Input
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        placeholder="مثلاً: sasan_rashidi"
                        dir="ltr"
                        className={`pl-8 text-left font-sans tabular-nums ${usernameError ? 'border-rose-400 focus-visible:ring-rose-400' : ''}`}
                        maxLength={30}
                      />
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                      <span>نام کاربری برای جستجوی شما در بخش پیام‌ها استفاده می‌شود</span>
                    </div>
                    {usernameError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-500">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{usernameError}</span>
                      </div>
                    )}
                    {profileForm.username && !usernameError && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>نام کاربری معتبر است</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">درباره من</Label>
                    <Textarea id="bio" value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="توضیحات کوتاه درباره خودتان" rows={4} />
                  </div>
                  <Separator />
                  <div className="flex justify-end">
                    <Button onClick={handleProfileSave} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" title="ذخیره تغییرات پروفایل">
                      <Save className="w-4 h-4" />ذخیره تغییرات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
      {resolveRequestId ? (
        <NeedResolveWizard
          requestId={resolveRequestId}
          open={!!resolveRequestId}
          onOpenChange={(open) => { if (!open) setResolveRequestId(null); }}
          onResolved={() => void reloadRequests()}
        />
      ) : null}
      <noscript>
        <div className="sr-only">
          <h1>داشبورد کاربری - نیاز فایندر</h1>
          <p>داشبورد کاربر شامل مدیریت نیازها، پیشنهادها، کیف پول و تنظیمات پروفایل.</p>
        </div>
      </noscript>
    </div>
  );
}
