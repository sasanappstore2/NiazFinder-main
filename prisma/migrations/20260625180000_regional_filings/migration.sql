-- Regional property filings for workspace feeds (super-admin managed)
CREATE TABLE "regional_filings" (
    "id" TEXT NOT NULL,
    "fileCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dealType" TEXT,
    "categorySlug" TEXT,
    "propertyKind" TEXT,
    "city" TEXT NOT NULL,
    "cityId" TEXT,
    "district" TEXT,
    "neighborhood" TEXT,
    "neighborhoodId" TEXT,
    "location" TEXT,
    "price" TEXT,
    "deposit" TEXT,
    "monthlyRent" TEXT,
    "area" TEXT,
    "rooms" INTEGER,
    "floor" INTEGER,
    "pricePerMeter" TEXT,
    "image" TEXT,
    "imagesJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regional_filings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "regional_filings_status_createdAt_idx" ON "regional_filings"("status", "createdAt" DESC);
CREATE INDEX "regional_filings_city_idx" ON "regional_filings"("city");
CREATE INDEX "regional_filings_cityId_idx" ON "regional_filings"("cityId");
CREATE INDEX "regional_filings_neighborhoodId_idx" ON "regional_filings"("neighborhoodId");
