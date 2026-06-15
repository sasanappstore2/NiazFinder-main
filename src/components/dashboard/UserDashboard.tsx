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
  Shield,
  Check,
  AtSign,
  AlertCircle,
  Loader2,
  MapPinned,
  Pencil,
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
import { canManageBusinessProfile } from '@/lib/business/can-manage-business-profile';
import { routeBuilder } from '@/config/routes';

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
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ============ WELCOME HEADER ============ */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-l from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 text-white shadow-xl shadow-emerald-600/20">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white" />
            <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-white" />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-white/30 shadow-lg">
              <AvatarImage src={currentUser.avatar} alt={currentUser.firstName} />
              <AvatarFallback className="text-xl sm:text-2xl bg-white/20 text-white font-bold">
                {getInitials(currentUser.firstName, currentUser.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold">سلام، {currentUser.firstName} عزیز!</h1>
                <p className="text-white/80 text-sm sm:text-base">
                  {currentUser.username ? (
                    <span className="inline-flex items-center gap-1"><AtSign className="w-3.5 h-3.5" />{currentUser.username}</span>
                  ) : 'نام کاربری تعیین نشده'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              {currentUser.isVerified && (
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 gap-1"><BadgeCheck className="w-3.5 h-3.5" />تأیید شده</Badge>
              )}
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 gap-1"><Shield className="w-3.5 h-3.5" />{currentUser.role === 'CLIENT' ? 'کاربر' : 'کسب‌وکار'}</Badge>
            </div>
          </div>
        </div>

        {/* ============ STATS CARDS ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: ClipboardList,
              label: 'نیازهای فعال',
              value: String(
                dashboardStats?.activeRequests ??
                  userRequests.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length
              ),
              gradient: 'from-emerald-500 to-emerald-600',
              shadow: 'shadow-emerald-500/10',
            },
            {
              icon: MessageSquare,
              label: 'پیشنهادهای دریافتی',
              value: String(dashboardStats?.pendingProposals ?? '—'),
              gradient: 'from-amber-500 to-amber-600',
              shadow: 'shadow-amber-500/10',
            },
            {
              icon: CheckCircle,
              label: 'پروژه‌های تکمیل شده',
              value: String(dashboardStats?.completedProjects ?? '—'),
              gradient: 'from-cyan-500 to-cyan-600',
              shadow: 'shadow-cyan-500/10',
            },
            {
              icon: Star,
              label: 'امتیاز شما',
              value: dashboardStats?.avgRating ? String(dashboardStats.avgRating) : '—',
              gradient: 'from-rose-500 to-rose-600',
              shadow: 'shadow-rose-500/10',
            },
          ].map((stat) => (
            <Card key={stat.label} className="relative overflow-hidden border-0 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-150" style={{ boxShadow: undefined }}>
              <div className={`absolute inset-0 bg-linear-to-bl ${stat.gradient}`} />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
              <CardContent className="relative p-5 sm:p-6 flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <stat.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white/80 text-xs sm:text-sm">{stat.label}</p>
                  <p className="text-white text-2xl sm:text-3xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {canManageBusiness && (
          <div className="mb-6">
            <SmartLeadsSection />
          </div>
        )}

        {/* ============ MAIN TABS ============ */}
        <div>
          <Tabs value={activeTab} onValueChange={handleTabChange} dir="rtl" className="w-full">
            <TabsList className="mb-6 flex h-auto w-full gap-1 overflow-x-auto rounded-xl border border-border/40 bg-muted/60 p-1.5 shadow-sm backdrop-blur-xs flex-nowrap sm:flex-wrap">
              <TabsTrigger value="requests" className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-emerald-700 data-[state=active]:dark:text-emerald-400 rounded-lg py-2.5 text-xs sm:text-sm transition-all duration-150">
                <ClipboardList className="w-4 h-4 ml-1.5" />نیازهای من
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-emerald-700 data-[state=active]:dark:text-emerald-400 rounded-lg py-2.5 text-xs sm:text-sm transition-all duration-150">
                <Wallet className="w-4 h-4 ml-1.5" />کیف پول
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-emerald-700 data-[state=active]:dark:text-emerald-400 rounded-lg py-2.5 text-xs sm:text-sm transition-all duration-150">
                <UserIcon className="w-4 h-4 ml-1.5" />پروفایل
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
                  <Card className="py-12 border-dashed border-2 border-border/60 rounded-2xl">
                    <CardContent className="text-center text-muted-foreground">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">نیازی با این فیلتر یافت نشد</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredRequests.map((request) => (
                    <Card key={request.id} className="hover:border-emerald-300/50 dark:hover:border-emerald-700/50 transition-all duration-150 hover:shadow-md hover:shadow-emerald-500/5">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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
              <Card className="border-border/50 shadow-md">
                <CardContent className="py-16 text-center space-y-3">
                  <Wallet className="w-10 h-10 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    کیف پول و تراکنش‌ها به‌زودی از API واقعی متصل می‌شوند.
                  </p>
                </CardContent>
              </Card>
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
                    <Button onClick={handleProfileSave} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" title="ذخیره تغییرات پروفایل">
                      <Save className="w-4 h-4" />ذخیره تغییرات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <noscript>
        <div className="sr-only">
          <h1>داشبورد کاربری - نیاز فایندر</h1>
          <p>داشبورد کاربر شامل مدیریت نیازها، پیشنهادها، کیف پول و تنظیمات پروفایل.</p>
        </div>
      </noscript>
    </div>
  );
}
