-- Intake Intelligence Engine v1 location catalog

CREATE TABLE "intake_provinces" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_provinces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "intake_cities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "provinceId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_cities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "intake_neighborhoods" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "cityId" TEXT NOT NULL,
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "bbox" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_neighborhoods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "intake_location_aliases" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "aliasRaw" TEXT,
    "neighborhoodId" TEXT,
    "cityId" TEXT,
    "provinceId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'import',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_location_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "intake_provinces_slug_key" ON "intake_provinces"("slug");
CREATE INDEX "intake_provinces_slug_idx" ON "intake_provinces"("slug");

CREATE UNIQUE INDEX "intake_cities_slug_key" ON "intake_cities"("slug");
CREATE INDEX "intake_cities_provinceId_idx" ON "intake_cities"("provinceId");
CREATE INDEX "intake_cities_slug_idx" ON "intake_cities"("slug");

CREATE UNIQUE INDEX "intake_neighborhoods_cityId_slug_key" ON "intake_neighborhoods"("cityId", "slug");
CREATE INDEX "intake_neighborhoods_cityId_idx" ON "intake_neighborhoods"("cityId");
CREATE INDEX "intake_neighborhoods_slug_idx" ON "intake_neighborhoods"("slug");

CREATE INDEX "intake_location_aliases_alias_idx" ON "intake_location_aliases"("alias");

ALTER TABLE "intake_cities" ADD CONSTRAINT "intake_cities_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "intake_provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_neighborhoods" ADD CONSTRAINT "intake_neighborhoods_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "intake_cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_location_aliases" ADD CONSTRAINT "intake_location_aliases_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "intake_neighborhoods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_location_aliases" ADD CONSTRAINT "intake_location_aliases_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "intake_cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_location_aliases" ADD CONSTRAINT "intake_location_aliases_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "intake_provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
