export interface GeoCliArgs {
  province?: string;
  city?: string;
  dryRun?: boolean;
  repair?: boolean;
  force?: boolean;
  all?: boolean;
}

export function parseGeoArgs(argv: string[]): GeoCliArgs {
  const out: GeoCliArgs = {};
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true;
    if (arg === '--repair') out.repair = true;
    if (arg === '--force') out.force = true;
    if (arg === '--all') out.all = true;
    if (arg.startsWith('--province=')) out.province = arg.slice('--province='.length).trim();
    if (arg.startsWith('--city=')) out.city = arg.slice('--city='.length).trim();
  }
  return out;
}
