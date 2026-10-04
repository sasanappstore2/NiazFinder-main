-- Filing scraper bots + provenance on regional filings
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "scraperId" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "sourceSite" TEXT;

CREATE TABLE IF NOT EXISTS "regional_filing_scrapers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "loginUrl" TEXT NOT NULL,
    "listingsUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "siteConfigJson" TEXT NOT NULL DEFAULT '{}',
    "defaultCity" TEXT NOT NULL,
    "defaultCityId" TEXT,
    "defaultNeighborhood" TEXT,
    "defaultNeighborhoodId" TEXT,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 10,
    "jitterMinutes" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastImportedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regional_filing_scrapers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "regional_filing_scrapers_siteKey_key" ON "regional_filing_scrapers"("siteKey");
CREATE INDEX IF NOT EXISTS "regional_filing_scrapers_enabled_lastRunAt_idx" ON "regional_filing_scrapers"("enabled", "lastRunAt");
CREATE INDEX IF NOT EXISTS "regional_filings_scraperId_idx" ON "regional_filings"("scraperId");

CREATE UNIQUE INDEX IF NOT EXISTS "regional_filings_scraperId_externalId_key" ON "regional_filings"("scraperId", "externalId");

DO $$ BEGIN
  ALTER TABLE "regional_filings" ADD CONSTRAINT "regional_filings_scraperId_fkey" FOREIGN KEY ("scraperId") REFERENCES "regional_filing_scrapers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
