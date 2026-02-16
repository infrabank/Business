-- Migration: Add cost-saving features to proxy tables
-- Run after migration-proxy.sql

-- Add caching and routing options to proxy_keys
ALTER TABLE "proxy_keys"
  ADD COLUMN IF NOT EXISTS "enableCache" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "cacheTtl" integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "enableModelRouting" boolean DEFAULT false;

-- Add savings tracking to proxy_logs
ALTER TABLE "proxy_logs"
  ADD COLUMN IF NOT EXISTS "cacheHit" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "savedAmount" numeric(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "originalModel" text DEFAULT NULL;

-- Index for savings queries
CREATE INDEX IF NOT EXISTS "idx_proxy_logs_cacheHit" ON "proxy_logs" ("cacheHit") WHERE "cacheHit" = true;
CREATE INDEX IF NOT EXISTS "idx_proxy_logs_savedAmount" ON "proxy_logs" ("orgId", "savedAmount") WHERE "savedAmount" > 0;
