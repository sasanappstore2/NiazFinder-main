import type { BrowseFilters } from '@/lib/filters/parser';

export const NEED_BROWSE_ALERT_NOTIFICATION_TYPE = 'need_browse_alert';

export interface NeedBrowseAlertPayload {
  browsePath: string;
  categorySlug?: string | null;
  citySlugs: string[];
  filters: Partial<BrowseFilters>;
  searchQuery?: string | null;
  label: string;
}

export interface NeedBrowseAlertNotificationData {
  requestId: string;
  requestTitle: string;
  requestSlug: string;
  requestDescription?: string;
  budgetMin?: string;
  budgetMax?: string;
  budgetType?: string;
  city?: string;
  province?: string;
  categoryName?: string;
  priority?: string;
  browsePath: string;
  alertLabel: string;
  alertId: string;
  createdAt?: string;
}
