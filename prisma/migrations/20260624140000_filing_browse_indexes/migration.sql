-- Browse query indexes for regional filings (deal type + posted date within city scope)
CREATE INDEX "regional_filings_status_cityId_dealType_postedAt_idx" ON "regional_filings"("status", "cityId", "dealType", "postedAt" DESC);
CREATE INDEX "regional_filings_status_city_dealType_postedAt_idx" ON "regional_filings"("status", "city", "dealType", "postedAt" DESC);
