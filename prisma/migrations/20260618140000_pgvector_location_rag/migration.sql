-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('PROVINCE', 'CITY', 'NEIGHBORHOOD');

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" "LocationType" NOT NULL,
    "parentId" TEXT,
    "semanticPath" TEXT,
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "embedding" vector(384),
    "embeddingModel" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- ServiceRequest vector search columns
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "searchText" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "searchEmbedding" vector(384);
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "embeddedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");
CREATE INDEX "locations_slug_idx" ON "locations"("slug");
CREATE INDEX "locations_parentId_idx" ON "locations"("parentId");

CREATE UNIQUE INDEX "locations_province_slug_key" ON "locations"("slug", "type") WHERE "type" = 'PROVINCE';
CREATE UNIQUE INDEX "locations_city_parent_slug_key" ON "locations"("parentId", "slug", "type") WHERE "type" = 'CITY';
CREATE UNIQUE INDEX "locations_neighborhood_parent_slug_key" ON "locations"("parentId", "slug", "type") WHERE "type" = 'NEIGHBORHOOD';

-- HNSW indexes for fast cosine similarity
CREATE INDEX "locations_embedding_hnsw_idx"
  ON "locations" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX "ServiceRequest_search_embedding_hnsw_idx"
  ON "ServiceRequest" USING hnsw ("searchEmbedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
