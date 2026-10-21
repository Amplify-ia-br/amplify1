CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ana_qualification_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'web',
  mode text NOT NULL DEFAULT 'inbound',
  status text NOT NULL DEFAULT 'collecting',
  qualification_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  email text,
  phone text,
  ghl_contact_id text,
  ghl_opportunity_id text,
  last_handoff_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ana_qualification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ana_qualification_sessions(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ana_handoff_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id text NOT NULL UNIQUE,
  session_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempt_count integer NOT NULL DEFAULT 0,
  ghl_contact_id text,
  ghl_opportunity_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS ana_qualification_sessions_status_idx
  ON ana_qualification_sessions (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS ana_qualification_events_session_idx
  ON ana_qualification_events (session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ana_handoff_outbox_status_idx
  ON ana_handoff_outbox (status, updated_at ASC);

