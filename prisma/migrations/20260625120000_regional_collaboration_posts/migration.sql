-- Regional advisor collaboration board (workspace column)

CREATE TYPE "CollaborationPostScope" AS ENUM ('REGIONAL', 'CROSS_REGIONAL');
CREATE TYPE "CollaborationPostIntent" AS ENUM ('CLIENT_REFERRAL', 'SEEK_PARTNER', 'CO_SHOWING');

CREATE TABLE "RegionalCollaborationPost" (
    "id" TEXT NOT NULL,
    "authorProfileId" TEXT NOT NULL,
    "intent" "CollaborationPostIntent" NOT NULL,
    "headline" TEXT NOT NULL,
    "note" TEXT,
    "scope" "CollaborationPostScope" NOT NULL DEFAULT 'REGIONAL',
    "city" TEXT,
    "neighborhood" TEXT,
    "neighborhoodId" TEXT,
    "targetCity" TEXT,
    "targetNeighborhood" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "RegionalCollaborationPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegionalCollaborationPost_status_createdAt_idx" ON "RegionalCollaborationPost"("status", "createdAt" DESC);
CREATE INDEX "RegionalCollaborationPost_city_idx" ON "RegionalCollaborationPost"("city");
CREATE INDEX "RegionalCollaborationPost_targetCity_idx" ON "RegionalCollaborationPost"("targetCity");
CREATE INDEX "RegionalCollaborationPost_authorProfileId_idx" ON "RegionalCollaborationPost"("authorProfileId");

ALTER TABLE "RegionalCollaborationPost" ADD CONSTRAINT "RegionalCollaborationPost_authorProfileId_fkey" FOREIGN KEY ("authorProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
