/**
 * Count TypeScript diagnostics per subproject (IDE problem sources).
 * Run: npx tsx scripts/health/count-ide-diagnostics.ts
 */
import { execSync } from 'child_process';
import { appendFileSync, mkdirSync, existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const root = join(import.meta.dirname, '../..');
const logPath = join(root, '.cursor/debug-39cb59.log');

function countTsErrors(cwd: string, config = 'tsconfig.json'): number {
  try {
    execSync(`npx tsc --noEmit -p ${config} 2>&1`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return 0;
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
    return (out.match(/error TS/g) || []).length;
  }
}

function runEslintSrc(): { errors: number; warnings: number } {
  try {
    const out = execSync('npx eslint src --format json 2>/dev/null', { cwd: root, encoding: 'utf8' });
    const data = JSON.parse(out) as Array<{ errorCount: number; warningCount: number }>;
    return {
      errors: data.reduce((s, f) => s + f.errorCount, 0),
      warnings: data.reduce((s, f) => s + f.warningCount, 0),
    };
  } catch {
    return { errors: -1, warnings: -1 };
  }
}

function eslintConfigExists(subpath: string): boolean {
  return existsSync(join(root, subpath));
}

function listSrcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listSrcFiles(full));
    else if (['.tsx', '.ts', '.css'].includes(extname(entry))) out.push(full);
  }
  return out;
}

function countTailwindLegacyPatterns(): Record<string, number> {
  const checks: Record<string, string> = {
    'shadow-sm': String.raw`\bshadow-sm\b`,
    'blur-sm': String.raw`\bblur-sm\b`,
    'rounded-sm': String.raw`\brounded-sm\b`,
    'outline-none': String.raw`\boutline-none\b`,
    'backdrop-blur-sm': String.raw`\bbackdrop-blur-sm\b`,
    'start-N': String.raw`(?<!(col-|row-))start-\d`,
    '-end-': String.raw`-end-\d`,
  };
  const counts: Record<string, number> = {};
  const files = listSrcFiles(join(root, 'src'));
  for (const key of Object.keys(checks)) counts[key] = 0;
  for (const file of files) {
    const txt = readFileSync(file, 'utf8');
    for (const [key, pat] of Object.entries(checks)) {
      counts[key] += (txt.match(new RegExp(pat, 'g')) || []).length;
    }
  }
  counts.total = Object.entries(counts)
    .filter(([k]) => k !== 'total')
    .reduce((s, [, v]) => s + v, 0);
  return counts;
}

function runEslintDefaultNext(): { errors: number; warnings: number; total: number } {
  try {
    const out = execSync(
      `node --input-type=module -e "import nextCore from 'eslint-config-next/core-web-vitals'; import nextTs from 'eslint-config-next/typescript'; import { ESLint } from 'eslint'; const eslint = new ESLint({ baseConfig: [...nextCore, ...nextTs], overrideConfigFile: true }); const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']); let e=0,w=0; for (const r of results) for (const m of r.messages) { if (m.severity===2) e++; else w++; } console.log(JSON.stringify({ errors: e, warnings: w, total: e+w }));"`,
      { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 },
    );
    return JSON.parse(out.trim()) as { errors: number; warnings: number; total: number };
  } catch {
    return { errors: -1, warnings: -1, total: -1 };
  }
}

const report = {
  timestamp: new Date().toISOString(),
  runId: 'post-fix-v6-disable-ide-eslint-probe',
  hypothesisId: 'H-disable-eslint-probe-in-ide',
  tailwindLegacyPatterns: countTailwindLegacyPatterns(),
  eslintConfigs: {
    root: eslintConfigExists('eslint.config.mjs'),
    nellavioActive: eslintConfigExists('nellavio/eslint.config.mjs'),
    nellavioLegacy: eslintConfigExists('nellavio/eslint.config.legacy.mjs'),
  },
  ideEslintMitigation: {
    probeDisabled: true,
    validateDisabled: true,
    rulesCustomizationWildcardOff: true,
    cliLintCommand: 'npm run lint',
  },
  src: {
    eslint: runEslintSrc(),
    eslintDefaultNext: runEslintDefaultNext(),
    tsc: countTsErrors(root, 'tsconfig.json'),
  },
  nellavio: {
    ideTsconfig: countTsErrors(join(root, 'nellavio')),
    legacyTsconfig: countTsErrors(join(root, 'nellavio'), 'tsconfig.legacy.json'),
  },
  chatService: {
    ideTsconfig: countTsErrors(join(root, 'mini-services/chat-service')),
    legacyTsconfig: countTsErrors(join(root, 'mini-services/chat-service'), 'tsconfig.legacy.json'),
  },
  backend: {
    ideTsconfig: countTsErrors(join(root, 'mini-services/backend')),
    legacyTsconfig: countTsErrors(join(root, 'mini-services/backend'), 'tsconfig.legacy.json'),
  },
};

const logDir = join(root, '.cursor');
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
appendFileSync(
  logPath,
  `${JSON.stringify({ sessionId: '39cb59', location: 'count-ide-diagnostics.ts', message: 'IDE diagnostic counts', data: report, timestamp: Date.now() })}\n`
);

console.log(JSON.stringify(report, null, 2));
process.exit(report.src.tsc === 0 && report.src.eslint.errors === 0 ? 0 : 1);
