import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const [users, requests] = await Promise.all([
      prisma.user.count(),
      prisma.serviceRequest.count(),
    ]);
    console.log(JSON.stringify({ ok: true, users, requests }, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
