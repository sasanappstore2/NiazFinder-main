import './load-env';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { chatPrisma: PrismaClient };

export const db =
  globalForPrisma.chatPrisma ||
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.chatPrisma = db;
