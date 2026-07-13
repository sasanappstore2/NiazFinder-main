/**
 * Continuous Cognitive Quality System (CCQS) — public entry point.
 * `PLAN/ccqs-architecture.md` is the architecture spec. Not part of the Cognitive Engine, not part
 * of SEE — the permanent quality platform surrounding both.
 */
export * from './types';
export * from './golden-dataset';
export * from './adapters/golden-case-to-snapshot';
export * from './engine-version/current-engine-version';
export * from './replay/run-golden-replay';
export * from './replay/read-replay-records';
export * from './metrics/aggregate-quality-metrics';
export * from './compare/compare-replay-runs';
export * from './gate/evaluate-gate';
export * from './gate/default-gate-policy';
