export type BookmarkProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface BookmarkEngagement {
  needsFollowUp: boolean;
  myProposalStatus: BookmarkProposalStatus | null;
  conversationId: string | null;
}

export interface BookmarkNeedItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  address?: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetType: string;
  deliveryTime: number | null;
  deliveryUnit?: string;
  city: string | null;
  province?: string | null;
  priority: string;
  status: string;
  tags: string[];
  viewCount: number;
  proposalCount: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  bookmarkedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    city: string | null;
    createdAt: string | Date;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
  engagement: BookmarkEngagement;
}

export type BookmarkInboxFilter =
  | 'all'
  | 'needs_follow_up'
  | 'in_chat'
  | 'proposed'
  | 'closed';

export function getEngagementLabel(
  item: Pick<BookmarkNeedItem, 'status' | 'engagement'>
): string {
  if (item.status !== 'OPEN') return 'آگهی بسته';
  const { needsFollowUp, myProposalStatus, conversationId } = item.engagement;
  if (myProposalStatus === 'ACCEPTED') return 'پذیرفته شد';
  if (myProposalStatus === 'PENDING') return 'پیشنهاد ارسال‌شده';
  if (myProposalStatus === 'REJECTED') return 'پیشنهاد رد شد';
  if (myProposalStatus === 'WITHDRAWN') return 'پیشنهاد پس گرفته شد';
  if (conversationId) return 'در گفتگو';
  if (needsFollowUp) return 'نیاز به پیگیری';
  return 'ذخیره‌شده';
}

export function getEngagementBadgeClass(
  item: Pick<BookmarkNeedItem, 'status' | 'engagement'>
): string {
  if (item.status !== 'OPEN') {
    return 'bg-muted text-muted-foreground border-border';
  }
  const { needsFollowUp, myProposalStatus, conversationId } = item.engagement;
  if (myProposalStatus === 'ACCEPTED') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400';
  }
  if (myProposalStatus === 'PENDING') {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
  }
  if (needsFollowUp) {
    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
  }
  if (conversationId) {
    return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400';
  }
  return 'bg-muted/60 text-muted-foreground border-border';
}

const PRIORITY_WEIGHT: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

export function sortBookmarkRows(items: BookmarkNeedItem[]): BookmarkNeedItem[] {
  return [...items].sort((a, b) => {
    if (a.engagement.needsFollowUp !== b.engagement.needsFollowUp) {
      return a.engagement.needsFollowUp ? -1 : 1;
    }
    const aOpen = a.status === 'OPEN';
    const bOpen = b.status === 'OPEN';
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    const pw =
      (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0);
    if (pw !== 0) return pw;
    return new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime();
  });
}

export function filterBookmarkRows(
  items: BookmarkNeedItem[],
  filter: BookmarkInboxFilter,
  query: string
): BookmarkNeedItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (filter === 'needs_follow_up' && !item.engagement.needsFollowUp) return false;
    if (
      filter === 'in_chat' &&
      !(item.engagement.conversationId && !item.engagement.myProposalStatus)
    ) {
      return false;
    }
    if (filter === 'proposed' && !item.engagement.myProposalStatus) return false;
    if (filter === 'closed' && item.status === 'OPEN') return false;

    if (!q) return true;
    const haystack = `${item.title} ${item.city ?? ''} ${item.categoryName}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function countNeedsFollowUp(items: BookmarkNeedItem[]): number {
  return items.filter((i) => i.engagement.needsFollowUp).length;
}

export function buildEngagement(
  status: string,
  myProposalStatus: BookmarkProposalStatus | null,
  conversationId: string | null
): BookmarkEngagement {
  const needsFollowUp =
    status === 'OPEN' && !myProposalStatus && !conversationId;
  return {
    needsFollowUp,
    myProposalStatus,
    conversationId,
  };
}
