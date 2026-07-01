import 'server-only';

import path from 'node:path';

/** Project root at runtime — excluded from Turbopack NFT static tracing. */
export function projectRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd());
}

/** Files under project `data/` (caches, telemetry, local DBs, etc.). */
export function dataPath(...segments: string[]): string {
  return path.join(projectRoot(), 'data', ...segments);
}

/** Rule pack JSON directory (`src/intake/rules/packs`). */
export function intakeRulesPacksPath(...segments: string[]): string {
  return path.join(projectRoot(), 'src', 'intake', 'rules', 'packs', ...segments);
}

/** Join a runtime directory with dynamic segments (tile paths, dated logs, etc.). */
export function joinRuntimePath(base: string, ...segments: string[]): string {
  return path.join(/* turbopackIgnore: true */ base, ...segments);
}
