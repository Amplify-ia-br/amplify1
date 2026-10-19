CREATE TABLE public.ana_rate_limits (
  identity_hash TEXT NOT NULL
    CHECK (identity_hash ~ '^[a-f0-9]{64}$'),
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1
    CHECK (request_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (identity_hash, window_start)
);

ALTER TABLE public.ana_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ana_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_ana_rate_limit(
  p_identity_hash TEXT,
  p_window_seconds INTEGER,
  p_max_requests INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_request_count INTEGER;
BEGIN
  IF p_identity_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid identity hash';
  END IF;
  IF p_window_seconds < 10 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid window';
  END IF;
  IF p_max_requests < 1 OR p_max_requests > 10000 THEN
    RAISE EXCEPTION 'invalid request limit';
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.ana_rate_limits AS limits (
    identity_hash,
    window_start,
    request_count,
    updated_at
  )
  VALUES (p_identity_hash, v_window_start, 1, now())
  ON CONFLICT (identity_hash, window_start)
  DO UPDATE SET
    request_count = limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO v_request_count;

  RETURN QUERY SELECT
    v_request_count <= p_max_requests,
    greatest(p_max_requests - v_request_count, 0),
    v_window_start + make_interval(secs => p_window_seconds);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ana_rate_limit(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ana_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;
