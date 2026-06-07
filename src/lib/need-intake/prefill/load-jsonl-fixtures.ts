import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { NEED_INTAKE_SYSTEM_PROMPT, type DatasetFixture, type DatasetLabels } from '@/lib/need-intake/dataset/schema';
import { cityToSlug } from '@/lib/need-intake/dataset/shared/normalize-city';

function rowToFixture(line: string, index: number): DatasetFixture | null {
  try {
    const row = JSON.parse(line) as {
      messages: Array<{ role: string; content: string }>;
    };
    const user = row.messages.find((m) => m.role === 'user')?.content?.trim() ?? '';
    const assistant = row.messages.find((m) => m.role === 'assistant')?.content ?? '';
    if (!user || !assistant) return null;

    const labels = JSON.parse(assistant) as DatasetLabels;
    if (labels.city) {
      labels.city = cityToSlug(labels.city) ?? labels.city;
    }

    const isCaptured = /(می\s*خو(?:ام|اهم)|دنبال|نیاز دارم|به دنبال|لازم دارم)/.test(user);
    return {
      id: `prefill-${index}`,
      input: user,
      labels,
      meta: {
        source: isCaptured ? 'captured' : 'fixture',
        vertical: 'real-estate',
        tags: isCaptured ? ['divar-api', 'prefill-100k'] : ['prefill-100k'],
      },
    };
  } catch {
    return null;
  }
}

/** Stream fixtures from JSONL without loading entire file into memory. */
export async function* iterateJsonlFixtures(
  filePath: string
): AsyncGenerator<DatasetFixture> {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let index = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const fixture = rowToFixture(line, index);
    index += 1;
    if (fixture) yield fixture;
  }
}

export async function loadJsonlFixtures(
  filePath: string,
  limit?: number
): Promise<DatasetFixture[]> {
  const out: DatasetFixture[] = [];
  for await (const f of iterateJsonlFixtures(filePath)) {
    out.push(f);
    if (limit != null && out.length >= limit) break;
  }
  return out;
}

export function fixtureFromTrainingRow(row: {
  messages: Array<{ role: string; content: string }>;
}): DatasetFixture | null {
  const system = row.messages.find((m) => m.role === 'system')?.content ?? '';
  if (system !== NEED_INTAKE_SYSTEM_PROMPT) return null;
  return rowToFixture(JSON.stringify(row), 0);
}
