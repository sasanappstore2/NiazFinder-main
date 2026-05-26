-- Add moderation columns to ServiceRequest
ALTER TABLE "ServiceRequest" ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "ServiceRequest" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "ServiceRequest" ADD COLUMN "reviewedByUserId" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "moderationNotes" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "assignedToUserId" TEXT;

-- Backfill existing listings as already approved
UPDATE "ServiceRequest" SET "moderationStatus" = 'APPROVED' WHERE "moderationStatus" = 'PENDING';

-- Indexes
CREATE INDEX "ServiceRequest_moderationStatus_idx" ON "ServiceRequest"("moderationStatus");
CREATE INDEX "ServiceRequest_moderationStatus_createdAt_idx" ON "ServiceRequest"("moderationStatus", "createdAt");
CREATE INDEX "ServiceRequest_assignedToUserId_moderationStatus_idx" ON "ServiceRequest"("assignedToUserId", "moderationStatus");
CREATE INDEX "ServiceRequest_reviewedByUserId_idx" ON "ServiceRequest"("reviewedByUserId");
