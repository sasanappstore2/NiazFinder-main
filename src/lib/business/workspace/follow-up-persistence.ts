import type { WorkspaceFollowUpItem } from '@/components/workspace/types';
import { mergeEcosystemIntoExtensions } from '@/lib/business/ecosystem/accessor';
import type { WorkspaceFollowUpRecord } from '@/lib/business/ecosystem/types';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';

function itemToRecord(item: WorkspaceFollowUpItem): WorkspaceFollowUpRecord {
  const { kind: _kind, ...record } = item;
  return record;
}

export function readWorkspaceFollowUpsFromExtensions(extensions: string): WorkspaceFollowUpItem[] {
  const root = parseJsonObject<Record<string, unknown>>(extensions, {});
  const ecosystem = (root.ecosystem as { workspaceFollowUps?: WorkspaceFollowUpRecord[] }) ?? {};
  const items = ecosystem.workspaceFollowUps ?? [];
  return items.map((record) => ({ kind: 'followup' as const, ...record }));
}

export function writeWorkspaceFollowUpsToExtensions(
  extensions: string,
  items: WorkspaceFollowUpItem[]
): string {
  const records = items.map(itemToRecord);
  const merged = mergeEcosystemIntoExtensions(extensions, { workspaceFollowUps: records });
  return toJson(merged);
}
