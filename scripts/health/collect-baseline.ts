/**
 * Collect debug baseline (tsc hint, migration status). Run: npx tsx scripts/health/collect-baseline.ts
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '../..');
const reportsDir = join(root, 'reports');

function run(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, output: output.trim() };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return {
      ok: false,
      output: [err.stdout, err.stderr].filter(Boolean).join('\n').trim(),
    };
  }
}

const tsc = run('npx tsc --noEmit 2>&1');
const prisma = run('npx prisma migrate status 2>&1');
const validate = run('npx prisma validate 2>&1');

const tailwindPatterns = run(
  `grep -r --include='*.tsx' -l '\\-end-1\\|z-\\[var(--z-' src 2>/dev/null | wc -l || echo 0`
);

const baseline = {
  timestamp: new Date().toISOString(),
  prisma: { validate: validate.ok, migrateStatus: prisma.output },
  typescript: { ok: tsc.ok, errors: tsc.ok ? 0 : (tsc.output.match(/error TS/g) || []).length, sample: tsc.output.slice(0, 2000) },
  tailwindHintFiles: parseInt(tailwindPatterns.output.trim(), 10) || 0,
};

if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
const outPath = join(reportsDir, 'debug-baseline.json');
writeFileSync(outPath, JSON.stringify(baseline, null, 2));
console.log(`Wrote ${outPath}`);
console.log(JSON.stringify(baseline, null, 2));
process.exit(tsc.ok ? 0 : 1);
