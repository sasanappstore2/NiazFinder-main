-- Smart Matching VIP schema (applied via prisma db push)

ALTER TABLE "NeedLeadOutreach" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
UPDATE "NeedLeadOutreach" SET "idempotencyKey" = 'legacy:' || "id" WHERE "idempotencyKey" IS NULL;
