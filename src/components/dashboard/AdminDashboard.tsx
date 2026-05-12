'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCheck,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  ShieldCheck,
  Ban,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Save,
  Bell,
  DollarSign,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

// ============ Types ============

type AdminSection = 'dashboard' | 'users' | 'requests' | 'specialists' | 'reports' | 'settings';

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
}

interface StatCard {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  change: string;
  changeType: 'up' | 'down';
}

interface ActivityRow {
  type: string;
  typeLabel: string;
  title: string;
  user: string;
  date: string;
  status: 'active' | 'completed' | 'pending' | 'cancelled';
}

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'banned';
  joinDate: string;
  initials: string;
}

// ============ Mock Data ============

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'users', label: 'کاربران', icon: Users },
  { id: 'requests', label: 'نیازها', icon: FileText },
  { id: 'specialists', label: 'متخصص‌ها', icon: UserCheck },
  { id: 'reports', label: 'گزارش‌ها', icon: BarChart3 },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
];

const STAT_CARDS: StatCard[] = [
  {
    title: 'کاربران',
    value: '۱۲,۴۵۰',
    icon: Users,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    change: '+۱۲.۵٪',
    changeType: 'up',
  },
  {
    title: 'نیازهای فعال',
    value: '۳,۲۸۰',
    icon: FileText,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    change: '+۸.۳٪',
    changeType: 'up',
  },
  {
    title: 'متخصصین',
    value: '۲,۱۵۰',
    icon: UserCheck,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    change: '+۱۵.۲٪',
    changeType: 'up',
  },
  {
    title: 'درآمد ماهانه',
    value: '۱۲۵,۰۰۰,۰۰۰ تومان',
    icon: DollarSign,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    change: '+۲۳.۱٪',
    changeType: 'up',
  },
];

const REQUEST_CHART_DATA = [
  { day: 'شنبه', نیازها: 45 },
  { day: 'یکشنبه', نیازها: 62 },
  { day: 'دوشنبه', نیازها: 58 },
  { day: 'سه‌شنبه', نیازها: 91 },
  { day: 'چهارشنبه', نیازها: 78 },
  { day: 'پنجشنبه', نیازها: 85 },
  { day: 'جمعه', نیازها: 43 },
];

const SIGNUP_CHART_DATA = [
  { month: 'فروردین', ثبت‌نام: 1200 },
  { month: 'اردیبهشت', ثبت‌نام: 980 },
  { month: 'خرداد', ثبت‌نام: 1450 },
  { month: 'تیر', ثبت‌نام: 1680 },
  { month: 'مرداد', ثبت‌نام: 1320 },
  { month: 'شهریور', ثبت‌نام: 1890 },
];

const ACTIVITY_DATA: ActivityRow[] = [
  { type: 'request', typeLabel: 'نیاز', title: 'طراحی وب‌سایت فروشگاهی', user: 'علی محمدی', date: '۱۴۰۳/۰۶/۱۵', status: 'active' },
  { type: 'proposal', typeLabel: 'پیشنهاد', title: 'پیشنهاد برای نیاز طراحی لوگو', user: 'سارا رضایی', date: '۱۴۰۳/۰۶/۱۵', status: 'pending' },
  { type: 'user', typeLabel: 'کاربر', title: 'ثبت‌نام کاربر جدید', user: 'محمد حسینی', date: '۱۴۰۳/۰۶/۱۴', status: 'completed' },
  { type: 'payment', typeLabel: 'پرداخت', title: 'پرداخت پروژه اپلیکیشن', user: 'مریم احمدی', date: '۱۴۰۳/۰۶/۱۴', status: 'completed' },
  { type: 'request', typeLabel: 'نیاز', title: 'توسعه اپلیکیشن موبایل', user: 'رضا کریمی', date: '۱۴۰۳/۰۶/۱۳', status: 'active' },
  { type: 'dispute', typeLabel: 'اختلاف', title: 'اختلاف در پروژه سئو', user: 'حسین نوری', date: '۱۴۰۳/۰۶/۱۳', status: 'cancelled' },
  { type: 'review', typeLabel: 'نظر', title: 'نظر جدید برای متخصص', user: 'زهرا موسوی', date: '۱۴۰۳/۰۶/۱۲', status: 'completed' },
  { type: 'withdraw', typeLabel: 'برداشت', title: 'درخواست برداشت وجه', user: 'امیر فرهادی', date: '۱۴۰۳/۰۶/۱۲', status: 'pending' },
];

const MOCK_USERS: MockUser[] = [
  { id: '1', name: 'علی محمدی', email: 'ali@example.com', role: 'مشتری', status: 'active', joinDate: '۱۴۰۳/۰۱/۱۵', initials: 'ع م' },
  { id: '2', name: 'سارا رضایی', email: 'sara@example.com', role: 'متخصص', status: 'active', joinDate: '۱۴۰۳/۰۲/۰۸', initials: 'س ر' },
  { id: '3', name: 'محمد حسینی', email: 'mohammad@example.com', role: 'مشتری', status: 'active', joinDate: '۱۴۰۳/۰۳/۲۱', initials: 'م ح' },
  { id: '4', name: 'مریم احمدی', email: 'maryam@example.com', role: 'متخصص', status: 'inactive', joinDate: '۱۴۰۳/۰۱/۰۵', initials: 'م ا' },
  { id: '5', name: 'رضا کریمی', email: 'reza@example.com', role: 'مشتری', status: 'active', joinDate: '۱۴۰۳/۰۴/۱۲', initials: 'ر ک' },
  { id: '6', name: 'حسین نوری', email: 'hossein@example.com', role: 'متخصص', status: 'banned', joinDate: '۱۴۰۳/۰۲/۲۸', initials: 'ح ن' },
  { id: '7', name: 'زهرا موسوی', email: 'zahra@example.com', role: 'مشتری', status: 'active', joinDate: '۱۴۰۳/۰۵/۱۸', initials: 'ز م' },
  { id: '8', name: 'امیر فرهادی', email: 'amir@example.com', role: 'متخصص', status: 'active', joinDate: '۱۴۰۳/۰۳/۰۳', initials: 'ا ف' },
];

// ============ Status Helpers ============

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'فعال', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'تکمیل شده', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  pending: { label: 'در انتظار', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  cancelled: { label: 'لغو شده', className: 'bg-red-100 text-red-700 border-red-200' },
  inactive: { label: 'غیرفعال', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  banned: { label: 'مسدود', className: 'bg-red-100 text-red-700 border-red-200' },
};

// ============ Animation Variants ============

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const slideInRight = {
  initial: { x: 280, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 280, opacity: 0 },
  transition: { type: 'spring', damping: 25, stiffness: 200 },
};

// ============ Custom Tooltip ============

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  textKey?: string;
}

function CustomChartTooltip({ active, payload, label, textKey = 'مقدار' }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-lg" dir="rtl">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        {textKey}: <span className="font-semibold text-foreground">{payload[0].value.toLocaleString('fa-IR')}</span>
      </p>
    </div>
  );
}

// ============ Stat Cards Section ============

function StatCardsSection() {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {STAT_CARDS.map((stat) => (
        <motion.div key={stat.title} variants={fadeInUp} whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}>
          <Card className="overflow-hidden border border-border/50 py-0 shadow-sm hover:shadow-lg hover:border-border transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-600 font-medium">{stat.change}</span>
                    <span className="text-muted-foreground">نسبت به ماه قبل</span>
                  </div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor} shadow-sm`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============ Charts Section ============

function ChartsSection() {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Line Chart - Requests */}
      <motion.div variants={fadeInUp}>
        <Card className="border border-border/50 py-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">آمار ثبت نیازها</CardTitle>
            <CardDescription>آخرین ۷ روز</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={REQUEST_CHART_DATA} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip textKey="نیازها" />} />
                  <Line
                    type="monotone"
                    dataKey="نیازها"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bar Chart - Signups */}
      <motion.div variants={fadeInUp}>
        <Card className="border border-border/50 py-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">ثبت‌نام کاربران</CardTitle>
            <CardDescription>آخرین ۶ ماه</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SIGNUP_CHART_DATA} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip textKey="ثبت‌نام" />} />
                  <Bar
                    dataKey="ثبت‌نام"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    barSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ============ Recent Activity Table ============

function ActivityTableSection() {
  return (
    <motion.div {...fadeInUp} initial="initial" animate="animate">
      <Card className="border border-border/50 py-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">فعالیت‌های اخیر</CardTitle>
              <CardDescription>آخرین فعالیت‌های پلتفرم</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors">
              مشاهده همه
              <Eye className="ms-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-start text-xs font-medium text-muted-foreground">نوع</TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground">عنوان</TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground">کاربر</TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground">تاریخ</TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACTIVITY_DATA.map((activity, index) => {
                const statusCfg = STATUS_CONFIG[activity.status];
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {activity.typeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{activity.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{activity.user}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{activity.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusCfg.className}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============ Quick Actions ============

function QuickActionsSection() {
  const actions = [
    { label: 'مدیریت کاربران', icon: Users, section: 'users' as AdminSection },
    { label: 'مدیریت دسته‌بندی‌ها', icon: FileText, section: 'requests' as AdminSection },
    { label: 'مشاهده گزارش‌ها', icon: BarChart3, section: 'reports' as AdminSection },
  ];

  return (
    <motion.div {...fadeInUp} initial="initial" animate="animate">
      <Card className="border border-border/50 py-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">دسترسی سریع</CardTitle>
          <CardDescription>عملیات‌های پرکاربرد مدیریت</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="gap-2 text-sm hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============ Dashboard View ============

function DashboardView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">داشبورد مدیریت</h2>
        <p className="text-muted-foreground mt-1 text-sm">خلاصه وضعیت پلتفرم نیاز فایندر</p>
      </div>
      <StatCardsSection />
      <ChartsSection />
      <ActivityTableSection />
      <QuickActionsSection />
    </div>
  );
}

// ============ Users View ============

function UsersView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredUsers = useMemo(() => {
    return MOCK_USERS.filter((user) => {
      const matchesSearch =
        user.name.includes(searchQuery) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={fadeInUp}>
        <h2 className="text-2xl font-bold">مدیریت کاربران</h2>
        <p className="text-muted-foreground mt-1 text-sm">مشاهده و مدیریت کاربران پلتفرم</p>
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div variants={fadeInUp}>
        <Card className="border border-border/50 py-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="جستجوی نام یا ایمیل..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="ps-9 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-300 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all"
                >
                  <option value="all">همه نقش‌ها</option>
                  <option value="مشتری">مشتری</option>
                  <option value="متخصص">متخصص</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                  <option value="banned">مسدود</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Users Table */}
      <motion.div variants={fadeInUp}>
        <Card className="border border-border/50 py-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead className="text-start text-xs font-medium text-muted-foreground">کاربر</TableHead>
                  <TableHead className="text-start text-xs font-medium text-muted-foreground">ایمیل</TableHead>
                  <TableHead className="text-start text-xs font-medium text-muted-foreground">نقش</TableHead>
                  <TableHead className="text-start text-xs font-medium text-muted-foreground">وضعیت</TableHead>
                  <TableHead className="text-start text-xs font-medium text-muted-foreground">تاریخ عضویت</TableHead>
                  <TableHead className="text-start text-xs font-medium text-muted-foreground">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      کاربری یافت نشد
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => {
                    const statusCfg = STATUS_CONFIG[user.status];
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                {user.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-medium ${statusCfg.className}`}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.joinDate}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600">
                              <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={fadeInUp} className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="gap-1 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
            قبلی
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="gap-1"
          >
            بعدی
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============ Placeholder View ============

function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      className="flex min-h-[400px] flex-col items-center justify-center gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 shadow-sm">
        <FileText className="h-8 w-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}

// ============ Settings View ============

function SettingsView() {
  const [siteName, setSiteName] = useState('نیاز فایندر');
  const [siteDescription, setSiteDescription] = useState('پلتفرم اتصال نیازها به متخصصین');
  const [contactEmail, setContactEmail] = useState('info@needfinder.ir');
  const [contactPhone, setContactPhone] = useState('۰۲۱-۱۲۳۴۵۶۷۸');
  const [commissionRate, setCommissionRate] = useState('۱۵');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [autoApproveSpecialists, setAutoApproveSpecialists] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 1500);
  };

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={fadeInUp}>
        <h2 className="text-2xl font-bold">تنظیمات</h2>
        <p className="text-muted-foreground mt-1 text-sm">مدیریت تنظیمات عمومی پلتفرم</p>
      </motion.div>

      {/* General Settings */}
      <motion.div variants={fadeInUp}>
        <Card className="border border-border/50 py-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">تنظیمات عمومی</CardTitle>
            <CardDescription>اطلاعات پایه پلتفرم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="siteName">نام سایت</Label>
              <Input
                id="siteName"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="نام سایت"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDesc">توضیحات سایت</Label>
              <Textarea
                id="siteDesc"
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                placeholder="توضیحات کوتاه درباره پلتفرم"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">ایمیل تماس</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@example.com"
                  dir="ltr"
                  className="text-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">شماره تماس</Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="۰۲۱-۱۲۳۴۵۶۷۸"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Commission Settings */}
      <motion.div variants={fadeInUp}>
        <Card className="border border-border/50 py-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">تنظیمات مالی</CardTitle>
            <CardDescription>نرخ کارمزد و تنظیمات پرداخت</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Label htmlFor="commissionRate">نرخ کارمزد (درصد)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="commissionRate"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="۱۵"
                  className="max-w-32 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-300 transition-all"
                />
                <span className="text-sm text-muted-foreground">درصد</span>
              </div>
              <p className="text-xs text-muted-foreground">
                این درصد از هر تراکنش موفق به عنوان کارمزد پلتفرم کسر خواهد شد.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Feature Toggles */}
      <motion.div variants={fadeInUp}>
        <Card className="border border-border/50 py-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">تنظیمات ویژگی‌ها</CardTitle>
            <CardDescription>فعال و غیرفعال کردن امکانات پلتفرم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 pt-0">
            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">اعلان‌ها و نوتیفیکیشن</Label>
                <p className="text-xs text-muted-foreground">ارسال اعلان به کاربران درباره فعالیت‌ها</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>
            <Separator />
            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">حالت تعمیرات</Label>
                <p className="text-xs text-muted-foreground">غیرفعال کردن موقت دسترسی کاربران</p>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
            <Separator />
            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">ثبت‌نام باز</Label>
                <p className="text-xs text-muted-foreground">امکان ثبت‌نام کاربران جدید</p>
              </div>
              <Switch checked={registrationOpen} onCheckedChange={setRegistrationOpen} />
            </div>
            <Separator />
            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">تأیید خودکار متخصصین</Label>
                <p className="text-xs text-muted-foreground">تأیید خودکار درخواست‌های متخصصین بدون بررسی دستی</p>
              </div>
              <Switch checked={autoApproveSpecialists} onCheckedChange={setAutoApproveSpecialists} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div variants={fadeInUp} className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-32 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all duration-200">
          {isSaving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              در حال ذخیره...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              ذخیره تنظیمات
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ============ Sidebar ============

interface SidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ activeSection, onSectionChange, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-64 border-e bg-card shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">نیاز فایندر</h1>
                <p className="text-[10px] text-muted-foreground">پنل مدیریت</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400'
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  م م
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">مدیر سیستم</p>
                <p className="truncate text-xs text-muted-foreground">admin@needfinder.ir</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ============ Unauthorized View ============

function UnauthorizedView() {
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        className="flex flex-col items-center gap-4 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40 shadow-sm">
          <ShieldCheck className="h-10 w-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold">دسترسی غیرمجاز</h2>
        <p className="max-w-sm text-muted-foreground">
          شما دسترسی لازم برای مشاهده این بخش را ندارید. لطفاً با حساب کاربری مدیر وارد شوید.
        </p>
        <Button variant="outline" className="mt-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors">
          بازگشت به صفحه اصلی
        </Button>
      </motion.div>
    </div>
  );
}

// ============ Main AdminDashboard ============

export function AdminDashboard() {
  const { currentUser, sidebarOpen, setSidebarOpen } = useAppStore();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  // Auth guard
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
    return <UnauthorizedView />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardView />;
      case 'users':
        return <UsersView />;
      case 'requests':
        return (
          <PlaceholderView
            title="مدیریت نیازها"
            description="بخش مدیریت نیازها و درخواست‌های خدمات به زودی اضافه خواهد شد."
          />
        );
      case 'specialists':
        return (
          <PlaceholderView
            title="مدیریت متخصصین"
            description="بخش مدیریت متخصصین و تأیید صلاحیت‌ها به زودی اضافه خواهد شد."
          />
        );
      case 'reports':
        return (
          <PlaceholderView
            title="گزارش‌ها و آمار"
            description="بخش گزارش‌های تحلیلی و آمار پیشرفته به زودی اضافه خواهد شد."
          />
        );
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">پنل مدیریت</span>
        </div>
        <div className="me-auto">
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              ۳
            </span>
          </Button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:flex">
        <h2 className="text-sm font-medium text-muted-foreground">
          {NAV_ITEMS.find((item) => item.id === activeSection)?.label ?? 'داشبورد'}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              ۳
            </span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                م م
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">مدیر سیستم</span>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="min-h-[calc(100vh-3.5rem)] pb-8 lg:ms-64">
        <div className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
