import type { IntakeConfidence } from '@/intake/types';

export interface ConfidenceVisibilityCase {
  id: string;
  fields: readonly string[];
  filled: readonly string[];
  confidence: IntakeConfidence;
  /** Minimum percent reduction vs showing all section fields. */
  minReductionPct: number;
}

export const CONFIDENCE_VISIBILITY_CASES: ConfidenceVisibilityCase[] = [
  {
    id: 'cv-01-apartment-high-conf',
    fields: ['category', 'city', 'neighborhood', 'budget', 'transactionType', 'area', 'rooms'],
    filled: ['category', 'city', 'neighborhood', 'budget', 'transactionType'],
    confidence: {
      category: 0.92,
      city: 0.88,
      neighborhood: 0.86,
      budget: 0.81,
      transactionType: 0.9,
    },
    minReductionPct: 30,
  },
  {
    id: 'cv-02-partial-mid-conf',
    fields: ['category', 'city', 'neighborhood', 'budget', 'area'],
    filled: ['category', 'city', 'budget'],
    confidence: { category: 0.8, city: 0.78, budget: 0.76 },
    minReductionPct: 20,
  },
  {
    id: 'cv-03-low-conf-keeps-fields',
    fields: ['category', 'city', 'neighborhood', 'budget'],
    filled: ['category', 'city'],
    confidence: { category: 0.55, city: 0.6 },
    minReductionPct: 0,
  },
  {
    id: 'cv-04-missing-stays-visible',
    fields: ['category', 'city', 'neighborhood', 'transactionType', 'area'],
    filled: ['category'],
    confidence: { category: 0.95, city: 0.9, neighborhood: 0.88 },
    minReductionPct: 0,
  },
  {
    id: 'cv-05-rent-bundle',
    fields: ['category', 'city', 'neighborhood', 'budget', 'transactionType', 'rooms'],
    filled: ['category', 'city', 'neighborhood', 'transactionType', 'rooms'],
    confidence: {
      category: 0.91,
      city: 0.87,
      neighborhood: 0.84,
      transactionType: 0.88,
      rooms: 0.79,
    },
    minReductionPct: 30,
  },
  {
    id: 'cv-06-budget-only-skip',
    fields: ['category', 'city', 'budget', 'area'],
    filled: ['category', 'city', 'budget'],
    confidence: { category: 0.5, city: 0.55, budget: 0.9 },
    minReductionPct: 0,
  },
  {
    id: 'cv-07-wide-form',
    fields: [
      'category',
      'city',
      'neighborhood',
      'budget',
      'transactionType',
      'area',
      'rooms',
      'description',
    ],
    filled: ['category', 'city', 'neighborhood', 'budget', 'transactionType', 'area'],
    confidence: {
      category: 0.93,
      city: 0.89,
      neighborhood: 0.87,
      budget: 0.82,
      transactionType: 0.91,
      area: 0.8,
    },
    minReductionPct: 30,
  },
  {
    id: 'cv-08-ab-high-threshold',
    fields: ['category', 'city', 'neighborhood', 'budget'],
    filled: ['category', 'city', 'budget'],
    confidence: { category: 0.8, city: 0.78, budget: 0.77 },
    minReductionPct: 0,
  },
];
