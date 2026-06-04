import type { BookmarkNeedItem, BookmarkEngagement } from './types';

export type { BookmarkNeedItem, BookmarkEngagement } from './types';
export {
  getEngagementLabel,
  getEngagementBadgeClass,
  sortBookmarkRows,
  filterBookmarkRows,
  countNeedsFollowUp,
  buildEngagement,
} from './types';

export interface BookmarkRequestApiItem extends Omit<BookmarkNeedItem, 'engagement'> {
  engagement?: BookmarkEngagement;
}

export function mapBookmarkApiToNeedItem(item: BookmarkRequestApiItem): BookmarkNeedItem {
  return {
    ...item,
    engagement: item.engagement ?? {
      needsFollowUp: item.status === 'OPEN',
      myProposalStatus: null,
      conversationId: null,
    },
  };
}
