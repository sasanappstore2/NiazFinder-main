'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Search,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Ban,
  Unlock,
  CheckCircle2,
  XCircle,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BadgeCheck,
  CircleDot,
  Loader2,
  AlertTriangle,
  Crown,
  Star,
  Filter,
  Mail,
  Phone,
  AtSign,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { useAppRouter } from '@/hooks/use-router';
import { toast } from 'sonner';

// ─── Animation variants ───────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// ─── Types ────────────────────────────────────────────
interface AdminUser {
  id: string;
  email: string;
  phone?: string;
  username?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  online: boolean;
  createdAt: string;
  banReason?: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type FilterTab = 'all' | 'active' | 'banned' | 'admin' | 'specialist';

// ─── Color helpers ────────────────────────────────────
const AVATAR_SOLID_COLORS = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-lime-500',
];

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_SOLID_COLORS[hash % AVATAR_SOLID_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0][0] || '?').toUpperCase();
}

function formatPersianDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// ─── Helpers ──────────────────────────────────────────
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getDisplayName(user: AdminUser): string {
  return user.displayName || `${user.firstName} ${user.lastName}`;
}

function isToday(dateString: string): boolean {
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ─── Role config ──────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  CLIENT: {
    label: 'کاربر',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  SPECIALIST: {
    label: 'متخصص',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  ADMIN: {
    label: 'مدیر',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  SUPER_ADMIN: {
    label: 'مدیر ارشد',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
};

const ROLE_OPTIONS = [
  { value: 'CLIENT', label: 'کاربر' },
  { value: 'SPECIALIST', label: 'متخصص' },
  { value: 'ADMIN', label: 'مدیر' },
  { value: 'SUPER_ADMIN', label: 'مدیر ارشد' },
];

// ─── Filter tabs config ───────────────────────────────
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'active', label: 'فعال' },
  { key: 'banned', label: 'مسدود' },
  { key: 'admin', label: 'مدیران' },
  { key: 'specialist', label: 'متخصص‌ها' },
];

// ─── Stats Card ───────────────────────────────────────
function StatsCard({
  icon: Icon,
  label,
  value,
  colorClass,
  delay = 0,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  colorClass: string;
  delay?: number;
}) {
  return (
    <motion.div {...fadeIn} transition={{ delay }}>
      <Card className="border-border/60 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-extrabold tabular-nums leading-tight">
                {value.toLocaleString('fa-IR')}
              </div>
              <div className="text-caption font-medium text-muted-foreground leading-tight">
                {label}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Table Row Skeleton ──────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Skeleton className="h-5 w-10 rounded-md" />
              <Skeleton className="h-5 w-10 rounded-md" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-16 rounded-md" /></TableCell>
          <TableCell><Skeleton className="size-8 rounded-md" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Card Skeleton (mobile) ──────────────────────────
function CardSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border/60 bg-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-11 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
              <Skeleton className="size-8 rounded-md shrink-0" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
              <Skeleton className="h-5 w-10 rounded-md" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────
export function AdminUsersPage() {
  const { push } = useAppRouter();
  const currentUser = useAppStore((s) => s.currentUser);

  // ── Auth check ─────────────────────────────────────
  const isAdmin =
    currentUser &&
    (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN');

  // ── Local state ────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Dialog states
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  // ── Build query params ─────────────────────────────
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', '20');
    params.set('page', String(page));
    if (search.trim()) params.set('search', search.trim());
    if (activeFilter === 'banned') params.set('status', 'banned');
    if (activeFilter === 'admin') params.set('role', 'ADMIN');
    if (activeFilter === 'specialist') params.set('role', 'SPECIALIST');
    return params.toString();
  }, [search, activeFilter, page]);

  // ── Fetch users ────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?${queryParams}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.data || []).map((u: Record<string, unknown>) => ({
          id: u.id as string,
          email: u.email as string,
          phone: (u.phone as string) || undefined,
          username: (u.username as string) || undefined,
          firstName: (u.firstName as string) || '',
          lastName: (u.lastName as string) || '',
          displayName: (u.displayName as string) || undefined,
          avatar: (u.avatar as string) || undefined,
          role: (u.role as string) || 'CLIENT',
          isVerified: (u.isVerified as boolean) || false,
          isActive: (u.isActive as boolean) !== false,
          isBanned: (u.isBanned as boolean) || false,
          online: (u.online as boolean) || false,
          createdAt: u.createdAt
            ? new Date(u.createdAt).toISOString()
            : new Date().toISOString(),
          banReason: (u.banReason as string) || null,
        }));
        setUsers(mapped);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        toast.error('خطا در دریافت لیست کاربران');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [fetchUsers, isAdmin]);

  // ── Reset page on filter/search change ─────────────
  useEffect(() => {
    setPage(1);
  }, [search, activeFilter]);

  // ── Compute stats ──────────────────────────────────
  const stats = useMemo(() => {
    const total = pagination.total || 0;
    const online = users.filter((u) => u.online).length;
    const banned = users.filter((u) => u.isBanned).length;
    const newToday = users.filter((u) => isToday(u.createdAt)).length;
    return { total, online, banned, newToday };
  }, [users, pagination.total]);

  // ── Handlers ───────────────────────────────────────

  // Toggle ban
  const openBanDialog = (user: AdminUser) => {
    setBanTarget(user);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const handleToggleBan = async () => {
    if (!banTarget) return;
    setBanLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${banTarget.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isBanned: !banTarget.isBanned,
          banReason: !banTarget.isBanned ? banReason || 'محدودیت توسط مدیریت' : undefined,
        }),
      });
      if (res.ok) {
        toast.success(banTarget.isBanned ? `${getDisplayName(banTarget)} رفع مسدود شد` : `${getDisplayName(banTarget)} مسدود شد`);
        setBanDialogOpen(false);
        fetchUsers();
      } else {
        toast.error('خطا در تغییر وضعیت مسدودیت');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setBanLoading(false);
    }
  };

  // Toggle active
  const handleToggleActive = async (user: AdminUser) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        toast.success(user.isActive ? `${getDisplayName(user)} غیرفعال شد` : `${getDisplayName(user)} فعال شد`);
        fetchUsers();
      } else {
        toast.error('خطا در تغییر وضعیت فعالیت');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  // Toggle verified
  const handleToggleVerified = async (user: AdminUser) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isVerified: !user.isVerified }),
      });
      if (res.ok) {
        toast.success(user.isVerified ? `تأیید هویت ${getDisplayName(user)} لغو شد` : `${getDisplayName(user)} تأیید هویت شد`);
        fetchUsers();
      } else {
        toast.error('خطا در تغییر وضعیت تأیید');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  // Change role
  const openRoleDialog = (user: AdminUser) => {
    setRoleTarget(user);
    setSelectedRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleChangeRole = async () => {
    if (!roleTarget || !selectedRole) return;
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${roleTarget.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: selectedRole }),
      });
      if (res.ok) {
        toast.success(`نقش ${getDisplayName(roleTarget)} به ${ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label} تغییر کرد`);
        setRoleDialogOpen(false);
        fetchUsers();
      } else {
        toast.error('خطا در تغییر نقش');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setRoleLoading(false);
    }
  };

  // Delete user
  const openDeleteDialog = (user: AdminUser) => {
    setDeleteTarget(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success(`${getDisplayName(deleteTarget)} حذف شد`);
        setDeleteDialogOpen(false);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'خطا در حذف کاربر');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Search debounce ────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Not admin view ─────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center" dir="rtl">
        <motion.div {...fadeIn} className="text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/20">
            <ShieldAlert className="size-10 text-red-500" />
          </div>
          <h2 className="mb-2 text-xl font-extrabold">دسترسی محدود</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            این صفحه فقط برای مدیران سیستم قابل دسترسی است.
          </p>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => push('home')}
          >
            <ArrowRight className="size-4" />
            بازگشت به خانه
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ── Header ───────────────────────────────── */}
        <motion.div {...fadeIn} className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => push('admin')}
                className="gap-2 text-sm text-muted-foreground"
              >
                <ArrowRight className="size-4" />
                بازگشت
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-extrabold">مدیریت کاربران</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  مشاهده و مدیریت تمامی کاربران سیستم
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={fetchUsers}
              disabled={loading}
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </Button>
          </div>
        </motion.div>

        {/* ── Stats Bar ────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatsCard
            icon={Users}
            label="کل کاربران"
            value={stats.total}
            colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            delay={0}
          />
          <StatsCard
            icon={CircleDot}
            label="آنلاین"
            value={stats.online}
            colorClass="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
            delay={0.05}
          />
          <StatsCard
            icon={UserX}
            label="مسدود"
            value={stats.banned}
            colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            delay={0.1}
          />
          <StatsCard
            icon={UserPlus}
            label="عضو جدید امروز"
            value={stats.newToday}
            colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            delay={0.15}
          />
        </div>

        {/* ── Search & Filter ──────────────────────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="mb-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس نام، ایمیل، تلفن یا نام کاربری..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pr-10 h-10 rounded-xl"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="size-4 text-muted-foreground shrink-0" />
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-card border border-border/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Users Table (Desktop) ────────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="hidden lg:block"
        >
          <Card className="border-border/60 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-right pr-4">کاربر</TableHead>
                  <TableHead className="text-right">ایمیل</TableHead>
                  <TableHead className="text-right">تلفن</TableHead>
                  <TableHead className="text-right">نقش</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">تاریخ عضویت</TableHead>
                  <TableHead className="text-left pl-4">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton />
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="group">
                      {/* User info */}
                      <TableCell className="pr-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div
                              className={`size-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getAvatarColor(getDisplayName(user))}`}
                            >
                              {getInitials(getDisplayName(user))}
                            </div>
                            {user.online && (
                              <span className="absolute -bottom-0.5 -left-0.5 size-3 rounded-full bg-emerald-500 border-2 border-card" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold truncate max-w-[160px]">
                                {getDisplayName(user)}
                              </span>
                              {user.isVerified && (
                                <BadgeCheck className="size-3.5 text-emerald-500 shrink-0" />
                              )}
                            </div>
                            {user.username && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <AtSign className="size-2.5" />
                                {user.username}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="size-3" />
                          {user.email}
                        </span>
                      </TableCell>

                      {/* Phone */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="size-3" />
                          {user.phone || '—'}
                        </span>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption font-medium ${
                            ROLE_CONFIG[user.role]?.className || ROLE_CONFIG.CLIENT.className
                          }`}
                        >
                          {user.role === 'SUPER_ADMIN' && <Crown className="size-3" />}
                          {user.role === 'ADMIN' && <ShieldCheck className="size-3" />}
                          {user.role === 'SPECIALIST' && <Star className="size-3" />}
                          {ROLE_CONFIG[user.role]?.label || user.role}
                        </span>
                      </TableCell>

                      {/* Status badges */}
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {user.isBanned ? (
                            <Badge variant="destructive" className="text-caption gap-0.5">
                              <XCircle className="size-3" />
                              مسدود
                            </Badge>
                          ) : !user.isActive ? (
                            <Badge variant="secondary" className="text-caption gap-0.5">
                              <XCircle className="size-3" />
                              غیرفعال
                            </Badge>
                          ) : (
                            <Badge className="text-caption gap-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                              <CheckCircle2 className="size-3" />
                              فعال
                            </Badge>
                          )}
                          {user.online && !user.isBanned && (
                            <Badge className="text-caption gap-0.5 bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-0">
                              <CircleDot className="size-3" />
                              آنلاین
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Join date */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {formatPersianDate(user.createdAt)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pl-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>عملیات</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => push('user-profile', { id: user.id })}>
                              <Eye className="size-4" />
                              مشاهده پروفایل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                              <ShieldCheck className="size-4" />
                              تغییر نقش
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleVerified(user)}>
                              {user.isVerified ? (
                                <>
                                  <XCircle className="size-4" />
                                  لغو تأیید هویت
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-4" />
                                  تأیید هویت
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                              {user.isActive ? (
                                <>
                                  <XCircle className="size-4" />
                                  غیرفعال کردن
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-4" />
                                  فعال کردن
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openBanDialog(user)}>
                              {user.isBanned ? (
                                <>
                                  <Unlock className="size-4" />
                                  رفع مسدودیت
                                </>
                              ) : (
                                <>
                                  <Ban className="size-4" />
                                  مسدود کردن
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="size-4" />
                              حذف کاربر
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </motion.div>

        {/* ── Users Cards (Mobile) ─────────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="lg:hidden space-y-3"
        >
          {loading ? (
            <CardSkeleton />
          ) : users.length === 0 ? (
            <EmptyState />
          ) : (
            users.map((user) => (
              <motion.div key={user.id} variants={item}>
                <Card className="border-border/60 bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`size-11 rounded-xl flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(getDisplayName(user))}`}
                        >
                          {getInitials(getDisplayName(user))}
                        </div>
                        {user.online && (
                          <span className="absolute -bottom-0.5 -left-0.5 size-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                        )}
                        {user.isVerified && (
                          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-card shadow-sm">
                            <BadgeCheck className="size-3 text-emerald-500" />
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold truncate">
                              {getDisplayName(user)}
                            </h3>
                            {user.username && (
                              <p className="text-xs text-muted-foreground">
                                @{user.username}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 shrink-0">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>عملیات</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => push('user-profile', { id: user.id })}>
                                <Eye className="size-4" />
                                مشاهده پروفایل
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                                <ShieldCheck className="size-4" />
                                تغییر نقش
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleVerified(user)}>
                                {user.isVerified ? (
                                  <>
                                    <XCircle className="size-4" />
                                    لغو تأیید هویت
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="size-4" />
                                    تأیید هویت
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                {user.isActive ? (
                                  <>
                                    <XCircle className="size-4" />
                                    غیرفعال کردن
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="size-4" />
                                    فعال کردن
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openBanDialog(user)}>
                                {user.isBanned ? (
                                  <>
                                    <Unlock className="size-4" />
                                    رفع مسدودیت
                                  </>
                                ) : (
                                  <>
                                    <Ban className="size-4" />
                                    مسدود کردن
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openDeleteDialog(user)}
                              >
                                <Trash2 className="size-4" />
                                حذف کاربر
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Contact info */}
                        <div className="mt-2 space-y-0.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="size-3 shrink-0" />
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="size-3 shrink-0" />
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badges row */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption font-medium ${
                          ROLE_CONFIG[user.role]?.className || ROLE_CONFIG.CLIENT.className
                        }`}
                      >
                        {user.role === 'SUPER_ADMIN' && <Crown className="size-3" />}
                        {user.role === 'ADMIN' && <ShieldCheck className="size-3" />}
                        {user.role === 'SPECIALIST' && <Star className="size-3" />}
                        {ROLE_CONFIG[user.role]?.label || user.role}
                      </span>
                      {user.isBanned ? (
                        <Badge variant="destructive" className="text-caption gap-0.5">
                          <XCircle className="size-3" />
                          مسدود
                        </Badge>
                      ) : !user.isActive ? (
                        <Badge variant="secondary" className="text-caption gap-0.5">
                          <XCircle className="size-3" />
                          غیرفعال
                        </Badge>
                      ) : (
                        <Badge className="text-caption gap-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                          <CheckCircle2 className="size-3" />
                          فعال
                        </Badge>
                      )}
                      {user.online && !user.isBanned && (
                        <Badge className="text-caption gap-0.5 bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-0">
                          <CircleDot className="size-3" />
                          آنلاین
                        </Badge>
                      )}
                    </div>

                    {/* Footer row */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-caption text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {formatPersianDate(user.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                        onClick={() => push('user-profile', { id: user.id })}
                      >
                        <Eye className="size-3 ml-1" />
                        مشاهده
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* ── Pagination ───────────────────────────── */}
        {pagination.totalPages > 1 && (
          <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronRight className="size-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="icon"
                    className="size-9"
                    disabled={loading}
                    onClick={() => setPage(pageNum)}
                  >
                    <span className="text-xs">{pageNum.toLocaleString('fa-IR')}</span>
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="size-9"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </motion.div>
        )}

        {/* ── Pagination info ──────────────────────── */}
        {!loading && users.length > 0 && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            نمایش {users.length.toLocaleString('fa-IR')} کاربر از {pagination.total.toLocaleString('fa-IR')}
            {' '}· صفحه {(pagination.page).toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')}
          </div>
        )}

        {/* ── Ban Dialog ───────────────────────────── */}
        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {banTarget?.isBanned ? (
                  <>
                    <Unlock className="size-5 text-emerald-500" />
                    رفع مسدودیت کاربر
                  </>
                ) : (
                  <>
                    <Ban className="size-5 text-red-500" />
                    مسدود کردن کاربر
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {banTarget?.isBanned
                  ? `آیا از رفع مسدودیت ${getDisplayName(banTarget)} اطمینان دارید؟`
                  : `آیا از مسدود کردن ${getDisplayName(banTarget)} اطمینان دارید؟ لطفاً دلیل مسدودیت را ذکر کنید.`}
              </DialogDescription>
            </DialogHeader>

            {!banTarget?.isBanned && (
              <Textarea
                placeholder="دلیل مسدودیت (اختیاری)..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="resize-none rounded-xl"
              />
            )}

            {banTarget?.isBanned && banTarget.banReason && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                  دلیل مسدودیت قبلی:
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  {banTarget.banReason}
                </p>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setBanDialogOpen(false)}
                disabled={banLoading}
              >
                انصراف
              </Button>
              <Button
                variant={banTarget?.isBanned ? 'default' : 'destructive'}
                onClick={handleToggleBan}
                disabled={banLoading}
                className="gap-2"
              >
                {banLoading && <Loader2 className="size-4 animate-spin" />}
                {banTarget?.isBanned ? 'رفع مسدودیت' : 'مسدود کردن'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Dialog ────────────────────────── */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="size-5" />
                حذف کاربر
              </DialogTitle>
              <DialogDescription>
                آیا از حذف <strong>{getDisplayName(deleteTarget!)}</strong> اطمینان دارید؟
                این عملیات قابل بازگشت نیست و تمام اطلاعات کاربر حذف خواهد شد.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 p-3">
              <AlertTriangle className="size-5 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                هشدار: پس از حذف، تمام اطلاعات شامل پروژه‌ها، پیام‌ها و تراکنش‌های این کاربر برای همیشه پاک خواهد شد.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteLoading}
              >
                انصراف
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="gap-2"
              >
                {deleteLoading && <Loader2 className="size-4 animate-spin" />}
                <Trash2 className="size-4" />
                حذف قطعی
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Role Change Dialog ───────────────────── */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-amber-500" />
                تغییر نقش کاربر
              </DialogTitle>
              <DialogDescription>
                نقش <strong>{getDisplayName(roleTarget!)}</strong> را انتخاب کنید.
              </DialogDescription>
            </DialogHeader>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="انتخاب نقش" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <span className="flex items-center gap-2">
                      {role.value === 'SUPER_ADMIN' && <Crown className="size-3.5 text-red-500" />}
                      {role.value === 'ADMIN' && <ShieldCheck className="size-3.5 text-amber-500" />}
                      {role.value === 'SPECIALIST' && <Star className="size-3.5 text-emerald-500" />}
                      {role.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedRole === 'SUPER_ADMIN' && (
              <div className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
                <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  هشدار: مدیر ارشد بالاترین سطح دسترسی را دارد. این تغییر را با احتیاط انجام دهید.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setRoleDialogOpen(false)}
                disabled={roleLoading}
              >
                انصراف
              </Button>
              <Button
                onClick={handleChangeRole}
                disabled={roleLoading || !selectedRole || selectedRole === roleTarget?.role}
                className="gap-2"
              >
                {roleLoading && <Loader2 className="size-4 animate-spin" />}
                اعمال تغییر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

// ─── Empty State Component ───────────────────────────
function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
        <Users className="size-8 text-muted-foreground/40" />
      </div>
      <h3 className="mb-2 text-sm font-semibold">کاربری یافت نشد</h3>
      <p className="text-xs text-muted-foreground">
        کاربری با فیلترهای انتخاب شده پیدا نشد. لطفاً فیلترهای خود را تغییر دهید.
      </p>
    </div>
  );
}
