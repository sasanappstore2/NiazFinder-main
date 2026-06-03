-- First-party analytics: sessions, events, daily rollups

CREATE TABLE "AnalyticsSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT DEFAULT 'IR',
    "province" TEXT,
    "city" TEXT,
    "ipHash" TEXT,
    "landingPath" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "pageViewCount" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "totalDurationMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "referrer" TEXT,
    "durationMs" INTEGER,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "dimensions" JSONB NOT NULL DEFAULT '{}',
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "province" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsDailyRollup" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dimensionKey" TEXT NOT NULL DEFAULT '_total',
    "dimensionValue" TEXT NOT NULL DEFAULT '_all',
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "events" INTEGER NOT NULL DEFAULT 0,
    "avgDurationMs" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "AnalyticsDailyRollup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsSession_sessionId_key" ON "AnalyticsSession"("sessionId");
CREATE INDEX "AnalyticsSession_visitorId_idx" ON "AnalyticsSession"("visitorId");
CREATE INDEX "AnalyticsSession_lastSeen_idx" ON "AnalyticsSession"("lastSeen");
CREATE INDEX "AnalyticsSession_userId_idx" ON "AnalyticsSession"("userId");
CREATE INDEX "AnalyticsSession_firstSeen_idx" ON "AnalyticsSession"("firstSeen");

CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");
CREATE INDEX "AnalyticsEvent_visitorId_idx" ON "AnalyticsEvent"("visitorId");
CREATE INDEX "AnalyticsEvent_path_idx" ON "AnalyticsEvent"("path");

CREATE UNIQUE INDEX "AnalyticsDailyRollup_date_dimensionKey_dimensionValue_key" ON "AnalyticsDailyRollup"("date", "dimensionKey", "dimensionValue");
CREATE INDEX "AnalyticsDailyRollup_date_idx" ON "AnalyticsDailyRollup"("date");
CREATE INDEX "AnalyticsDailyRollup_dimensionKey_dimensionValue_idx" ON "AnalyticsDailyRollup"("dimensionKey", "dimensionValue");

ALTER TABLE "AnalyticsSession" ADD CONSTRAINT "AnalyticsSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AnalyticsSession"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;
