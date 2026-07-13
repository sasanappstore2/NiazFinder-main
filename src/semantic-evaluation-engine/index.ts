/**
 * Semantic Evaluation Engine (SEE) — public entry point.
 * `PLAN/semantic-comparator-architecture.md` is the architecture spec; this barrel re-exports the
 * pieces a caller (e.g. the publish route) actually needs to run a full Layer 1 + Layer 2 pass.
 */
export * from './types';
export * from './ontology';
export * from './adapters';
export * from './comparator';
export * from './policy';
export * from './registry';
export * from './config';
