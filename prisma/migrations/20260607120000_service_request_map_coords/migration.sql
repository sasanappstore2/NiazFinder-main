-- Map coordinates for need browse (intake pin picker)
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "ServiceRequest_map_browse_idx"
  ON "ServiceRequest" ("status", "moderationStatus", "lat", "lng");
