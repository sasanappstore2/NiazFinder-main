import { db } from '@/lib/db';
import type { BrowseFilters } from '@/lib/filters/parser';
import {
  NEED_BROWSE_ALERT_NOTIFICATION_TYPE,
  type NeedBrowseAlertNotificationData,
} from '@/lib/need-alerts/types';
import { requestMatchesBrowseAlert } from '@/lib/need-alerts/match-request';

function budgetToJson(value: bigint | null | undefined): string | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : undefined;
}

/** پس از انتشار نیاز (OPEN + APPROVED) به مشترکین همان صفحهٔ مرور اعلان بفرست */
export async function notifyNeedBrowseAlertsForRequest(requestId: string): Promise<void> {
  const request = await db.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      category: { select: { id: true, slug: true, name: true } },
      subcategory: { select: { id: true, slug: true, name: true } },
    },
  });

  if (
    !request ||
    request.status !== 'OPEN' ||
    request.moderationStatus !== 'APPROVED'
  ) {
    return;
  }

  const alerts = await db.needBrowseAlert.findMany({
    where: { active: true },
  });

  if (alerts.length === 0) return;

  const categoryIds: string[] = [];
  if (request.category) {
    const children = await db.category.findMany({
      where: { parentId: request.category.id },
      select: { id: true },
    });
    categoryIds.push(request.category.id, ...children.map((c) => c.id));
  }

  for (const alert of alerts) {
    if (alert.userId === request.userId) continue;

    let filters: Partial<BrowseFilters> = {};
    try {
      filters = JSON.parse(alert.filtersJson) as Partial<BrowseFilters>;
    } catch {
      filters = {};
    }

    let citySlugs: string[] = [];
    try {
      citySlugs = JSON.parse(alert.citySlugs) as string[];
    } catch {
      citySlugs = [];
    }

    let categoryIdsForAlert: string[] | undefined;
    if (alert.categorySlug) {
      const cat = await db.category.findFirst({
        where: { OR: [{ slug: alert.categorySlug }, { id: alert.categorySlug }] },
        include: { children: { select: { id: true } } },
      });
      if (cat) {
        categoryIdsForAlert = [cat.id, ...cat.children.map((c) => c.id)];
      }
    }

    const matches = requestMatchesBrowseAlert(request, {
      categorySlug: alert.categorySlug,
      categoryIds: categoryIdsForAlert ?? categoryIds,
      citySlugs,
      filters,
      searchQuery: alert.searchQuery,
    });

    if (!matches) continue;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const duplicate = await db.notification.findFirst({
      where: {
        userId: alert.userId,
        type: NEED_BROWSE_ALERT_NOTIFICATION_TYPE,
        createdAt: { gte: since },
        data: { contains: requestId },
      },
    });
    if (duplicate) continue;

    const payload: NeedBrowseAlertNotificationData = {
      requestId: request.id,
      requestTitle: request.title,
      requestSlug: request.slug,
      requestDescription: request.description.slice(0, 280),
      budgetMin: budgetToJson(request.budgetMin),
      budgetMax: budgetToJson(request.budgetMax),
      budgetType: request.budgetType,
      city: request.city ?? undefined,
      province: request.province ?? undefined,
      categoryName: request.category?.name ?? undefined,
      priority: request.priority,
      browsePath: alert.browsePath,
      alertLabel: alert.label,
      alertId: alert.id,
      createdAt: request.createdAt.toISOString(),
    };

    await db.notification.create({
      data: {
        userId: alert.userId,
        type: NEED_BROWSE_ALERT_NOTIFICATION_TYPE,
        title: 'نیاز جدید مطابق جستجوی شما',
        message: `${request.title} — ${alert.label}`,
        data: JSON.stringify(payload),
      },
    });
  }
}
