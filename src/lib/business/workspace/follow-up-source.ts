import { routeBuilder } from '@/config/routes';
import type { WorkspaceCollaborationItem, WorkspaceNeedItem } from '@/components/workspace/types';

export type WorkspaceFollowUpCandidate = WorkspaceNeedItem | WorkspaceCollaborationItem;

export function followUpSourceId(item: WorkspaceFollowUpCandidate): string {
  if (item.kind === 'need') return item.requestId;
  return `collab:${item.id}`;
}

export function followUpSubjectLabel(item: WorkspaceFollowUpCandidate): string {
  if (item.kind === 'need') return item.title;
  return item.headline ?? item.businessName;
}

export function followUpLinkHref(item: WorkspaceFollowUpCandidate): string {
  if (item.kind === 'need') return item.needUrl;
  if (item.authorSlug) return routeBuilder.businessProfile(item.authorSlug);
  return routeBuilder.pro(item.authorUserId ?? item.targetBusinessId);
}

export function followUpLinkLabel(item: WorkspaceFollowUpCandidate): string {
  return item.kind === 'need' ? 'مشاهده نیاز' : 'مشاهده پروفایل';
}

export function followUpCustomerLabel(item: WorkspaceFollowUpCandidate): string | null {
  if (item.kind === 'need') return item.userName ?? null;
  return item.businessName;
}

export function followUpPropertyLabel(item: WorkspaceFollowUpCandidate): string | null {
  if (item.kind === 'need') return item.location;
  return item.area;
}

export function followUpContactMeta(item: WorkspaceFollowUpCandidate) {
  if (item.kind === 'need') {
    return {
      contactUserId: item.contactUserId ?? null,
      chatUrl: item.chatUrl ?? null,
      contactRequestId: item.requestId,
      authorSlug: null as string | null,
      displayName: item.userName ?? item.title,
      hasPhone: Boolean(item.contactUserId),
      chatEnabled: Boolean(item.chatUrl || item.contactUserId),
    };
  }

  return {
    contactUserId: item.authorUserId ?? null,
    chatUrl: null,
    contactRequestId: null,
    authorSlug: item.authorSlug ?? null,
    displayName: item.businessName,
    hasPhone: item.hasPhone ?? false,
    chatEnabled: item.chatEnabled !== false,
  };
}
