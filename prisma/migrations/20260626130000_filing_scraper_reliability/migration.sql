-- Reliability fields for filing scraper fleet
ALTER TABLE "regional_filing_scrapers" ADD COLUMN IF NOT EXISTS "failureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "regional_filing_scrapers" ADD COLUMN IF NOT EXISTS "evalScore" DOUBLE PRECISION;
ALTER TABLE "regional_filing_scrapers" ADD COLUMN IF NOT EXISTS "lastEvalAt" TIMESTAMP(3);
