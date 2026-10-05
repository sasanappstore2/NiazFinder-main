import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import { buildNeighborhoodCandidateDecision } from './build-divar-neighborhood-candidate-corpus';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const neighborhoods: ManagedNeighborhood[] = [
  { id: 'ferdowsi-north', name: 'فردوسی شمالی', areas: ['فردوسی'], isActive: true, order: 0 },
  { id: 'ferdowsi-south', name: 'فردوسی جنوبی', areas: ['فردوسی'], isActive: true, order: 1 },
  { id: 'sajad', name: 'سجاد', areas: [], isActive: true, order: 2 },
];

const ambiguous = buildNeighborhoodCandidateDecision(
  neighborhoods,
  'یک واحد حوالی فردوسی در مشهد می‌خواهم.',
  'مشهد',
  'ferdowsi-north',
);
assert(ambiguous !== null, 'text-grounded ambiguous neighborhood should create a bounded decision');
assert(ambiguous.candidateIds.length === 2, `candidate count: ${ambiguous.candidateIds.length}`);
assert(ambiguous.candidateIds.includes('ferdowsi-north'), 'candidate set must contain exact mapped target');
assert(ambiguous.question.criteria.unknown, 'question must include an abstention option');
assert(Object.keys(ambiguous.question.criteria).length === 3, 'question must contain two candidates and unknown only');

const unique = buildNeighborhoodCandidateDecision(
  neighborhoods,
  'آپارتمان در محله سجاد می‌خواهم.',
  'مشهد',
  'sajad',
);
assert(unique === null, 'unique deterministic text match must not be sent to Si');

const unmentioned = buildNeighborhoodCandidateDecision(
  neighborhoods,
  'یک آپارتمان ۱۳۰ متری می‌خواهم.',
  'مشهد',
  'ferdowsi-north',
);
assert(unmentioned === null, 'unmentioned neighborhood must not receive a guessed candidate set');

const wrongTarget = buildNeighborhoodCandidateDecision(
  neighborhoods,
  'یک واحد حوالی فردوسی در مشهد می‌خواهم.',
  'مشهد',
  'sajad',
);
assert(wrongTarget === null, 'weak geotag target outside explicit candidates must be rejected');

const betweenPlaces = buildNeighborhoodCandidateDecision(
  neighborhoods,
  'یک واحد بین فردوسی و سجاد در مشهد می‌خواهم.',
  'مشهد',
  'ferdowsi-north',
);
assert(betweenPlaces === null, 'a boundary between places cannot be mislabeled as one neighborhood');

console.log('Divar neighborhood candidate corpus: bounded options, explicit evidence, abstention and target-agreement tests passed');
