-- Migration: Add originalCost to proxy_logs for Before vs After comparison
-- This field stores what the request WOULD have cost without any optimizations

ALTER TABLE "proxy_logs" ADD COLUMN IF NOT EXISTS "originalCost" NUMERIC DEFAULT 0;

-- Update existing rows: originalCost = cost + savedAmount
UPDATE "proxy_logs" SET "originalCost" = "cost" + "savedAmount" WHERE "originalCost" = 0;

-- Index for aggregation queries
CREATE INDEX IF NOT EXISTS "idx_proxy_logs_org_originalcost" ON "proxy_logs" ("orgId", "originalCost");
