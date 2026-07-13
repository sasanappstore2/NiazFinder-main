/**
 * Location catalog version — closes the Replay Determinism Audit's §2/§3 finding that the
 * location catalog was "the only untracked knowledge-source dependency in the whole system":
 * `RULES_REGISTRY_VERSION` versions the category rules, but nothing versioned the
 * IntakeCity/IntakeNeighborhood tables (or the ≤500-city JSON fallback catalog), so two replay
 * runs under one pinned EngineVersionManifest could legitimately differ on location with nothing
 * recorded to explain why. Adopted as a required axis by RFC-004 §30; approved for
 * implementation by the Operationalization Roadmap.
 *
 * Maintained exactly like RULES_REGISTRY_VERSION: bumped manually whenever catalog CONTENT
 * changes in a way that could alter a resolution result (city/neighborhood/alias rows added,
 * deactivated, renamed, re-parented; JSON fallback regenerated). Reachability/fallback state is
 * a separate, per-run fact — see `locationCatalogSourceLabel()`.
 *
 * Carried in the EngineVersionManifest through the EXISTING `ontologyVersions` map under the
 * 'location-catalog' namespace — the map was designed as namespace→version for exactly this
 * class of knowledge dependency, so no frozen CCQS type changes (additive data, not schema).
 *
 * History: 1.0.0 = the catalog as of the Operationalization Roadmap (2026-07-09), the same
 * content every prior ReplayRun (baseline v1, production-readiness v2) actually ran against —
 * those runs' manifests lack this axis; their reports note catalog identity only implicitly.
 */
import { isPrismaLocationCatalogEnabled } from './location-fuse-index';

export const LOCATION_CATALOG_VERSION = '1.0.0';
export const LOCATION_CATALOG_NAMESPACE = 'location-catalog';

/**
 * Which catalog SOURCE this process is actually using — the audit's High-severity finding was
 * precisely that the DB-unavailable JSON fallback (≤500 cities) is a categorically different,
 * smaller dataset, invisible in any manifest. This label makes the source explicit per run.
 * NOTE: reflects the flag/failover state at CALL time; a mid-run Prisma failure that flips the
 * fallback is caught by comparing this label at run start vs. run end (see the replay CLI).
 */
export function locationCatalogSourceLabel(): string {
  return isPrismaLocationCatalogEnabled()
    ? `${LOCATION_CATALOG_VERSION}+db`
    : `${LOCATION_CATALOG_VERSION}+json-fallback`;
}
