import assert from 'node:assert/strict';
import { invalidateFilingCaches } from '@/lib/filing/cache/invalidate';

async function main() {
  await invalidateFilingCaches();
  await invalidateFilingCaches({ cityId: 'mashhad', cityName: 'مشهد' });
  await invalidateFilingCaches({ filingId: 'test-id' });

  assert.equal(process.env.FILING_CACHE_REDIS === 'true', false);
  console.log('run-filing-cache-self-test: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
