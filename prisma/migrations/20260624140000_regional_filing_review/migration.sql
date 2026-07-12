-- Add review queue fields to regional filings
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "reviewIssuesJson" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "scrapedAt" TIMESTAMP(3);
