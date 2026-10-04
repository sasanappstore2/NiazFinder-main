-- Regional filing enrichment metadata (MaskanYaban parity)
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "hasTerrace" BOOLEAN;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "hasBuiltInWardrobe" BOOLEAN;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "detailUrl" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "dataCompleteness" INTEGER;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "enrichedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "regional_filings_dataCompleteness_idx" ON "regional_filings"("dataCompleteness");
CREATE INDEX IF NOT EXISTS "regional_filings_enrichedAt_idx" ON "regional_filings"("enrichedAt");
