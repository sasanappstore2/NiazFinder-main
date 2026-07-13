-- Public filing scrapers: credentials optional (DOM blueprint only)
ALTER TABLE "regional_filing_scrapers" ALTER COLUMN "username" SET DEFAULT '';
ALTER TABLE "regional_filing_scrapers" ALTER COLUMN "passwordEnc" DROP NOT NULL;
