-- CreateEnum
CREATE TYPE "IntakeDomain" AS ENUM ('NEEDS', 'BUSINESS');

-- CreateTable: Level 1 category routing
CREATE TABLE "intake_category_routes" (
    "id" TEXT NOT NULL,
    "domain" "IntakeDomain" NOT NULL,
    "slug" TEXT NOT NULL,
    "parentSlug" TEXT,
    "title" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "description" TEXT NOT NULL,
    "semanticPath" TEXT,
    "technicalConstraints" JSONB NOT NULL DEFAULT '{}',
    "ruleCount" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(384),
    "embeddingModel" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_category_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Level 2 rule documents
CREATE TABLE "intake_rule_documents" (
    "id" TEXT NOT NULL,
    "domain" "IntakeDomain" NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "categoryRouteId" TEXT,
    "ruleKey" TEXT NOT NULL,
    "ruleKind" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "bundleType" TEXT NOT NULL DEFAULT 'match',
    "description" TEXT NOT NULL,
    "technicalConstraints" JSONB NOT NULL DEFAULT '{}',
    "searchText" TEXT,
    "embedding" vector(384),
    "embeddingModel" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_rule_documents_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "intake_category_routes_domain_slug_key" ON "intake_category_routes"("domain", "slug");
CREATE INDEX "intake_category_routes_domain_idx" ON "intake_category_routes"("domain");
CREATE INDEX "intake_category_routes_categoryId_idx" ON "intake_category_routes"("categoryId");
CREATE INDEX "intake_category_routes_parentSlug_idx" ON "intake_category_routes"("parentSlug");

CREATE UNIQUE INDEX "intake_rule_documents_domain_ruleKey_key" ON "intake_rule_documents"("domain", "ruleKey");
CREATE INDEX "intake_rule_documents_domain_categorySlug_idx" ON "intake_rule_documents"("domain", "categorySlug");
CREATE INDEX "intake_rule_documents_categoryRouteId_idx" ON "intake_rule_documents"("categoryRouteId");
CREATE INDEX "intake_rule_documents_bundleType_idx" ON "intake_rule_documents"("bundleType");

-- HNSW: Level 1 (small, always hot)
CREATE INDEX "intake_category_routes_embedding_hnsw_idx"
  ON "intake_category_routes" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- HNSW: Level 2 full index + domain-filtered partial indexes for routing
CREATE INDEX "intake_rule_documents_embedding_hnsw_idx"
  ON "intake_rule_documents" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX "intake_rule_documents_needs_embedding_hnsw_idx"
  ON "intake_rule_documents" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE "domain" = 'NEEDS';

CREATE INDEX "intake_rule_documents_business_embedding_hnsw_idx"
  ON "intake_rule_documents" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE "domain" = 'BUSINESS';

-- Foreign keys
ALTER TABLE "intake_category_routes" ADD CONSTRAINT "intake_category_routes_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "intake_rule_documents" ADD CONSTRAINT "intake_rule_documents_categoryRouteId_fkey"
  FOREIGN KEY ("categoryRouteId") REFERENCES "intake_category_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
