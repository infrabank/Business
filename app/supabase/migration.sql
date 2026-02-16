-- ============================================================================
-- LLM Cost Manager — Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1. Users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  "stripeCustomerId" TEXT,
  "subscriptionId" TEXT,
  "subscriptionStatus" TEXT,
  "currentPeriodEnd" TEXT,
  "cancelAtPeriodEnd" BOOLEAN DEFAULT false,
  "trialEnd" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 2. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  "ownerId" UUID REFERENCES users(id) ON DELETE CASCADE,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 3. Providers
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "lastSyncAt" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 4. API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "providerId" UUID REFERENCES providers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  "encryptedKey" TEXT NOT NULL,
  "keyPrefix" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 5. Usage Records
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES organizations(id) ON DELETE CASCADE,
  "apiKeyId" UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  "providerType" TEXT NOT NULL,
  model TEXT NOT NULL,
  "inputTokens" INTEGER DEFAULT 0,
  "outputTokens" INTEGER DEFAULT 0,
  "totalTokens" INTEGER DEFAULT 0,
  cost NUMERIC(12, 6) DEFAULT 0,
  "requestCount" INTEGER DEFAULT 0,
  date TEXT NOT NULL,
  "projectId" UUID,
  "syncHistoryId" UUID,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 6. Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES organizations(id) ON DELETE CASCADE,
  "projectId" UUID,
  name TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  "alertThresholds" JSONB DEFAULT '[50, 80, 100]',
  period TEXT DEFAULT 'monthly',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 7. Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  "isRead" BOOLEAN DEFAULT false,
  "sentAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 8. Optimization Tips
CREATE TABLE IF NOT EXISTS optimization_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  "potentialSaving" NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 9. Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 10. Sync Histories
CREATE TABLE IF NOT EXISTS sync_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES organizations(id) ON DELETE CASCADE,
  "providerId" UUID REFERENCES providers(id) ON DELETE SET NULL,
  "providerType" TEXT NOT NULL,
  "syncType" TEXT NOT NULL,
  status TEXT NOT NULL,
  "fromDate" TEXT,
  "toDate" TEXT,
  "recordsCreated" INTEGER DEFAULT 0,
  "recordsUpdated" INTEGER DEFAULT 0,
  "durationMs" INTEGER DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 11. Model Pricings
CREATE TABLE IF NOT EXISTS model_pricings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "providerType" TEXT NOT NULL,
  model TEXT NOT NULL,
  "inputPricePer1M" NUMERIC(10, 4) NOT NULL,
  "outputPricePer1M" NUMERIC(10, 4) NOT NULL,
  "effectiveFrom" TEXT NOT NULL,
  "effectiveTo" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 12. Payment History
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES organizations(id) ON DELETE CASCADE,
  "stripeInvoiceId" TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  description TEXT,
  "paidAt" TIMESTAMPTZ,
  "invoiceUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Helper: get org IDs owned by current user
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM organizations WHERE "ownerId" = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own record" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own record" ON users FOR INSERT WITH CHECK (id = auth.uid());

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their orgs" ON organizations FOR ALL USING ("ownerId" = auth.uid());

-- Providers
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners manage providers" ON providers FOR ALL USING ("orgId" IN (SELECT get_my_org_ids()));

-- API Keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners manage api_keys" ON api_keys FOR ALL
  USING ("providerId" IN (SELECT id FROM providers WHERE "orgId" IN (SELECT get_my_org_ids())));

-- Usage Records
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners manage usage_records" ON usage_records FOR ALL USING ("orgId" IN (SELECT get_my_org_ids()));

-- Budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners manage budgets" ON budgets FOR ALL USING ("orgId" IN (SELECT get_my_org_ids()));

-- Alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners manage alerts" ON alerts FOR ALL USING ("orgId" IN (SELECT get_my_org_ids()));

-- Optimization Tips
ALTER TABLE optimization_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners manage tips" ON optimization_tips FOR ALL USING ("orgId" IN (SELECT get_my_org_ids()));

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners manage projects" ON projects FOR ALL USING ("orgId" IN (SELECT get_my_org_ids()));

-- Sync Histories
ALTER TABLE sync_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners manage sync_histories" ON sync_histories FOR ALL USING ("orgId" IN (SELECT get_my_org_ids()));

-- Model Pricings (readable by all authenticated users, writable by service only)
ALTER TABLE model_pricings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read pricings" ON model_pricings FOR SELECT TO authenticated USING (true);

-- Payment History
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners manage payment_history" ON payment_history FOR ALL USING ("orgId" IN (SELECT get_my_org_ids()));

-- ============================================================================
-- Auto-create user record on signup (trigger)
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'free'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- Indexes for common queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations("ownerId");
CREATE INDEX IF NOT EXISTS idx_providers_org ON providers("orgId");
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys("providerId");
CREATE INDEX IF NOT EXISTS idx_usage_records_org_date ON usage_records("orgId", date);
CREATE INDEX IF NOT EXISTS idx_usage_records_apikey ON usage_records("apiKeyId");
CREATE INDEX IF NOT EXISTS idx_budgets_org ON budgets("orgId");
CREATE INDEX IF NOT EXISTS idx_alerts_org ON alerts("orgId");
CREATE INDEX IF NOT EXISTS idx_sync_histories_org ON sync_histories("orgId");
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users("stripeCustomerId");
CREATE INDEX IF NOT EXISTS idx_model_pricings_lookup ON model_pricings("providerType", model);
