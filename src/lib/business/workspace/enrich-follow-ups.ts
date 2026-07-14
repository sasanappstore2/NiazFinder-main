import { routeBuilder } from '@/config/routes';
import type {
  WorkspaceCollaborationItem,
  WorkspaceFollowUpItem,
  WorkspaceNeedItem,
} from '@/components/workspace/types';
import { followUpContactMeta, followUpLinkHref } from './follow-up-source';

function collabBySourceId(
  collabs: WorkspaceCollaborationItem[],
  sourceId: string
): WorkspaceCollaborationItem | undefined {
  const rawId = sourceId.replace(/^collab:/, '');
  return collabs.find((c) => c.id === rawId || c.id === `post-${rawId}` || `collab:${c.id}` === sourceId);
}

export function enrichFollowUpsFromSources(
  items: WorkspaceFollowUpItem[],
  needs: WorkspaceNeedItem[],
  collabs: WorkspaceCollaborationItem[]
): WorkspaceFollowUpItem[] {
  const needByRequest = new Map(needs.map((n) => [n.requestId, n]));

  return items.map((item) => {
    if (item.sourceKind === 'collaboration' || item.requestId.startsWith('collab:')) {
      const collab = collabBySourceId(collabs, item.requestId);
      if (!collab) return item;
      const contact = followUpContactMeta(collab);
      return {
        ...item,
        contactUserId: item.contactUserId ?? contact.contactUserId,
        authorSlug: item.authorSlug ?? contact.authorSlug,
        hasPhone: item.hasPhone ?? contact.hasPhone,
        chatEnabled: item.chatEnabled ?? contact.chatEnabled,
        needUrl: item.needUrl || followUpLinkHref(collab),
      };
    }

    const need = needByRequest.get(item.requestId);
    if (!need) return item;

    const contact = followUpContactMeta(need);
    const chatUrl =
      item.chatUrl ??
      need.chatUrl ??
      (need.conversationId ? routeBuilder.chatConversation(need.conversationId) : null);

    return {
      ...item,
      contactUserId: item.contactUserId ?? contact.contactUserId,
      chatUrl,
      contactRequestId: item.contactRequestId ?? need.requestId,
      hasPhone: item.hasPhone ?? contact.hasPhone,
      chatEnabled: item.chatEnabled ?? contact.chatEnabled,
      customer: item.customer ?? need.userName ?? item.customer,
      property: item.property ?? need.location ?? item.property,
      needUrl: item.needUrl || need.needUrl,
    };
  });
}
