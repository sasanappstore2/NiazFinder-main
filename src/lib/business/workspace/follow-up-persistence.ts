import type { WorkspaceFollowUpItem } from '@/components/workspace/types';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';

const EXT_KEY = 'workspaceFollowUps';

export type WorkspaceFollowUpsBlob = {
  items: WorkspaceFollowUpItem[];
  updatedAt: string;
};

export function readWorkspaceFollowUpsFromExtensions(extensions: string): WorkspaceFollowUpItem[] {
  const root = parseJsonObject<Record<string, unknown>>(extensions, {});
  const blob = root[EXT_KEY] as WorkspaceFollowUpsBlob | undefined;
  return Array.isArray(blob?.items) ? blob.items : [];
}

export function writeWorkspaceFollowUpsToExtensions(
  extensions: string,
  items: WorkspaceFollowUpItem[]
): string {
  const root = parseJsonObject<Record<string, unknown>>(extensions, {});
  const next: WorkspaceFollowUpsBlob = {
    items,
    updatedAt: new Date().toISOString(),
  };
  return toJson({ ...root, [EXT_KEY]: next });
}
