-- Proxy logs analytics aggregation functions
-- These replace 10K-row JS-side aggregation with efficient DB-level GROUP BY

-- Timeseries: daily cost/savings aggregation
CREATE OR REPLACE FUNCTION proxy_logs_timeseries(
  p_org_id UUID,
  p_start_date TIMESTAMPTZ
)
RETURNS TABLE (
  date TEXT,
  total_cost DOUBLE PRECISION,
  total_saved DOUBLE PRECISION,
  request_count BIGINT,
  cache_hits BIGINT,
  model_routings BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS date,
    COALESCE(SUM("cost"::double precision), 0) AS total_cost,
    COALESCE(SUM("savedAmount"::double precision), 0) AS total_saved,
    COUNT(*) AS request_count,
    COUNT(*) FILTER (WHERE "cacheHit" = true) AS cache_hits,
    COUNT(*) FILTER (WHERE "originalModel" IS NOT NULL) AS model_routings
  FROM proxy_logs
  WHERE "orgId" = p_org_id
    AND "createdAt" >= p_start_date
  GROUP BY "createdAt"::date
  ORDER BY date
$$;

-- Breakdown: aggregation by model, provider, or proxy key
CREATE OR REPLACE FUNCTION proxy_logs_breakdown(
  p_org_id UUID,
  p_start_date TIMESTAMPTZ,
  p_group_by TEXT DEFAULT 'model'
)
RETURNS TABLE (
  name TEXT,
  total_cost DOUBLE PRECISION,
  total_saved DOUBLE PRECISION,
  request_count BIGINT,
  avg_latency_ms DOUBLE PRECISION,
  cache_hit_rate DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  col_name TEXT;
BEGIN
  -- Map group_by parameter to column name (safe against injection)
  col_name := CASE p_group_by
    WHEN 'provider' THEN 'providerType'
    WHEN 'key' THEN 'proxyKeyId'
    ELSE 'model'
  END;

  RETURN QUERY EXECUTE format(
    'SELECT
      %I::text AS name,
      COALESCE(SUM("cost"::double precision), 0) AS total_cost,
      COALESCE(SUM("savedAmount"::double precision), 0) AS total_saved,
      COUNT(*) AS request_count,
      COALESCE(AVG("latencyMs"::double precision), 0) AS avg_latency_ms,
      CASE WHEN COUNT(*) > 0
        THEN ROUND((COUNT(*) FILTER (WHERE "cacheHit" = true))::numeric / COUNT(*)::numeric * 100, 2)::double precision
        ELSE 0
      END AS cache_hit_rate
    FROM proxy_logs
    WHERE "orgId" = $1
      AND "createdAt" >= $2
    GROUP BY %I
    ORDER BY total_cost DESC',
    col_name, col_name
  ) USING p_org_id, p_start_date;
END;
$$;
