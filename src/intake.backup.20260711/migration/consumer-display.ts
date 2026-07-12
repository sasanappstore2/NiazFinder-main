import {
  LEGACY_CONSUMER_MATRIX,
  type LegacyConsumerRecord,
  type LegacyMigrationStatus,
} from '@/intake/legacy/consumer-audit';

export interface ConsumerDisplayRow {
  consumer: string;
  status: LegacyMigrationStatus;
  read: 'Canonical' | 'Legacy' | 'Mixed';
  write: 'None' | 'Legacy' | 'Canonical';
  notes?: string;
}

export function toConsumerDisplayRows(): ConsumerDisplayRow[] {
  return LEGACY_CONSUMER_MATRIX.map((row) => ({
    consumer: row.consumer,
    status: row.migrationStatus,
    read: resolveReadSource(row),
    write: resolveWriteSource(row),
    notes: row.notes,
  }));
}

function resolveReadSource(row: LegacyConsumerRecord): ConsumerDisplayRow['read'] {
  if (row.migrationStatus === 'Migrated') return 'Canonical';
  if (row.migrationStatus === 'Partial') return 'Mixed';
  return 'Legacy';
}

function resolveWriteSource(row: LegacyConsumerRecord): ConsumerDisplayRow['write'] {
  if (row.access === 'READ') return 'None';
  if (row.access === 'WRITE') return 'Legacy';
  if (row.migrationStatus === 'Migrated') return 'None';
  return 'Legacy';
}
