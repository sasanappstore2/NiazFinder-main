/**
 * Schema Intelligence Layer v1 self-test.
 * Run: npm run test:schema-intelligence
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeSchemaIntelligence } from '@/intake/intelligence/schemaIntelligenceEngine';
import {
  buildResidentialRentTelemetryFixture,
  RESIDENTIAL_RENT_CATEGORY_SLUG,
  RESIDENTIAL_RENT_TEMPLATE_ID,
} from '@/intake/fixtures/post-intake-telemetry-fixtures';
import {
  appendPostIntakeEvents,
  clearPostIntakeTelemetryStore,
} from '@/intake/telemetry/postIntakeTelemetryStore';
import { loadPostIntakeEventsForAnalysis } from '@/intake/telemetry/postIntakeTelemetryReplayReader';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function testReplayReader(): Promise<void> {
  const dir = await mkdtempSafe();
  const events = buildResidentialRentTelemetryFixture().slice(0, 5);
  const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
  await writeFile(join(dir, '2026-06-15.jsonl'), lines, 'utf8');

  clearPostIntakeTelemetryStore();
  appendPostIntakeEvents(events.slice(0, 2));

  const loaded = await loadPostIntakeEventsForAnalysis({
    templateId: RESIDENTIAL_RENT_TEMPLATE_ID,
    telemetryDir: dir,
    sinceDays: 7,
  });

  assert(loaded.length >= 5, `replay reader expected >=5 events, got ${loaded.length}`);
  await rm(dir, { recursive: true, force: true });
}

async function mkdtempSafe(): Promise<string> {
  const base = join(tmpdir(), `schema-intel-${Date.now()}`);
  await mkdir(base, { recursive: true });
  return base;
}

function testEngine(): void {
  const events = buildResidentialRentTelemetryFixture();
  const insights = analyzeSchemaIntelligence(events, {
    templateId: RESIDENTIAL_RENT_TEMPLATE_ID,
    categorySlug: RESIDENTIAL_RENT_CATEGORY_SLUG,
    sinceDays: 7,
  });

  assert(insights.templateId === RESIDENTIAL_RENT_TEMPLATE_ID, 'templateId');
  assert(insights.meta.sessionCount === 12, `sessionCount ${insights.meta.sessionCount}`);
  assert(insights.meta.eventCount > 0, 'eventCount');

  const cityStats = insights.fieldStats.city;
  assert(cityStats != null, 'city field stats');
  assert(cityStats.errorRate > 0, 'city errorRate');

  assert(
    insights.funnelStats.bottleneckStep === 'location',
    `bottleneck expected location, got ${insights.funnelStats.bottleneckStep}`
  );
  assert(
    (insights.funnelStats.dropOffRates.location ?? 0) > 0,
    'location drop-off rate'
  );

  const missingParking = insights.driftSignals.find(
    (s) => s.type === 'MISSING_FIELD' && s.fieldKey === 'parking'
  );
  assert(missingParking != null, 'MISSING_FIELD parking drift');

  const addParking = insights.suggestions.find(
    (s) => s.type === 'ADD_FIELD' && s.fieldKey === 'parking'
  );
  assert(addParking != null, 'ADD_FIELD parking suggestion');

  const flowOpt = insights.suggestions.find((s) => s.type === 'FLOW_OPTIMIZATION');
  assert(flowOpt != null, 'FLOW_OPTIMIZATION suggestion');
}

async function main(): Promise<void> {
  testEngine();
  await testReplayReader();
  console.log('schema-intelligence self-test: 10/10 passed');
}

void main();
