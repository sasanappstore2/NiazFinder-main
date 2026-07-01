-- Structured fields for regional collaboration posts

CREATE TYPE "CollaborationSubjectKind" AS ENUM ('CLIENT', 'PROPERTY', 'JOINT_VISIT');
CREATE TYPE "CollaborationPropertyKind" AS ENUM ('APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL', 'OTHER');
CREATE TYPE "CollaborationAreaBand" AS ENUM ('UNDER_80', 'BAND_80_120', 'BAND_120_180', 'OVER_180');
CREATE TYPE "CollaborationBudgetBand" AS ENUM (
  'SALE_UNDER_3B',
  'SALE_3_5B',
  'SALE_5_8B',
  'SALE_8_12B',
  'SALE_OVER_12B',
  'RENT_UNDER_10M',
  'RENT_10_20M',
  'RENT_20_40M',
  'RENT_OVER_40M'
);

ALTER TABLE "RegionalCollaborationPost"
  ADD COLUMN "subjectKind" "CollaborationSubjectKind",
  ADD COLUMN "dealType" TEXT,
  ADD COLUMN "propertyKind" "CollaborationPropertyKind",
  ADD COLUMN "areaBand" "CollaborationAreaBand",
  ADD COLUMN "budgetBand" "CollaborationBudgetBand",
  ADD COLUMN "targetAreasJson" TEXT NOT NULL DEFAULT '[]';
