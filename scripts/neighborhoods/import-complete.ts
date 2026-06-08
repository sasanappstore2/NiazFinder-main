/**
 * Full neighborhood import: Divar first, then OSM for gaps.
 * Run: npm run neighborhoods:import:complete
 */
import { execSync } from 'child_process';

const steps = [
  'npm run neighborhoods:build-manual-map',
  'npm run neighborhoods:import',
  'npm run neighborhoods:import:osm',
  'npm run neighborhoods:sanitize-areas',
  'npm run neighborhoods:ensure-areas',
  'npm run neighborhoods:build-geo',
  'npm run neighborhoods:fix-manifest',
  'npm run neighborhoods:generate-known-areas',
  'npm run neighborhoods:validate',
  'npm run test:neighborhoods',
  'npm run neighborhoods:debug-map',
];

for (const cmd of steps) {
  console.log(`\n>>> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
}
