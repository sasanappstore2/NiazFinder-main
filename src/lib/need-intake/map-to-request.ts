import type { NeedDraft } from '@/contracts/need-intake';
import type { PublishCommand } from '@/intake/projections/publishProjection';
import { toPublishCommand } from '@/intake/projections/publishProjection';

export type MappedCreateRequest = PublishCommand;

export function mapDraftToCreateRequest(
  draft: NeedDraft,
  categoryId: string,
  subcategoryId?: string | null
): MappedCreateRequest {
  return toPublishCommand(draft, categoryId, subcategoryId);
}
