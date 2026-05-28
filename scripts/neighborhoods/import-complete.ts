/**
 * Full neighborhood import: Divar first, then OSM for gaps.
 * Run: npm run neighborhoods:import:complete
 */
import { execSync } from 'child_process';

const steps = [
  'npm run neighborhoods:build-manual-map',
  'npm run neighborhoods:import',
  'npm run neighborhoods:import:osm',
  'npm run neighborhoods:fix-manifest',
  'npm run neighborhoods:validate',
];

for (const cmd of steps) {
  console.log(`\n>>> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
}
