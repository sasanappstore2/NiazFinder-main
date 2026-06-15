/**
 * National Divar neighborhood import orchestrator.
 *
 * Run: npm run neighborhoods:import-national
 */
import { execSync } from 'child_process';

const steps = [
  'npx --yes tsx scripts/neighborhoods/import-from-divar.ts --gaps-only',
  'npx --yes tsx scripts/neighborhoods/import-from-divar.ts --refresh-all --merge',
  'npm run neighborhoods:fix-manifest',
  'npm run neighborhoods:build-manual-map',
  'npx --yes tsx scripts/neighborhoods/import-from-osm.ts --gaps-only --force',
  'npm run neighborhoods:ensure-national-fallback',
  'npm run neighborhoods:fix-manifest',
  'npm run neighborhoods:sanitize-areas',
  'npm run neighborhoods:ensure-areas',
  'npm run neighborhoods:strip-synthetic',
  'npm run neighborhoods:apply-supplements',
  'npm run neighborhoods:build-geo',
  'npm run neighborhoods:import-geo',
  'npm run neighborhoods:generate-known-areas',
  'npm run neighborhoods:validate',
  'npm run test:divar-neighborhoods-coverage',
  'npm run test:neighborhoods',
];

for (const cmd of steps) {
  console.log(`\n>>> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
}

console.log('\nNational Divar neighborhood import complete.');
