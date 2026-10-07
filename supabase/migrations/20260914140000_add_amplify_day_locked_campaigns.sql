CREATE TABLE public.amplify_day_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  inviter_id UUID NOT NULL REFERENCES public.amplify_day_inviters(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ready_locked'
    CHECK (status IN ('preparing', 'ready_locked', 'sending', 'sent', 'cancelled')),
  send_locked BOOLEAN NOT NULL DEFAULT true,
  nominal_count INTEGER NOT NULL DEFAULT 0 CHECK (nominal_count >= 0),
  institutional_count INTEGER NOT NULL DEFAULT 0 CHECK (institutional_count >= 0),
  blocked_count INTEGER NOT NULL DEFAULT 0 CHECK (blocked_count >= 0),
  missing_email_count INTEGER NOT NULL DEFAULT 0 CHECK (missing_email_count >= 0),
  prepared_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.amplify_day_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.amplify_day_campaigns(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('nominal', 'institutional', 'blocked', 'missing_email')),
  status TEXT NOT NULL CHECK (status IN ('ready', 'blocked', 'excluded', 'sending', 'sent', 'failed')),
  recipient_email TEXT,
  recipient_name TEXT,
  company TEXT,
  role TEXT,
  source_ids TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  source_metadata JSONB NOT NULL DEFAULT '[]'::JSONB,
  block_reason TEXT,
  invitation_id UUID UNIQUE REFERENCES public.amplify_day_invitations(id) ON DELETE SET NULL,
  subject TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (recipient_email IS NULL OR recipient_email = lower(recipient_email)),
  CHECK (recipient_type <> 'nominal' OR char_length(recipient_name) BETWEEN 2 AND 160)
);

CREATE UNIQUE INDEX amplify_day_campaign_recipient_email_unique
  ON public.amplify_day_campaign_recipients (campaign_id, recipient_email)
  WHERE recipient_email IS NOT NULL;

ALTER TABLE public.amplify_day_invitations
  ADD COLUMN campaign_id UUID REFERENCES public.amplify_day_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN send_locked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX amplify_day_campaign_recipients_status_idx
  ON public.amplify_day_campaign_recipients (campaign_id, recipient_type, status);

CREATE TRIGGER update_amplify_day_campaigns_updated_at
  BEFORE UPDATE ON public.amplify_day_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_amplify_day_campaign_recipients_updated_at
  BEFORE UPDATE ON public.amplify_day_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.amplify_day_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amplify_day_campaign_recipients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.amplify_day_campaigns, public.amplify_day_campaign_recipients FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.amplify_day_campaigns, public.amplify_day_campaign_recipients TO service_role;

