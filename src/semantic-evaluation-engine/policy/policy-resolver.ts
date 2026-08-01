/**
 * Policy resolution — §4 (`PLAN/semantic-comparator-architecture.md`): most-specific scope wins
 * (categoryBranch > marketplaceVertical > global), falling back to a global default. Pure,
 * data-driven, deterministic — no ML, no AI, matching every other resolution step in this layer.
 */
import type { PolicyResolutionContext, ScoringPolicy } from '../types';

export function resolveScoringPolicy(policies: readonly ScoringPolicy[], context: PolicyResolutionContext): ScoringPolicy {
  if (context.categoryBranch) {
    const match = policies.find((p) => 'categoryBranch' in p.appliesTo && p.appliesTo.categoryBranch === context.categoryBranch);
    if (match) return match;
  }
  if (context.marketplaceVertical) {
    const match = policies.find((p) => 'marketplaceVertical' in p.appliesTo && p.appliesTo.marketplaceVertical === context.marketplaceVertical);
    if (match) return match;
  }
  const global = policies.find((p) => 'global' in p.appliesTo && p.appliesTo.global);
  if (global) return global;
  throw new Error('No applicable ScoringPolicy found — at least one global-scope policy must always be registered.');
}
