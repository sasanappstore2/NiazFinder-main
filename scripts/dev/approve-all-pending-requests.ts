/**
 * Local QA: publish all pending service requests (APPROVED + OPEN).
 *
 *   npx tsx scripts/dev/approve-all-pending-requests.ts
 */
import { db } from '@/lib/db';

async function main() {
  const pending = await db.serviceRequest.count({
    where: {
      OR: [{ moderationStatus: 'PENDING' }, { status: 'PENDING_REVIEW' }],
    },
  });

  if (pending === 0) {
    console.log('No pending requests to approve.');
    return;
  }

  const result = await db.serviceRequest.updateMany({
    where: {
      OR: [{ moderationStatus: 'PENDING' }, { status: 'PENDING_REVIEW' }],
    },
    data: {
      moderationStatus: 'APPROVED',
      status: 'OPEN',
      reviewedAt: new Date(),
    },
  });

  console.log(`Approved ${result.count} request(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
