import type { NeedDraft } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { hasEntityValue } from '@/intake/entities/entityRegistry';
import type { IntakeAiShardKey, IntakeAiShardStatus } from '@/components/need-intake/IntakeAiShardBar';
import { extractVehicleSubjectFromText } from '@/lib/need-intake/vertical-title';
import { resolveIntakeNeighborhoodFromDraft } from '@/lib/need-intake/sync-intake-location-form';

export function shardStatusFromNeedDraft(
  draft: NeedDraft | null,
  enriching: boolean
): Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>> {
  const entities = draft ? recordToEntities(draft.entities) : null;
  const statusFor = (filled: boolean): IntakeAiShardStatus =>
    filled ? 'done' : enriching ? 'running' : 'pending';

  const raw = (draft?.sourceText ?? draft?.parsedIntent.rawText ?? '').trim();
  const root = draft?.parsedIntent.categorySlug
    ? getCategoryPath(draft.parsedIntent.categorySlug)[0]?.slug
    : null;
  const isVehicle =
    draft?.parsedIntent.intentType.startsWith('vehicle') || root === 'vehicles';

  const needFilled = Boolean(
    entities?.categorySlug &&
      (isVehicle
        ? extractVehicleSubjectFromText(raw) ||
          draft?.parsedIntent.entities?.brand?.trim() ||
          String(draft?.answers?.brand ?? '').trim()
        : root === 'services'
          ? String(
              draft?.answers?.serviceType ?? draft?.parsedIntent.entities?.serviceCategory ?? ''
            ).trim()
          : root === 'jobs'
            ? String(draft?.answers?.jobTitle ?? '').trim()
            : raw.length >= 12)
  );

  const neighborhoodFilled = Boolean(
    resolveIntakeNeighborhoodFromDraft(draft) ||
      (typeof draft?.answers?.location === 'string' && draft.answers.location.trim().length >= 2)
  );

  return {
    category: statusFor(Boolean(entities?.categorySlug)),
    need: statusFor(needFilled),
    city: statusFor(Boolean(entities?.city?.trim() || draft?.parsedIntent.city?.trim())),
    neighborhood: statusFor(neighborhoodFilled),
    budget: statusFor(entities ? hasEntityValue(entities, 'budget') : false),
  };
}
