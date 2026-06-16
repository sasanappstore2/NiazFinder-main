#!/usr/bin/env npx tsx
/**
 * Fail if 'use client' modules import server-only or Node fs.
 * Run: npx tsx scripts/ci/check-client-server-boundaries.ts
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'src');
const CLIENT_MARK = "'use client'";
const FORBIDDEN = [
  /from ['"]server-only['"]/,
  /from ['"]fs['"]/,
  /from ['"]node:fs['"]/,
  /from ['"]@\/lib\/need-intake\/llm-parse-client['"]/,
  /from ['"]@\/intake\/assessment\/need-assessment-engine['"]/,
  /from ['"]@\/intake\/assessment\/assess-before-publish['"]/,
  /from ['"]@\/intake\/rules\/registry['"]/,
  /from ['"]@\/intake\/rules\/registry\.server['"]/,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

const violations: string[] = [];

for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes(CLIENT_MARK)) continue;
  for (const re of FORBIDDEN) {
    if (re.test(src)) {
      violations.push(`${path.relative(process.cwd(), file)}: ${re.source}`);
    }
  }
}

if (violations.length) {
  console.error('Client/server boundary violations:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('OK: client/server boundaries clean');
