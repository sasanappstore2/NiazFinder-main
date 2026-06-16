/**
 * Fails CI when Persian UI strings were corrupted to "?" placeholders.
 * Run: npx tsx src/intake/fixtures/run-persian-encoding-guard-self-test.ts
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const TRIPLE_Q = /['"`][^'"`]*\?{3,}[^'"`]*['"`]/;
const PERSIAN_Q_SEP = /['"`][^'"`]* [\u0600-\u06FF]+ \? [\u0600-\u06FF]+[^'"`]*['"`]/;
const TEMPLATE_Q_SEP = /\$\{[^}]+\} \? \$\{/;

let failures = 0;

for (const file of walk(ROOT)) {
  const rel = file.replace(process.cwd() + '/', '');
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trimStart().startsWith('//')) continue;
    if (TRIPLE_Q.test(line) || PERSIAN_Q_SEP.test(line)) {
      console.error(`${rel}:${i + 1}: corrupted Persian placeholder ? ${line.trim().slice(0, 100)}`);
      failures++;
    } else if (TEMPLATE_Q_SEP.test(line) && !line.includes('??')) {
      console.error(`${rel}:${i + 1}: use " / " or " ? " instead of " ? " ? ${line.trim().slice(0, 100)}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\npersian-encoding-guard: ${failures} issue(s)`);
  process.exit(1);
}

console.log('persian-encoding-guard: OK');
