-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'DISABLED', 'COMING_SOON');

-- AlterTable: add status column with default
ALTER TABLE "Category" ADD COLUMN "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE';

-- Backfill from legacy isActive
UPDATE "Category" SET "status" = 'DISABLED' WHERE "isActive" = false;
UPDATE "Category" SET "status" = 'ACTIVE' WHERE "isActive" = true;

-- Launch mode: only real-estate subtree stays ACTIVE at migration time
UPDATE "Category" SET "status" = 'DISABLED'
WHERE "slug" NOT IN (
  'real-estate',
  'residential-sale',
  'apartment-sale',
  'villa-sale',
  'land-sale',
  'residential-rent',
  'apartment-rent',
  'villa-rent',
  'land-rent',
  'commercial-sale',
  'office-sale',
  'shop-sale',
  'industrial-sale',
  'commercial-rent',
  'office-rent',
  'shop-rent',
  'industrial-rent',
  'short-term-rent',
  'suite-apartment-rent',
  'villa-short-rent',
  'workspace-short-rent',
  'real-estate-services',
  'agency-services',
  'construction-partnership',
  'pre-sale-services'
);

-- Drop legacy index and column
DROP INDEX IF EXISTS "Category_isActive_idx";
ALTER TABLE "Category" DROP COLUMN "isActive";

-- CreateIndex
CREATE INDEX "Category_status_idx" ON "Category"("status");
