CREATE TABLE IF NOT EXISTS ana_enrichment_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrichment_id text NOT NULL UNIQUE,
  session_key text NOT NULL REFERENCES ana_qualification_sessions(session_key) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempt_count integer NOT NULL DEFAULT 0,
  ghl_contact_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS ana_enrichment_outbox_status_idx
  ON ana_enrichment_outbox (status, updated_at ASC);
