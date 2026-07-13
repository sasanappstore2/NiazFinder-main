/**
 * CategoryOntologyProvider — Step 2 of the approved SEE implementation order
 * (`PLAN/semantic-comparator-architecture.md` §2/§9/§12).
 *
 * ONE interchangeable implementation of `OntologyProvider` for the `category` namespace, backed by
 * `src/config/categories.ts`'s existing `parentSlug` tree via its own `getCategoryPath` — reused
 * unchanged, not reimplemented, matching every prior phase's "wrap proven code, don't rewrite it"
 * discipline. Nothing about `relate()`'s distance/type rules is specific to the SEE Comparator's
 * core loop; a future `IntentOntologyProvider`/`MarketplaceEntityOntologyProvider` (RFC-003) would
 * implement the same interface against different data with zero change to any Comparator code.
 *
 * `relate(a, b)` convention (not previously pinned down in the architecture doc — fixed here as
 * part of this implementation): the relationship is stated FROM a's perspective TO b. `type:
 * 'parent-of'` means "a is the parent of b"; `type: 'child-of'` means "a is the child of b".
 *
 * Distance rule (architecture §2/§9's `categoryDistance()`, restated precisely):
 *   0   — identical slug
 *   N   — a is an ancestor/descendant of b, N hops apart (1 for a direct parent/child; the
 *         registry's max depth is 0-1-2, so N is 1 or 2 — never more)
 *   2   — a and b are not in an ancestor/descendant relationship but share a common ancestor,
 *         whether that's the immediate (depth-1) parent (true siblings) or only the depth-0 root
 *         (e.g. "motorcycle" vs "car", both under "vehicles") — matches the architecture doc's
 *         rule exactly: both cases collapse to distance 2. The 2-hop ancestor case above can also
 *         equal 2 numerically; they are told apart by `type` (`parent-of`/`child-of` vs
 *         `sibling`), which is what the Comparator (Step 4) actually switches on — the Scoring
 *         Policy Engine (Layer 2, Step 5) is what may later weight them differently.
 *   CATEGORY_UNRELATED_DISTANCE — different depth-0 branches entirely, or an unknown slug.
 *   A large FINITE constant is used instead of Infinity deliberately: `JSON.stringify(Infinity)`
 *   produces `null`, which would silently corrupt a persisted `ComparisonReport` on the very next
 *   read and break INV-07 (deterministic replay).
 */
import { getCategoryPath } from '@/config/categories';
import type { OntologyProvider, OntologyRef, OntologyRelationship } from '../types/ontology';

export const CATEGORY_ONTOLOGY_NAMESPACE = 'category';

/** Well above any real distance (0, 1, or 2) so ordering is always preserved; see file header. */
export const CATEGORY_UNRELATED_DISTANCE = 100;

/** Bump manually whenever `categories.ts`'s tree structure changes in a way that could alter a
 *  distance result (a reparent, a new depth level) — architecture §6's Ontology Version axis. */
export const CATEGORY_ONTOLOGY_VERSION = '1.0.0';

function assertNamespace(ref: OntologyRef): void {
  if (ref.namespace !== CATEGORY_ONTOLOGY_NAMESPACE) {
    throw new Error(
      `CategoryOntologyProvider received a ref outside its namespace "${CATEGORY_ONTOLOGY_NAMESPACE}": ${JSON.stringify(ref)}`
    );
  }
}

function relate(a: OntologyRef, b: OntologyRef): OntologyRelationship {
  assertNamespace(a);
  assertNamespace(b);

  if (a.id === b.id) {
    return { type: 'identical', distance: 0, directional: false, explanationParams: { slug: a.id } };
  }

  const pathA = getCategoryPath(a.id).map((c) => c.slug); // root -> a, inclusive
  const pathB = getCategoryPath(b.id).map((c) => c.slug); // root -> b, inclusive

  if (pathA.length === 0 || pathB.length === 0) {
    // An unknown slug is not this provider's failure to relate — it's absent from the registry.
    return {
      type: 'unrelated',
      distance: CATEGORY_UNRELATED_DISTANCE,
      directional: false,
      explanationParams: { reason: 'unknown-slug', aId: a.id, bId: b.id },
    };
  }

  const bIndexInA = pathA.indexOf(b.id);
  if (bIndexInA !== -1) {
    // b appears in a's own root->a path => b is an ancestor of a => a is the descendant.
    return {
      type: 'child-of',
      distance: pathA.length - 1 - bIndexInA,
      directional: true,
      explanationParams: { ancestorId: b.id, descendantId: a.id },
    };
  }
  const aIndexInB = pathB.indexOf(a.id);
  if (aIndexInB !== -1) {
    return {
      type: 'parent-of',
      distance: pathB.length - 1 - aIndexInB,
      directional: true,
      explanationParams: { ancestorId: a.id, descendantId: b.id },
    };
  }

  // Neither is an ancestor of the other. Find the deepest shared ancestor, if any.
  let sharedDepth = -1;
  const minLen = Math.min(pathA.length, pathB.length);
  for (let i = 0; i < minLen; i++) {
    if (pathA[i] === pathB[i]) sharedDepth = i;
    else break;
  }
  if (sharedDepth >= 0) {
    return {
      type: 'sibling',
      distance: 2,
      directional: false,
      explanationParams: { sharedAncestorId: pathA[sharedDepth], sharedAncestorDepth: sharedDepth },
    };
  }

  return {
    type: 'unrelated',
    distance: CATEGORY_UNRELATED_DISTANCE,
    directional: false,
    explanationParams: { reason: 'different-top-level-branch', aId: a.id, bId: b.id },
  };
}

export const categoryOntologyProvider: OntologyProvider = {
  namespace: CATEGORY_ONTOLOGY_NAMESPACE,
  version: CATEGORY_ONTOLOGY_VERSION,
  relate,
};
