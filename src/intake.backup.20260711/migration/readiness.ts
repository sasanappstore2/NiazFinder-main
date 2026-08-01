import { LEGACY_CONSUMER_MATRIX } from '@/intake/legacy/consumer-audit';

export interface MigrationReadinessInput {
  legacyWrites24h: number;
  driftTotalToday: number;
  driftDiffToday: number;
}

export interface MigrationReadinessResult {
  score: number;
  legacyReadComponent: number;
  legacyWriteComponent: number;
  driftComponent: number;
  readyForLegacyRemoval: boolean;
  blockers: string[];
}

/** 40% legacy reads + 40% legacy writes + 20% drift rate (lower drift = better). */
export function computeMigrationReadiness(input: MigrationReadinessInput): MigrationReadinessResult {
  const migrated = LEGACY_CONSUMER_MATRIX.filter((c) => c.migrationStatus === 'Migrated').length;
  const legacyReadComponent = Math.round((migrated / LEGACY_CONSUMER_MATRIX.length) * 100);

  const legacyWriteComponent =
    input.legacyWrites24h === 0 ? 100 : Math.max(0, 100 - input.legacyWrites24h * 15);

  const driftRate =
    input.driftTotalToday > 0 ? input.driftDiffToday / input.driftTotalToday : 0;
  const driftComponent = Math.round(Math.max(0, (1 - driftRate) * 100));

  const score = Math.round(
    legacyReadComponent * 0.4 + legacyWriteComponent * 0.4 + driftComponent * 0.2
  );

  const blockers: string[] = [];
  if (input.legacyWrites24h > 0) blockers.push('Legacy writes detected in last 24h');
  if (legacyReadComponent < 100) blockers.push('Unmigrated legacy consumers remain');
  if (driftRate >= 0.001) blockers.push('Canonical drift above 0.1% today');

  const readyForLegacyRemoval =
    input.legacyWrites24h === 0 && legacyReadComponent === 100 && driftRate < 0.001;

  return {
    score,
    legacyReadComponent,
    legacyWriteComponent,
    driftComponent,
    readyForLegacyRemoval,
    blockers,
  };
}
