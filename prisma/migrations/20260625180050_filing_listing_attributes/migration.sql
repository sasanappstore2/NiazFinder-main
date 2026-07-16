-- Extended regional filing attributes (deal × property kind extraction)
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "postedAt" TIMESTAMP(3);
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "totalFloors" INTEGER;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "unitsCount" INTEGER;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "buildingAge" INTEGER;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "documentType" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "cabinet" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "flooring" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "wallCover" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "facade" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "orientation" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "heating" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "cooling" TEXT;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "exchangeable" BOOLEAN;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "hasParking" BOOLEAN;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "hasStorage" BOOLEAN;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "hasElevator" BOOLEAN;
ALTER TABLE "regional_filings" ADD COLUMN IF NOT EXISTS "hasSecurityDoor" BOOLEAN;

CREATE INDEX IF NOT EXISTS "regional_filings_dealType_idx" ON "regional_filings"("dealType");
CREATE INDEX IF NOT EXISTS "regional_filings_propertyKind_idx" ON "regional_filings"("propertyKind");
CREATE INDEX IF NOT EXISTS "regional_filings_postedAt_idx" ON "regional_filings"("postedAt");
