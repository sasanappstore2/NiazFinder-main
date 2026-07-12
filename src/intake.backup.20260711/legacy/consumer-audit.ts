export type LegacyConsumerAccess = 'READ' | 'WRITE' | 'READ_WRITE';
export type LegacyMigrationStatus = 'Migrated' | 'Partial' | 'Not Migrated';

export interface LegacyConsumerRecord {
  consumer: string;
  field: 'parsedIntent' | 'answers' | 'both';
  access: LegacyConsumerAccess;
  migrationStatus: LegacyMigrationStatus;
  notes?: string;
}

/**
 * Audit matrix for legacy parsedIntent/answers consumers.
 * Update as migration progresses; used for deprecation planning.
 */
export const LEGACY_CONSUMER_MATRIX: readonly LegacyConsumerRecord[] = [
  {
    consumer: 'NeedIntakePanel (live summary, chips)',
    field: 'both',
    access: 'READ',
    migrationStatus: 'Partial',
    notes: 'Reads derived mirrors; writes should go through NeedDraft.entities',
  },
  {
    consumer: 'need-intake-store',
    field: 'both',
    access: 'READ_WRITE',
    migrationStatus: 'Partial',
    notes: 'Legacy setters deprecated; canonical path via applyNeedDraft',
  },
  {
    consumer: 'draftToLegacyPayload',
    field: 'both',
    access: 'READ',
    migrationStatus: 'Migrated',
    notes: 'Adapter derives legacy from canonical entities',
  },
  {
    consumer: 'publishProjection / map-to-request',
    field: 'both',
    access: 'READ',
    migrationStatus: 'Migrated',
    notes: 'Uses draftToLegacyPayload on demand',
  },
  {
    consumer: 'listing-composer / preview-listing',
    field: 'both',
    access: 'READ',
    migrationStatus: 'Migrated',
    notes: 'Uses listing projection + legacy adapter',
  },
  {
    consumer: 'publish route',
    field: 'parsedIntent',
    access: 'READ',
    migrationStatus: 'Migrated',
    notes: 'Category fallback only; primary source is entities',
  },
  {
    consumer: 'internal-orchestrator / chat-turn-rules',
    field: 'both',
    access: 'READ_WRITE',
    migrationStatus: 'Not Migrated',
    notes: 'Legacy chat flow; candidate for chat projection',
  },
  {
    consumer: 'next-question API',
    field: 'both',
    access: 'READ',
    migrationStatus: 'Not Migrated',
    notes: 'Accepts parsedIntent+answers in request body',
  },
  {
    consumer: 'extract-slots API',
    field: 'both',
    access: 'READ',
    migrationStatus: 'Not Migrated',
    notes: 'Accepts parsedIntent+answers in request body',
  },
  {
    consumer: 'NeedIntakeSession (Prisma)',
    field: 'both',
    access: 'WRITE',
    migrationStatus: 'Not Migrated',
    notes: 'Persists parsedIntent/answers JSON — do not expand usage',
  },
] as const;

export function listUnmigratedConsumers(): LegacyConsumerRecord[] {
  return LEGACY_CONSUMER_MATRIX.filter((r) => r.migrationStatus !== 'Migrated');
}
