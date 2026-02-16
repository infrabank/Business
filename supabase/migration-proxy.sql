-- Migration: LLM Proxy Gateway Feature
-- Description: Adds proxy_keys and proxy_logs tables for unified API gateway
-- Created: 2026-02-16
-- NOTE: Uses camelCase column names to match existing schema conventions

-- ============================================================================
-- TABLE: proxy_keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS proxy_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "keyHash" TEXT NOT NULL UNIQUE,
  "keyPrefix" TEXT NOT NULL,
  "providerType" TEXT NOT NULL CHECK ("providerType" IN ('openai', 'anthropic', 'google')),
  "encryptedApiKey" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "budgetLimit" NUMERIC,
  "rateLimit" INTEGER,
  "requestCount" BIGINT NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: proxy_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS proxy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "proxyKeyId" UUID NOT NULL REFERENCES proxy_keys(id) ON DELETE CASCADE,
  "providerType" TEXT NOT NULL CHECK ("providerType" IN ('openai', 'anthropic', 'google')),
  model TEXT NOT NULL,
  path TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  "latencyMs" INTEGER NOT NULL DEFAULT 0,
  "isStreaming" BOOLEAN NOT NULL DEFAULT false,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_proxy_keys_org ON proxy_keys("orgId");
CREATE INDEX IF NOT EXISTS idx_proxy_keys_hash ON proxy_keys("keyHash");
CREATE INDEX IF NOT EXISTS idx_proxy_keys_active ON proxy_keys("isActive") WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS idx_proxy_logs_org_created ON proxy_logs("orgId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_logs_key_created ON proxy_logs("proxyKeyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_logs_provider ON proxy_logs("providerType", "createdAt" DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_proxy_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proxy_keys_updated_at
  BEFORE UPDATE ON proxy_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_proxy_keys_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE proxy_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_logs ENABLE ROW LEVEL SECURITY;

-- proxy_keys: org owners can manage (reuses existing get_my_org_ids() function)
CREATE POLICY "Org owners manage proxy_keys"
  ON proxy_keys FOR ALL
  USING ("orgId" IN (SELECT get_my_org_ids()));

-- Service role bypass (for proxy API routes using service client)
CREATE POLICY "Service role has full access to proxy_keys"
  ON proxy_keys FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- proxy_logs: org owners can view
CREATE POLICY "Org owners view proxy_logs"
  ON proxy_logs FOR SELECT
  USING ("orgId" IN (SELECT get_my_org_ids()));

-- Service role full access (proxy API needs to INSERT logs)
CREATE POLICY "Service role has full access to proxy_logs"
  ON proxy_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE proxy_keys IS 'Encrypted API keys and config for the LLM proxy gateway';
COMMENT ON TABLE proxy_logs IS 'Audit log of all API requests through the proxy gateway';
COMMENT ON COLUMN proxy_keys."keyHash" IS 'SHA-256 hash of the proxy key for O(1) lookup';
COMMENT ON COLUMN proxy_keys."keyPrefix" IS 'First 8 chars for display (e.g., lmc_abc1...)';
COMMENT ON COLUMN proxy_keys."encryptedApiKey" IS 'AES-256-GCM encrypted real provider API key';
COMMENT ON COLUMN proxy_keys."budgetLimit" IS 'Optional monthly budget limit in USD';
COMMENT ON COLUMN proxy_keys."rateLimit" IS 'Optional requests per minute limit';
