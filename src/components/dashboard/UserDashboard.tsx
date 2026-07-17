'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
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
  Phone,
  MapPin,
  Clock,
  DollarSign,
  BadgeCheck,
  ChevronLeft,
  Shield,
  Check,
  AtSign,
  AlertCircle,
  Loader2,
  MapPinned,
  Pencil,
  Sparkles,
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
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions';
import { NeedResolveWizard } from '@/components/need/NeedResolveWizard';
import { WalletHistory } from '@/components/dashboard/WalletHistory';
import { SubscriptionPlanCard } from '@/components/dashboard/SubscriptionPlanCard';
import { canManageBusinessProfile } from '@/lib/business/can-manage-business-profile';
import { routeBuilder } from '@/config/routes';
import { toPersianDigits } from '@/lib/format/digits';

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

  useEffect(() => {
    if (!authHydrated || !isAuthenticated || activeTab !== 'wallet') return;
    void (async () => {
      try {
        const res = await apiFetch<{ wallet: { balance: number } }>('/api/wallet');
        setWalletBalance(res.wallet?.balance ?? 0);
      } catch {
        setWalletBalance(0);
      }
    })();
  }, [authHydrated, isAuthenticated, activeTab, currentUser?.id]);

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
    <div className="min-w-0 space-y-8">
        {/* ============ WELCOME HEADER ============ */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/15 sm:h-16 sm:w-16">
              <AvatarImage src={currentUser.avatar} alt={currentUser.firstName} />
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary sm:text-xl">
                {getInitials(currentUser.firstName, currentUser.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <h2 className="truncate text-xl font-bold text-foreground sm:text-2xl">
                {currentUser.firstName?.trim()
                  ? `سلام، ${currentUser.firstName} عزیز!`
                  : 'سلام، خوش آمدید!'}
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                {currentUser.username ? (
                  <span className="inline-flex items-center gap-1">
                    <AtSign className="size-3.5" />
                    {currentUser.username}
                  </span>
                ) : (
                  'برای تکمیل پروفایل، نام کاربری انتخاب کنید'
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {currentUser.isVerified && (
              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
                <BadgeCheck className="size-3.5" />
                تأیید شده
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1">
              <Shield className="size-3.5" />
              {canManageBusiness ? 'کسب‌وکار' : 'کاربر'}
            </Badge>
          </div>
        </div>

        {/* ============ QUICK ACTIONS ============ */}
        <DashboardQuickActions
          isBusiness={canManageBusiness}
          onWalletTab={() => handleTabChange('wallet')}
        />

        {/* ============ STATS CARDS ============ */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: ClipboardList,
              label: 'نیازهای فعال',
              value: toPersianDigits(String(
                dashboardStats?.activeRequests ??
                  userRequests.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length
              )),
              tone: 'text-primary bg-primary/10',
            },
            {
              icon: MessageSquare,
              label: 'پیشنهادهای دریافتی',
              value: dashboardStats == null ? '—' : toPersianDigits(String(dashboardStats.pendingProposals)),
              tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
            },
            {
              icon: CheckCircle,
              label: 'پروژه‌های تکمیل شده',
              value: dashboardStats == null ? '—' : toPersianDigits(String(dashboardStats.completedProjects)),
              tone: 'text-sky-600 bg-sky-500/10 dark:text-sky-400',
            },
            {
              icon: Star,
              label: 'امتیاز شما',
              value: dashboardStats == null ? '—' : toPersianDigits(String(dashboardStats.avgRating)),
              tone: 'text-rose-600 bg-rose-500/10 dark:text-rose-400',
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/60 shadow-none">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}>
                  <stat.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground sm:text-2xl">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {currentUser.role === 'SPECIALIST' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">لیدهای دریافتی</h3>
            </div>
            <p className="-mt-2 text-sm text-muted-foreground">
              مشتریانی که با نیازشان به شما معرفی شده‌اند
            </p>
            <div className="space-y-4">
              <SmartLeadsSection />
              <PrivateLeadsPanel />
            </div>
          </div>
        )}

        {/* ============ MAIN TABS ============ */}
        <div>
          <Tabs value={activeTab} onValueChange={handleTabChange} dir="rtl" className="w-full">
            <TabsList className="mb-6 flex h-auto w-full gap-1 overflow-x-auto rounded-xl border border-border/40 bg-muted/60 p-1.5 shadow-sm backdrop-blur-xs flex-nowrap md:flex-wrap">
              <TabsTrigger value="requests" className="flex-1 min-w-[7rem] shrink-0 min-h-11 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary rounded-lg py-2.5 text-xs sm:text-sm transition-all duration-150">
                <ClipboardList className="w-4 h-4 ms-1.5" />نیازهای من
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex-1 min-w-[7rem] shrink-0 min-h-11 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary rounded-lg py-2.5 text-xs sm:text-sm transition-all duration-150">
                <Wallet className="w-4 h-4 ms-1.5" />کیف پول
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex-1 min-w-[7rem] shrink-0 min-h-11 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary rounded-lg py-2.5 text-xs sm:text-sm transition-all duration-150">
                <UserIcon className="w-4 h-4 ms-1.5" />پروفایل
              </TabsTrigger>
            </TabsList>

            {/* ============ TAB 1: MY NEEDS ============ */}
            <TabsContent value="requests">
              <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2">
                {[
                  { key: 'ALL', label: 'همه' },
                  { key: 'OPEN', label: 'باز' },
                  { key: 'IN_PROGRESS', label: 'در حال انجام' },
                  { key: 'COMPLETED', label: 'تکمیل شده' },
                ].map((filter) => (
                  <Button key={filter.key} variant={requestFilter === filter.key ? 'default' : 'outline'} size="sm" onClick={() => setRequestFilter(filter.key)} className="rounded-full px-4 shrink-0">{filter.label}</Button>
                ))}
              </div>
              <div className="space-y-4">
                {requestsLoading ? (
                  <Card>
                    <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                      <Loader2 className="size-5 animate-spin" />
                      در حال بارگذاری آگهی‌ها…
                    </CardContent>
                  </Card>
                ) : filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-12 text-center">
                    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
                      <ClipboardList className="size-7 text-muted-foreground/70" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {requestFilter === 'ALL' ? 'هنوز نیازی ثبت نکرده‌اید' : 'نیازی با این فیلتر یافت نشد'}
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      {requestFilter === 'ALL'
                        ? 'نیاز خود را بنویسید تا بهترین کسب‌وکارهای شهرتان به شما پیشنهاد بدهند.'
                        : 'فیلتر دیگری را امتحان کنید یا همه را ببینید.'}
                    </p>
                    {requestFilter === 'ALL' ? (
                      <Button className="mt-5 gap-2" asChild>
                        <Link href={routeBuilder.needNew()}>
                          <Plus className="size-4" />
                          ثبت نیاز جدید
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  filteredRequests.map((request) => (
                    <Card key={request.id} className="hover:border-emerald-300/50 dark:hover:border-emerald-700/50 transition-all duration-150 hover:shadow-md hover:shadow-emerald-500/5">
                      <CardContent className="p-4 sm:p-6">
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
                                <CheckCircle className="w-4 h-4 ms-1" />
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
                              مشاهده<ChevronLeft className="w-4 h-4 me-1" />
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
            <TabsContent value="wallet" className="space-y-6">
              {canManageBusiness && <SubscriptionPlanCard />}
              <WalletHistory balance={walletBalance ?? undefined} />
            </TabsContent>

            {/* ============ TAB 4: PROFILE ============ */}
            <TabsContent value="profile">
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><UserIcon className="w-5 h-5" />ویرایش پروفایل</CardTitle>
                  <CardDescription>اطلاعات حساب کاربری خود را مدیریت کنید</CardDescription>
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
                    <Button onClick={handleProfileSave} className="gap-2" size="touch" title="ذخیره تغییرات پروفایل">
                      <Save className="w-4 h-4" />ذخیره تغییرات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
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
