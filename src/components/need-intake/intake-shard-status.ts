import type { NeedDraft } from '@/contracts/need-intake';
import type { IntakeAiShardKey, IntakeAiShardStatus } from '@/components/need-intake/IntakeAiShardBar';
import {
  buildIntakeProgressSnapshot,
  type BuildIntakeProgressOpts,
  type IntakeProgressSnapshot,
} from '@/lib/need-intake/intake-progress-tracker';

export type { IntakeProgressSnapshot, BuildIntakeProgressOpts };

export function intakeProgressSnapshotFromDraft(
  draft: NeedDraft | null,
  opts?: BuildIntakeProgressOpts
): IntakeProgressSnapshot {
  return buildIntakeProgressSnapshot(draft, opts);
}

/** Legacy shard map for analyze hooks (cascade-aware). */
export function shardStatusFromNeedDraft(
  draft: NeedDraft | null,
  enriching: boolean,
  opts?: Omit<BuildIntakeProgressOpts, 'enriching'>
): Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>> {
  const snapshot = buildIntakeProgressSnapshot(draft, { ...opts, enriching });

  const mapCore = (key: 'need' | 'category' | 'city' | 'neighborhood'): IntakeAiShardStatus => {
    const s = snapshot.core[key];
    if (s === 'done') return 'done';
    if (s === 'running') return 'running';
    return 'pending';
  };

  const budgetField = snapshot.fields.find(
    (f) => f.key === 'budget' || f.key === 'budgetMax' || f.key === 'budgetMin'
  );
  const budgetStatus: IntakeAiShardStatus = budgetField
    ? budgetField.status === 'done'
      ? 'done'
      : budgetField.status === 'running'
        ? 'running'
        : 'pending'
    : mapCore('category');

  return {
    need: mapCore('need'),
    category: mapCore('category'),
    city: mapCore('city'),
    neighborhood: mapCore('neighborhood'),
    budget: budgetStatus,
  };
}

/** Only the shard currently running (for analyze transition UI). */
export function cascadeRunningShardsFromDraft(
  draft: NeedDraft | null,
  enriching: boolean,
  opts?: Omit<BuildIntakeProgressOpts, 'enriching'>
): Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>> {
  const base = shardStatusFromNeedDraft(draft, enriching, opts);
  const runningKey = (Object.entries(base) as [IntakeAiShardKey, IntakeAiShardStatus][]).find(
    ([, s]) => s === 'running'
  )?.[0];

  if (!runningKey) {
    return Object.fromEntries(
      (Object.keys(base) as IntakeAiShardKey[]).map((k) => [k, base[k] === 'done' ? 'done' : 'pending'])
    ) as Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>>;
  }

  const out: Partial<Record<IntakeAiShardKey, IntakeAiShardStatus>> = {};
  for (const key of Object.keys(base) as IntakeAiShardKey[]) {
    if (base[key] === 'done') out[key] = 'done';
    else if (key === runningKey) out[key] = 'running';
    else out[key] = 'pending';
  }
  return out;
}
