import { extractSmartFields } from '../smart-field-extractor';
import { ALL_SMART_INTAKE_SCENARIOS } from './scenarios';

async function runOnce(label: string) {
  const before = process.memoryUsage().heapUsed;
  const times: number[] = [];
  for (const s of ALL_SMART_INTAKE_SCENARIOS) {
    const t0 = Date.now();
    await extractSmartFields(s.needText, '', {
      preferredCity: s.preferredCity || 'مشهد',
      preferredCitySlug: s.preferredCitySlug || 'mashhad',
      useAI: false,
      useRules: true,
    });
    times.push(Date.now() - t0);
  }
  const after = process.memoryUsage().heapUsed;
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95)]!;
  console.log(
    label,
    JSON.stringify({
      avg: Math.round(avg * 10) / 10,
      p95,
      heapDeltaMB: Math.round(((after - before) / 1024 / 1024) * 10) / 10,
    })
  );
}

async function main() {
  await runOnce('run1');
  await runOnce('run2');
  await runOnce('run3');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
