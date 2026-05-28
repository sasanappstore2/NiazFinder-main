-- Business onboarding: hide new profiles until wizard complete
ALTER TABLE "BusinessProfile" ADD COLUMN "onboardingCompletedAt" DATETIME;

-- Backfill: profiles with name + category + phone are considered onboarded
UPDATE "BusinessProfile"
SET
  "onboardingCompletedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP),
  "status" = 'ACTIVE'
WHERE
  "onboardingCompletedAt" IS NULL
  AND trim("name") != ''
  AND trim("name") != 'کسب‌وکار'
  AND trim(COALESCE("phone", '')) != ''
  AND trim(COALESCE("categorySlugs", '[]')) != '[]'
  AND trim(COALESCE("categorySlugs", '[]')) != '';

-- Remaining without completion stay INACTIVE (default for new rows after schema change)
