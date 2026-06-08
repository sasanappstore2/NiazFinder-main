-- PostgreSQL: enable fuzzy location matching when provinces/cities/neighborhoods live in SQL.
-- NiazFinder uses JSON catalogs in src/data/ by default; apply this if you migrate locations to Postgres.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_provinces_name_trgm ON provinces USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cities_name_trgm ON cities USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_name_trgm ON neighborhoods USING GIN (name gin_trgm_ops);

SET pg_trgm.similarity_threshold = 0.4;
