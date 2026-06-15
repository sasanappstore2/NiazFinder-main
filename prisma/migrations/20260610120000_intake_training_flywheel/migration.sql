-- Phase 38: training flywheel quality + dedupe + moderation labels
ALTER TABLE "IntakeTrainingExample" ADD COLUMN "qualityScore" DOUBLE PRECISION;
ALTER TABLE "IntakeTrainingExample" ADD COLUMN "qualityFlags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "IntakeTrainingExample" ADD COLUMN "sourceTextHash" TEXT;
ALTER TABLE "IntakeTrainingExample" ADD COLUMN "moderationLabel" TEXT;

CREATE INDEX "IntakeTrainingExample_sourceTextHash_idx" ON "IntakeTrainingExample"("sourceTextHash");
CREATE INDEX "IntakeTrainingExample_moderationLabel_idx" ON "IntakeTrainingExample"("moderationLabel");
