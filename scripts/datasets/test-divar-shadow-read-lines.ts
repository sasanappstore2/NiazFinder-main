import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLines } from './run-divar-laya-shadow';

async function main(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), 'niaz-divar-shadow-read-lines-'));
  try {
    const path = join(directory, 'source.jsonl');
    writeFileSync(path, 'first\nsecond\nthird\n');

    const visited: Array<{ line: string; index: number }> = [];
    await readLines(path, async (line, index) => {
      visited.push({ line, index });
      return visited.length < 2;
    });

    assert.deepEqual(visited, [
      { line: 'first', index: 1 },
      { line: 'second', index: 2 },
    ]);
    console.log('divar-shadow-read-lines: 1 check passed');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

void main();
