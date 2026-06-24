CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  phone text,
  company text,
  first_source text,
  last_source text,
  total_score integer NOT NULL DEFAULT 0,
  fit_score integer NOT NULL DEFAULT 0,
  intent_score integer NOT NULL DEFAULT 0,
  maturity_score integer NOT NULL DEFAULT 0,
  engagement_score integer NOT NULL DEFAULT 0,
  lead_stage text NOT NULL DEFAULT 'lead_frio',
  score_reason text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  email text NOT NULL,
  source text NOT NULL,
  event_name text NOT NULL,
  form_status text,
  completed_step text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  email text NOT NULL,
  source text NOT NULL,
  total_score integer NOT NULL DEFAULT 0,
  fit_score integer NOT NULL DEFAULT 0,
  intent_score integer NOT NULL DEFAULT 0,
  maturity_score integer NOT NULL DEFAULT 0,
  engagement_score integer NOT NULL DEFAULT 0,
  lead_stage text NOT NULL,
  score_reason text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_events_email_idx ON lead_events (email);
CREATE INDEX IF NOT EXISTS lead_events_source_idx ON lead_events (source);
CREATE INDEX IF NOT EXISTS lead_scores_email_idx ON lead_scores (email);
CREATE INDEX IF NOT EXISTS leads_total_score_idx ON leads (total_score DESC);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads (lead_stage);
