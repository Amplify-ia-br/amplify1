CREATE TABLE public.amplify_day_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  organization TEXT CHECK (organization IS NULL OR char_length(organization) <= 200),
  role TEXT CHECK (role IS NULL OR char_length(role) <= 200),
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'amplify-day',
  stage TEXT NOT NULL DEFAULT 'identity'
    CHECK (stage IN ('identity', 'qualification_partial', 'complete')),
  last_event_name TEXT,
  first_captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  kit_sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (kit_sync_status IN ('pending', 'synced', 'failed')),
  kit_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX amplify_day_leads_stage_updated_idx
  ON public.amplify_day_leads (stage, updated_at DESC);

CREATE TRIGGER update_amplify_day_leads_updated_at
  BEFORE UPDATE ON public.amplify_day_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.amplify_day_leads ENABLE ROW LEVEL SECURITY;

-- Public forms write through the server-side endpoint only. There is no direct
-- browser access to this table, which keeps personal data out of the Data API.
CREATE POLICY "No direct access to Amplify Day leads"
  ON public.amplify_day_leads FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.amplify_day_leads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.amplify_day_leads TO service_role;
