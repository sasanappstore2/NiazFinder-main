/**
 * Rules registry version — CCQS `EngineVersionManifest` axis (`PLAN/ccqs-architecture.md` §2/§9).
 * Bumped manually whenever `legacy-bridge.ts`'s generated rules or a `*.pack.json` file's matching
 * behavior changes in a way that could alter `matchCategoryCandidatesFromRules`'s output — mirrors
 * exactly how `CATEGORY_ONTOLOGY_VERSION` (SEE, Step 2) is maintained for the category ontology.
 *
 * No such version identifier existed before this — a real, previously-undetected gap: the
 * "موتور سیکلت" collision fix (this session's Priority 3) changed matching behavior with no way
 * to say "which rules version produced this decision." History: 1.0.0 = baseline capturing the
 * Priority 3 fix (motorcycle negative-rule `unless` correction + spare-parts collision guards).
 * 1.1.0 = Production Readiness pass (Baseline Report V1 follow-through): completed the
 * خونه/خانه real-estate-synonym collision guard across all 4 affected slugs (was only ever applied
 * to 1 of 8 slug×spelling cells), added a short-term-rent vs. apartment-rent disambiguation guard,
 * and added an apartment-sale vs. apartment-rent deal-type ("فروش") disambiguation guard.
 * 1.1.1 = Operationalization Roadmap M4 (patch — zero rule-content change): pack files now load
 * in sorted filename order (Replay Determinism Audit §2 always-correct fix; assembly order could
 * previously vary by filesystem, observable only on exact cross-pack score ties).
 * 1.1.2 = Bare phone model "14" no longer matches money amounts; villa خانه/خونه guards allow ویلا.
 * 1.1.3 = elevator-repair discounted when آپارتمان/ویلا/خرید present (amenity vs repair).
 * 1.1.4 = villa/apartment rent preferred over sale when strong rent framing + stray می‌خرم.
 * 1.1.8 = villa-sale buy phrases; apartment discounted on ویلا.
 * 1.2.0 = estate property×deal collision table (data-driven cross-leaf matrix) + bare «ملک» narrowed.
 */
export const RULES_REGISTRY_VERSION = '1.2.0';
