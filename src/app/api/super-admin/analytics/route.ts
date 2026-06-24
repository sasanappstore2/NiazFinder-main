import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLocationStats, readManagedLocationData } from '@/lib/admin-locations';
import { requirePermission } from '@/lib/rbac/authz';

export const runtime = 'nodejs';

type CountGroup = {
  name: string;
  label: string;
  value: number;
  color: string;
};

type TimelineBucket = {
  key: string;
  label: string;
  users: number;
  requests: number;
  proposals: number;
  transactions: number;
  reviews: number;
  revenue: number;
};

const CHART_COLORS = {
  emerald: '#10b981',
  teal: '#14b8a6',
  sky: '#3b82f6',
  amber: '#f59e0b',
  violet: '#a855f7',
  rose: '#ef4444',
  slate: '#64748b',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  OPEN: 'باز',
  IN_PROGRESS: 'در حال انجام',
  CLOSED: 'بسته',
  COMPLETED: 'تکمیل‌شده',
  CANCELLED: 'لغوشده',
};

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  ACCEPTED: 'پذیرفته‌شده',
  REJECTED: 'ردشده',
  WITHDRAWN: 'پس‌گرفته‌شده',
};

const USER_ROLE_LABELS: Record<string, string> = {
  CLIENT: 'کارفرما',
  SPECIALIST: 'متخصص',
  ADMIN: 'ادمین',
  SUPER_ADMIN: 'سوپرادمین',
};

const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  COMPLETED: 'موفق',
  FAILED: 'ناموفق',
  CANCELLED: 'لغوشده',
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function makeTimeline(monthCount = 12): TimelineBucket[] {
  const now = new Date();
  const firstMonth = addMonths(startOfMonth(now), -(monthCount - 1));
  const formatter = new Intl.DateTimeFormat('fa-IR', { month: 'short' });

  return Array.from({ length: monthCount }, (_, index) => {
    const month = addMonths(firstMonth, index);
    return {
      key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
      label: formatter.format(month),
      users: 0,
      requests: 0,
      proposals: 0,
      transactions: 0,
      reviews: 0,
      revenue: 0,
    };
  });
}

function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function applyTimelineCount<T extends { createdAt: Date }>(
  timeline: TimelineBucket[],
  rows: T[],
  key: keyof Pick<TimelineBucket, 'users' | 'requests' | 'proposals' | 'transactions' | 'reviews'>
) {
  const bucketByKey = new Map(timeline.map((bucket) => [bucket.key, bucket]));
  for (const row of rows) {
    const bucket = bucketByKey.get(monthKey(row.createdAt));
    if (bucket) bucket[key] += 1;
  }
}

function applyTimelineRevenue(
  timeline: TimelineBucket[],
  rows: Array<{ createdAt: Date; amount: number; status: string }>
) {
  const bucketByKey = new Map(timeline.map((bucket) => [bucket.key, bucket]));
  for (const row of rows) {
    const bucket = bucketByKey.get(monthKey(row.createdAt));
    if (bucket && row.status === 'COMPLETED') bucket.revenue += row.amount;
  }
}

function toCountGroups(
  groups: Array<{ value: string; count: number }>,
  labels: Record<string, string>,
  colors: string[]
): CountGroup[] {
  return groups.map((group, index) => ({
    name: group.value,
    label: labels[group.value] ?? group.value,
    value: group.count,
    color: colors[index % colors.length],
  }));
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function isoDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'superadmin:analytics:read');
    if (!authz.ok) return authz.response;

    const timeline = makeTimeline(12);
    const since = addMonths(startOfMonth(new Date()), -11);

    const [
      users,
      requests,
      proposals,
      transactions,
      reviews,
      requestGroups,
      proposalGroups,
      roleGroups,
      transactionGroups,
      categories,
      recentRequests,
      recentUsers,
      recentProposals,
      recentTransactions,
      recentNotifications,
      messageStats,
      unreadMessageCount,
      notificationCount,
      unreadNotificationCount,
      locationData,
    ] = await Promise.all([
      db.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      db.serviceRequest.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      db.proposal.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      db.transaction.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, amount: true, status: true },
      }),
      db.review.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      db.serviceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      db.proposal.groupBy({ by: ['status'], _count: { _all: true } }),
      db.user.groupBy({ by: ['role'], _count: { _all: true } }),
      db.transaction.groupBy({ by: ['status'], _count: { _all: true } }),
      db.category.findMany({
        include: {
          _count: { select: { requests: true, skills: true, children: true } },
        },
      }),
      db.serviceRequest.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          city: true,
          province: true,
          createdAt: true,
          category: { select: { name: true } },
        },
      }),
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
          isBanned: true,
          createdAt: true,
        },
      }),
      db.proposal.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          price: true,
          status: true,
          createdAt: true,
          request: { select: { title: true } },
          user: { select: { displayName: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      db.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          type: true,
          status: true,
          description: true,
          createdAt: true,
        },
      }),
      db.notification.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, title: true, message: true, isRead: true, createdAt: true },
      }),
      db.message.count(),
      db.message.count({ where: { isRead: false } }),
      db.notification.count(),
      db.notification.count({ where: { isRead: false } }),
      readManagedLocationData(),
    ]);

    applyTimelineCount(timeline, users, 'users');
    applyTimelineCount(timeline, requests, 'requests');
    applyTimelineCount(timeline, proposals, 'proposals');
    applyTimelineCount(timeline, transactions, 'transactions');
    applyTimelineCount(timeline, reviews, 'reviews');
    applyTimelineRevenue(timeline, transactions);

    const topCategories = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        status: category.status,
        requests: category._count.requests,
        skills: category._count.skills,
        children: category._count.children,
        score: category._count.requests + category._count.skills + category._count.children,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fa'))
      .slice(0, 8);

    const requestStatus = toCountGroups(
      requestGroups.map((group) => ({ value: group.status, count: group._count._all })),
      REQUEST_STATUS_LABELS,
      [CHART_COLORS.emerald, CHART_COLORS.sky, CHART_COLORS.violet, CHART_COLORS.amber, CHART_COLORS.rose]
    );

    const proposalStatus = toCountGroups(
      proposalGroups.map((group) => ({ value: group.status, count: group._count._all })),
      PROPOSAL_STATUS_LABELS,
      [CHART_COLORS.amber, CHART_COLORS.emerald, CHART_COLORS.rose, CHART_COLORS.slate]
    );

    const userRoles = toCountGroups(
      roleGroups.map((group) => ({ value: group.role, count: group._count._all })),
      USER_ROLE_LABELS,
      [CHART_COLORS.sky, CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.violet]
    );

    const transactionStatus = toCountGroups(
      transactionGroups.map((group) => ({ value: group.status, count: group._count._all })),
      TRANSACTION_STATUS_LABELS,
      [CHART_COLORS.amber, CHART_COLORS.emerald, CHART_COLORS.rose, CHART_COLORS.slate]
    );

    const locationStats = await getLocationStats(locationData);
    const goals = [
      {
        label: 'پوشش شهرها',
        value: locationStats.activeCities,
        target: Math.max(locationStats.cities, 1),
        percent: percent(locationStats.activeCities, locationStats.cities),
        color: CHART_COLORS.emerald,
      },
      {
        label: 'پوشش محله‌ها',
        value: locationStats.activeNeighborhoods,
        target: Math.max(locationStats.neighborhoods, 1),
        percent: percent(locationStats.activeNeighborhoods, locationStats.neighborhoods),
        color: CHART_COLORS.violet,
      },
      {
        label: 'خواندن پیام‌ها',
        value: Math.max(messageStats - unreadMessageCount, 0),
        target: Math.max(messageStats, 1),
        percent: percent(Math.max(messageStats - unreadMessageCount, 0), messageStats),
        color: CHART_COLORS.sky,
      },
      {
        label: 'خواندن اعلان‌ها',
        value: Math.max(notificationCount - unreadNotificationCount, 0),
        target: Math.max(notificationCount, 1),
        percent: percent(Math.max(notificationCount - unreadNotificationCount, 0), notificationCount),
        color: CHART_COLORS.amber,
      },
    ];

    const recentActivity = [
      ...recentRequests.map((item) => ({
        id: `request-${item.id}`,
        type: 'request',
        title: item.title,
        description: `${REQUEST_STATUS_LABELS[item.status] ?? item.status} · ${item.category.name}`,
        meta: [item.province, item.city].filter(Boolean).join('، ') || 'بدون موقعیت',
        createdAt: item.createdAt.toISOString(),
        tone: 'sky',
      })),
      ...recentUsers.map((item) => ({
        id: `user-${item.id}`,
        type: 'user',
        title: item.displayName || `${item.firstName} ${item.lastName}`.trim() || item.phone || item.email,
        description: `${USER_ROLE_LABELS[item.role] ?? item.role}${item.isBanned ? ' · مسدود' : ''}`,
        meta: 'ثبت‌نام جدید',
        createdAt: item.createdAt.toISOString(),
        tone: item.isBanned ? 'rose' : 'emerald',
      })),
      ...recentProposals.map((item) => ({
        id: `proposal-${item.id}`,
        type: 'proposal',
        title: item.request.title,
        description: `${PROPOSAL_STATUS_LABELS[item.status] ?? item.status} · ${item.price.toLocaleString('fa-IR')}`,
        meta: item.user.displayName || `${item.user.firstName} ${item.user.lastName}`.trim() || item.user.phone || 'متخصص',
        createdAt: item.createdAt.toISOString(),
        tone: 'violet',
      })),
      ...recentTransactions.map((item) => ({
        id: `transaction-${item.id}`,
        type: 'transaction',
        title: item.description || item.type,
        description: `${TRANSACTION_STATUS_LABELS[item.status] ?? item.status} · ${item.amount.toLocaleString('fa-IR')}`,
        meta: item.type,
        createdAt: item.createdAt.toISOString(),
        tone: item.status === 'COMPLETED' ? 'emerald' : 'amber',
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      timeline,
      requestStatus,
      proposalStatus,
      userRoles,
      transactionStatus,
      topCategories,
      goals,
      recentActivity,
      communications: {
        totalMessages: messageStats,
        unreadMessages: unreadMessageCount,
        totalNotifications: notificationCount,
        unreadNotifications: unreadNotificationCount,
        recentNotifications: recentNotifications.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          message: item.message,
          isRead: item.isRead,
          createdAt: item.createdAt.toISOString(),
        })),
      },
      calendarEvents: [
        {
          id: 'open-requests-review',
          title: 'بازبینی نیازهای باز',
          description: 'کنترل کیفیت صف نیازها و زمان پاسخ',
          date: isoDateOffset(0),
          tone: 'sky',
          count: requestStatus.find((item) => item.name === 'OPEN')?.value ?? 0,
        },
        {
          id: 'category-cleanup',
          title: 'پاکسازی دسته‌بندی‌ها',
          description: 'بررسی دسته‌های غیرفعال و وابستگی‌ها',
          date: isoDateOffset(2),
          tone: 'amber',
          count: categories.filter((item) => item.status !== 'ACTIVE').length,
        },
        {
          id: 'security-review',
          title: 'بازبینی امنیت حساب‌ها',
          description: 'کنترل کاربران مسدود و اعلان‌های خوانده‌نشده',
          date: isoDateOffset(4),
          tone: 'rose',
          count: unreadNotificationCount,
        },
        {
          id: 'growth-review',
          title: 'جلسه رشد جغرافیایی',
          description: 'تحلیل شهرها و محله‌های فعال',
          date: isoDateOffset(7),
          tone: 'emerald',
          count: locationStats.activeCities,
        },
      ],
    });
  } catch (error) {
    console.error('Super admin analytics error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
