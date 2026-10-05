import type { NeedDraft } from '@/contracts/need-intake';
import type { IntakeFieldMeta } from '@/intake/template/types';
import type { TransactionType } from '@/intake/types';

export type DraftPatch = Partial<Record<string, unknown>>;

export function entityPatchForField(
  field: IntakeFieldMeta,
  value: string | number | string[]
): DraftPatch {
  if (field.key === 'budget') {
    const amount = value === '' || value == null ? null : value;
    return { budgetMax: amount, budgetMin: amount };
  }
  if (field.key === 'transactionType') {
    const tx = String(value || '');
    const patch: DraftPatch = { transactionType: (value || null) as TransactionType | null };
    // Deal switch: money fields that no longer belong to the new deal are
    // cleared so stale rahn/rent amounts never leak across deal types.
    if (tx === 'BUY' || tx === 'SELL') {
      patch.rahnAmount = null;
      patch.monthlyRent = null;
    } else if (tx === 'FULL_DEPOSIT') {
      patch.monthlyRent = null;
    } else if (tx === 'RENT') {
      patch.rahnAmount = null;
    }
    return patch;
  }
  if (field.key === 'area' || field.key === 'rooms') {
    const n = value === '' || value == null ? null : Number(value);
    return { [field.key]: Number.isFinite(n) ? n : null };
  }
  if (field.key === 'mapPin') {
    return {};
  }
  return { [field.key]: value === '' ? null : value };
}

export function updateDraftField(
  draft: NeedDraft,
  field: IntakeFieldMeta,
  value: string | number | string[]
): NeedDraft {
  if (field.storage === 'answers') {
    const answers = {
      ...draft.answers,
      [field.key]: value,
      ...(field.key === 'dealType' ? { _userSetDealType: true } : {}),
    };
    return { ...draft, answers };
  }

  const patch = entityPatchForField(field, value);
  return {
    ...draft,
    entities: { ...draft.entities, ...patch },
  };
}
