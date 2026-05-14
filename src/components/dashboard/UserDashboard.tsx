'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList,
  MessageSquare,
  CheckCircle,
  Star,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw,
  Percent,
  Plus,
  Save,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  FileText,
  Clock,
  DollarSign,
  BadgeCheck,
  ChevronLeft,
  Shield,
  Check,
  X,
} from 'lucide-react';
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
import { formatPrice, formatBudgetRange, getStatusLabel, getTimeAgo } from '@/lib/constants';
import type { ServiceRequest, Proposal, Transaction } from '@/lib/types';

// ============ MOCK DATA ============

const MOCK_USER_REQUESTS: ServiceRequest[] = [
  {
    id: 'ur1',
    title: 'طراحی سایت فروشگاهی آنلاین',
    slug: 'online-store-design',
    description: 'طراحی سایت فروشگاهی حرفه‌ای با سبد خرید و درگاه پرداخت',
    budgetMin: 15000000,
    budgetMax: 30000000,
    budgetType: 'FIXED',
    deliveryTime: 30,
    deliveryUnit: 'day',
    city: 'تهران',
    province: 'تهران',
    categoryId: '1',
    categoryName: 'طراحی و توسعه وب',
    categoryIcon: '💻',
    priority: 'HIGH',
    status: 'OPEN',
    tags: ['فروشگاهی', 'ریسپانسیو'],
    viewCount: 234,
    proposalCount: 12,
    user: { id: 'u1', firstName: 'محمد', lastName: 'حسینی', avatar: '', city: 'تهران', createdAt: '2024-01-15' },
    createdAt: '2024-06-10T10:30:00Z',
    updatedAt: '2024-06-10T10:30:00Z',
  },
  {
    id: 'ur2',
    title: 'تعمیر گوشی سامسونگ S23',
    slug: 'samsung-repair',
    description: 'تعویض صفحه نمایش و باتری گوشی',
    budgetMin: 2000000,
    budgetMax: 4000000,
    budgetType: 'NEGOTIABLE',
    deliveryTime: 1,
    deliveryUnit: 'day',
    city: 'تهران',
    province: 'تهران',
    categoryId: '6',
    categoryName: 'تعمیرات',
    categoryIcon: '🔧',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    tags: ['سامسونگ', 'صفحه نمایش'],
    viewCount: 89,
    proposalCount: 5,
    user: { id: 'u1', firstName: 'محمد', lastName: 'حسینی', avatar: '', city: 'تهران', createdAt: '2024-01-15' },
    createdAt: '2024-06-11T14:20:00Z',
    updatedAt: '2024-06-12T09:00:00Z',
  },
  {
    id: 'ur3',
    title: 'تولید محتوای وبلاگ شرکت',
    slug: 'blog-content',
    description: '۲۰ مقاله سئو شده در حوزه فناوری',
    budgetMin: 8000000,
    budgetMax: 15000000,
    budgetType: 'FIXED',
    deliveryTime: 20,
    deliveryUnit: 'day',
    city: 'تهران',
    province: 'تهران',
    categoryId: '3',
    categoryName: 'تولید محتوا',
    categoryIcon: '✍️',
    priority: 'NORMAL',
    status: 'COMPLETED',
    tags: ['وبلاگ', 'سئو'],
    viewCount: 156,
    proposalCount: 8,
    user: { id: 'u1', firstName: 'محمد', lastName: 'حسینی', avatar: '', city: 'تهران', createdAt: '2024-01-15' },
    createdAt: '2024-05-09T09:15:00Z',
    updatedAt: '2024-05-30T16:00:00Z',
  },
  {
    id: 'ur4',
    title: 'طراحی لوگو و هویت بصری برند',
    slug: 'logo-design',
    description: 'طراحی لوگو و هویت بصری کامل برند استارتاپ',
    budgetMin: 5000000,
    budgetMax: 10000000,
    budgetType: 'FIXED',
    deliveryTime: 14,
    deliveryUnit: 'day',
    city: 'تهران',
    province: 'تهران',
    categoryId: '4',
    categoryName: 'طراحی گرافیک',
    categoryIcon: '🎨',
    priority: 'NORMAL',
    status: 'OPEN',
    tags: ['لوگو', 'هویت بصری'],
    viewCount: 198,
    proposalCount: 15,
    user: { id: 'u1', firstName: 'محمد', lastName: 'حسینی', avatar: '', city: 'تهران', createdAt: '2024-01-15' },
    createdAt: '2024-06-08T16:45:00Z',
    updatedAt: '2024-06-08T16:45:00Z',
  },
  {
    id: 'ur5',
    title: 'نظافت منزل',
    slug: 'home-cleaning',
    description: 'نظافت کامل منزل ۳ خوابه',
    budgetMin: 1500000,
    budgetMax: 2500000,
    budgetType: 'FIXED',
    deliveryTime: 1,
    deliveryUnit: 'day',
    city: 'تهران',
    province: 'تهران',
    categoryId: '5',
    categoryName: 'خدمات خانگی',
    categoryIcon: '🏠',
    priority: 'NORMAL',
    status: 'COMPLETED',
    tags: ['نظافت', 'منزل'],
    viewCount: 67,
    proposalCount: 20,
    user: { id: 'u1', firstName: 'محمد', lastName: 'حسینی', avatar: '', city: 'تهران', createdAt: '2024-01-15' },
    createdAt: '2024-05-20T08:30:00Z',
    updatedAt: '2024-05-21T18:00:00Z',
  },
];

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'pr1',
    price: 25000000,
    deliveryTime: 25,
    deliveryUnit: 'day',
    message: 'با سلام، من بیش از ۸ سال تجربه در طراحی سایت‌های فروشگاهی دارم و می‌توانم بهترین نتیجه را به شما ارائه دهم.',
    status: 'PENDING',
    isRead: true,
    user: {
      id: 's1', firstName: 'علی', lastName: 'محمدی', avatar: '',
      rating: 4.9, projectCount: 127, isVerified: true,
      bio: 'طراح و توسعه‌دهنده وب', city: 'تهران',
    },
    createdAt: '2024-06-10T11:00:00Z',
  },
  {
    id: 'pr2',
    price: 3500000,
    deliveryTime: 1,
    deliveryUnit: 'day',
    message: 'تعویض صفحه نمایش و باتری با قطعات اورجینال انجام می‌شود. گارانتی ۶ ماهه.',
    status: 'ACCEPTED',
    isRead: true,
    user: {
      id: 's3', firstName: 'رضا', lastName: 'کریمی', avatar: '',
      rating: 4.7, projectCount: 234, isVerified: true,
      bio: 'کسب‌وکار تعمیرات موبایل و لپ‌تاپ', city: 'شیراز',
    },
    createdAt: '2024-06-11T15:00:00Z',
  },
  {
    id: 'pr3',
    price: 12000000,
    deliveryTime: 18,
    deliveryUnit: 'day',
    message: 'با توجه به نیاز شما، ۲۰ مقاله حرفه‌ای سئو شده با کلمات کلیدی مرتبط تولید خواهم کرد.',
    status: 'ACCEPTED',
    isRead: true,
    user: {
      id: 's4', firstName: 'مینا', lastName: 'حسینی', avatar: '',
      rating: 4.6, projectCount: 156, isVerified: true,
      bio: 'نویسنده و تولیدکننده محتوا', city: 'تهران',
    },
    createdAt: '2024-05-09T10:00:00Z',
  },
  {
    id: 'pr4',
    price: 7000000,
    deliveryTime: 10,
    deliveryUnit: 'day',
    message: 'طراحی لوگو و هویت بصری شامل کارت ویزیت، سربرگ و طرح شبکه‌های اجتماعی',
    status: 'PENDING',
    isRead: false,
    user: {
      id: 's2', firstName: 'سارا', lastName: 'احمدی', avatar: '',
      rating: 4.8, projectCount: 89, isVerified: true,
      bio: 'طراح گرافیک حرفه‌ای', city: 'اصفهان',
    },
    createdAt: '2024-06-08T17:30:00Z',
  },
  {
    id: 'pr5',
    price: 22000000,
    deliveryTime: 35,
    deliveryUnit: 'day',
    message: 'پیشنهاد من برای طراحی سایت فروشگاهی شامل پنل مدیریت، سبد خرید و درگاه پرداخت است.',
    status: 'REJECTED',
    isRead: true,
    user: {
      id: 's5', firstName: 'حسن', lastName: 'نجفی', avatar: '',
      rating: 4.9, projectCount: 45, isVerified: true,
      bio: 'مهندس نرم‌افزار', city: 'تبریز',
    },
    createdAt: '2024-06-10T12:00:00Z',
  },
];

const REQUEST_TITLES_MAP: Record<string, string> = {
  pr1: 'طراحی سایت فروشگاهی آنلاین',
  pr2: 'تعمیر گوشی سامسونگ S23',
  pr3: 'تولید محتوای وبلاگ شرکت',
  pr4: 'طراحی لوگو و هویت بصری برند',
  pr5: 'طراحی سایت فروشگاهی آنلاین',
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'DEPOSIT', amount: 5000000, description: 'شارژ کیف پول از طریق درگاه بانکی', status: 'COMPLETED', createdAt: '2024-06-12T10:00:00Z' },
  { id: 't2', type: 'PAYMENT', amount: 12000000, description: 'پرداخت به مینا حسینی - تولید محتوای وبلاگ', status: 'COMPLETED', createdAt: '2024-06-10T14:30:00Z' },
  { id: 't3', type: 'REFUND', amount: 3500000, description: 'بازگشت مبلغ - لغو پروژه نظافت منزل', status: 'COMPLETED', createdAt: '2024-06-08T09:00:00Z' },
  { id: 't4', type: 'COMMISSION', amount: 600000, description: 'کمیسیون پلتفرم - ۵٪ از پرداخت', status: 'COMPLETED', createdAt: '2024-06-10T14:30:00Z' },
  { id: 't5', type: 'WITHDRAW', amount: 2000000, description: 'برداشت به حساب بانکی', status: 'COMPLETED', createdAt: '2024-06-07T11:00:00Z' },
  { id: 't6', type: 'DEPOSIT', amount: 10000000, description: 'شارژ کیف پول از طریق درگاه بانکی', status: 'COMPLETED', createdAt: '2024-06-01T16:45:00Z' },
];

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

function getTransactionTypeConfig(type: Transaction['type']) {
  switch (type) {
    case 'DEPOSIT': return { icon: ArrowDownLeft, label: 'واریز', color: 'text-emerald-600 dark:text-emerald-400', amountColor: 'text-emerald-600 dark:text-emerald-400', prefix: '+' };
    case 'PAYMENT': return { icon: ArrowUpRight, label: 'پرداخت', color: 'text-rose-600 dark:text-rose-400', amountColor: 'text-rose-600 dark:text-rose-400', prefix: '-' };
    case 'WITHDRAW': return { icon: ArrowUpRight, label: 'برداشت', color: 'text-rose-600 dark:text-rose-400', amountColor: 'text-rose-600 dark:text-rose-400', prefix: '-' };
    case 'REFUND': return { icon: RefreshCcw, label: 'بازگشت وجه', color: 'text-cyan-600 dark:text-cyan-400', amountColor: 'text-cyan-600 dark:text-cyan-400', prefix: '+' };
    case 'COMMISSION': return { icon: Percent, label: 'کمیسیون', color: 'text-amber-600 dark:text-amber-400', amountColor: 'text-amber-600 dark:text-amber-400', prefix: '-' };
    default: return { icon: Wallet, label: type, color: 'text-gray-500', amountColor: 'text-gray-500', prefix: '' };
  }
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`;
}

// ============ MAIN COMPONENT ============

export function UserDashboard() {
  const { currentUser, isAuthenticated, setAuthModalOpen, updateProfile } = useAppStore();
  const [activeTab, setActiveTab] = useState('requests');
  const [requestFilter, setRequestFilter] = useState<string>('ALL');

  const filteredRequests = useMemo(() => {
    if (requestFilter === 'ALL') return MOCK_USER_REQUESTS;
    return MOCK_USER_REQUESTS.filter((r) => r.status === requestFilter);
  }, [requestFilter]);

  const initialProfile = useMemo(() => ({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    city: currentUser?.city || '',
    bio: currentUser?.bio || '',
  }), [currentUser]);

  const [profileForm, setProfileForm] = useState(initialProfile);

  if (!isAuthenticated || !currentUser) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6 p-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 flex items-center justify-center shadow-sm">
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

  const handleProfileSave = () => {
    updateProfile(profileForm);
    toast.success('پروفایل با موفقیت ذخیره شد');
  };

  const handleAcceptProposal = (proposalId: string) => { toast.success('پیشنهاد پذیرفته شد'); };
  const handleRejectProposal = (proposalId: string) => { toast.error('پیشنهاد رد شد'); };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ============ WELCOME HEADER ============ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 text-white shadow-xl shadow-emerald-600/20">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white" />
            <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-white" />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-white/30 shadow-lg" loading="lazy">
              <AvatarImage src={currentUser.avatar} alt={currentUser.firstName} />
              <AvatarFallback className="text-xl sm:text-2xl bg-white/20 text-white font-bold">
                {getInitials(currentUser.firstName, currentUser.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold">سلام، {currentUser.firstName} عزیز!</h1>
              <p className="text-white/80 text-sm sm:text-base">به داشبورد خود خوش آمدید</p>
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
            { icon: ClipboardList, label: 'نیازهای فعال', value: '۳', gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/10' },
            { icon: MessageSquare, label: 'پیشنهادهای دریافتی', value: '۸', gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/10' },
            { icon: CheckCircle, label: 'پروژه‌های تکمیل شده', value: '۱۲', gradient: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/10' },
            { icon: Star, label: 'امتیاز شما', value: '۴.۸', gradient: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/10' },
          ].map((stat) => (
            <Card key={stat.label} className="relative overflow-hidden border-0 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-150" style={{ boxShadow: undefined }}>
              <div className={`absolute inset-0 bg-gradient-to-bl ${stat.gradient}`} />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
              <CardContent className="relative p-5 sm:p-6 flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
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

        {/* ============ MAIN TABS ============ */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
            <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-muted/60 p-1.5 rounded-xl mb-6 shadow-sm border border-border/40 backdrop-blur-sm">
              <TabsTrigger value="requests" className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-emerald-700 data-[state=active]:dark:text-emerald-400 rounded-lg py-2.5 text-xs sm:text-sm transition-all duration-150">
                <ClipboardList className="w-4 h-4 ml-1.5" />نیازهای من
              </TabsTrigger>
              <TabsTrigger value="proposals" className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-emerald-700 data-[state=active]:dark:text-emerald-400 rounded-lg py-2.5 text-xs sm:text-sm transition-all duration-150">
                <MessageSquare className="w-4 h-4 ml-1.5" />پیشنهادها
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
                  <Button key={filter.key} variant={requestFilter === filter.key ? 'default' : 'outline'} size="sm" onClick={() => setRequestFilter(filter.key)} className="rounded-full px-4 flex-shrink-0">{filter.label}</Button>
                ))}
              </div>
              <div className="space-y-4">
                {filteredRequests.length === 0 ? (
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
                              <Badge variant="outline" className="text-xs flex-shrink-0">{request.categoryName}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${getStatusColor(request.status)}`}>{getStatusLabel(request.status)}</Badge>
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
                          <Button variant="ghost" size="sm" className="flex-shrink-0 text-muted-foreground hover:text-foreground" onClick={() => {}} data-href="/request-detail" title="مشاهده جزئیات نیاز">
                            مشاهده جزئیات<ChevronLeft className="w-4 h-4 mr-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ============ TAB 2: PROPOSALS ============ */}
            <TabsContent value="proposals">
              <div className="space-y-4">
                {MOCK_PROPOSALS.map((proposal) => {
                  const config = getStatusColor(proposal.status);
                  const isPending = proposal.status === 'PENDING';
                  const requestTitle = REQUEST_TITLES_MAP[proposal.id] || 'نامشخص';
                  return (
                    <Card key={proposal.id} className="hover:border-emerald-300/50 dark:hover:border-emerald-700/50 transition-all duration-150 hover:shadow-md hover:shadow-emerald-500/5">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-11 h-11 flex-shrink-0" loading="lazy">
                              <AvatarImage src={proposal.user.avatar} />
                              <AvatarFallback className="bg-gradient-to-bl from-primary/20 to-primary/5 text-primary font-bold text-sm">{getInitials(proposal.user.firstName, proposal.user.lastName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <span className="font-semibold text-sm text-foreground">{proposal.user.firstName} {proposal.user.lastName}</span>
                                {proposal.user.isVerified && <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />}
                                <Badge variant="outline" className={`text-xs ${config}`}>{getStatusLabel(proposal.status)}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">📋 {requestTitle}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground mr-14 sm:mr-14">
                            <span className="flex items-center gap-1.5 font-medium text-foreground"><DollarSign className="w-4 h-4 text-emerald-500" />{formatPrice(proposal.price)}</span>
                            {proposal.deliveryTime && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{proposal.deliveryTime} روز</span>}
                            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" />{proposal.user.rating} ({proposal.user.projectCount} پروژه)</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{getTimeAgo(proposal.createdAt)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mr-14 sm:mr-14">{proposal.message}</p>
                          {isPending && (
                            <div className="flex items-center gap-2 mr-14 sm:mr-14">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => handleAcceptProposal(proposal.id)} title="قبول پیشنهاد"><Check className="w-4 h-4" />قبول پیشنهاد</Button>
                              <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1" onClick={() => handleRejectProposal(proposal.id)} title="رد پیشنهاد"><X className="w-4 h-4" />رد پیشنهاد</Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* ============ TAB 3: WALLET & PAYMENTS ============ */}
            <TabsContent value="wallet">
              <div className="space-y-6">
                <Card className="relative overflow-hidden border-0 shadow-xl shadow-emerald-500/15 rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-bl from-emerald-600 via-teal-600 to-emerald-700" />
                  <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
                  <CardContent className="relative p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-white/70 text-sm"><Wallet className="w-4 h-4" />موجودی کیف پول</div>
                        <p className="text-white text-3xl sm:text-4xl font-bold tracking-tight">۵,۰۰۰,۰۰۰<span className="text-lg sm:text-xl font-normal mr-2 text-white/70">تومان</span></p>
                      </div>
                      <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm gap-2" onClick={() => toast.info('افزایش موجودی در نسخه بعدی فعال می‌شود')} title="افزایش موجودی کیف پول">
                        <Plus className="w-4 h-4" />افزایش موجودی
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><FileText className="w-5 h-5" />تاریخچه تراکنش‌ها</CardTitle>
                    <CardDescription>لیست آخرین تراکنش‌های کیف پول شما</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {MOCK_TRANSACTIONS.map((transaction) => {
                        const typeConfig = getTransactionTypeConfig(transaction.type);
                        const TypeIcon = typeConfig.icon;
                        return (
                          <div key={transaction.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors duration-150">
                            <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{transaction.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">{typeConfig.label}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{getTimeAgo(transaction.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-left">
                                <p className={`text-sm font-bold ${typeConfig.amountColor}`}>{typeConfig.prefix}{formatPrice(transaction.amount)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                      <Input id="city" value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} placeholder="شهر" />
                    </div>
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
