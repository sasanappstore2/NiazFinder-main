import type { CompletionState, IntakeEntities, MissingFieldItem } from '@/intake/types';
import { categoryNeedsTransactionType } from '@/intake/extractors/transactionExtractor';
import { hasEntityValue, type EntityValueContext } from '@/intake/entities/entityRegistry';
import { resolveNeedType } from '@/intake/schema/needTypes';

interface NeedSchemaDef {
  key: string;
  required: readonly string[];
  optional: readonly string[];
  priority: Readonly<Record<string, number>>;
}

const SCHEMAS: readonly NeedSchemaDef[] = [
  {
    key: 'apartment',
    required: ['transactionType', 'neighborhood'],
    optional: ['area', 'budget', 'rooms'],
    priority: {
      transactionType: 100,
      neighborhood: 95,
      budget: 90,
      area: 80,
      rooms: 70,
    },
  },
  {
    key: 'plumbing',
    required: ['description', 'neighborhood'],
    optional: ['urgency', 'budget'],
    priority: {
      description: 100,
      neighborhood: 95,
      urgency: 90,
      budget: 60,
    },
  },
  {
    key: 'car',
    required: ['city'],
    optional: ['budget'],
    priority: {
      city: 100,
      budget: 85,
    },
  },
];

const DEFAULT_SCHEMA: NeedSchemaDef = {
  key: 'default',
  required: ['category', 'city'],
  optional: ['budget', 'neighborhood'],
  priority: {
    category: 100,
    city: 95,
    neighborhood: 88,
    budget: 70,
  },
};

function resolveNeedSchema(entities: IntakeEntities): NeedSchemaDef {
  const needType = resolveNeedType(entities);
  if (needType.key.includes('apartment')) return SCHEMAS[0]!;
  if (needType.key.includes('plumbing')) return SCHEMAS[1]!;
  if (needType.key.includes('car')) return SCHEMAS[2]!;
  return DEFAULT_SCHEMA;
}

export function buildPrioritizedMissingFields(
  entities: IntakeEntities,
  ctx?: EntityValueContext
): MissingFieldItem[] {
  const schema = resolveNeedSchema(entities);
  const fields = new Map<string, MissingFieldItem>();

  for (const field of schema.required) {
    if (!hasEntityValue(entities, field, ctx)) {
      fields.set(field, {
        field,
        priority: schema.priority[field] ?? 50,
        required: true,
      });
    }
  }

  for (const field of schema.optional) {
    if (!hasEntityValue(entities, field, ctx)) {
      fields.set(field, {
        field,
        priority: schema.priority[field] ?? 40,
        required: false,
      });
    }
  }

  // Cross-category hard rule: property flows require explicit transaction type.
  if (categoryNeedsTransactionType(entities.categorySlug) && !entities.transactionType) {
    fields.set('transactionType', {
      field: 'transactionType',
      priority: Math.max(fields.get('transactionType')?.priority ?? 0, 100),
      required: true,
    });
  }

  return Array.from(fields.values()).sort((a, b) => b.priority - a.priority);
}

export function computeCompletionScore(missingFields: readonly MissingFieldItem[]): number {
  const max = 100;
  const penalty = missingFields.reduce((sum, item) => sum + (item.required ? 18 : 8), 0);
  return Math.max(0, max - penalty);
}

export function completionStateFromScore(score: number): CompletionState {
  if (score < 30) return 'VERY_INCOMPLETE';
  if (score < 70) return 'NEEDS_INFO';
  if (score < 90) return 'ALMOST_READY';
  return 'READY_TO_PUBLISH';
}

