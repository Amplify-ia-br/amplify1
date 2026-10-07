ALTER TABLE public.amplify_day_campaigns
  ADD COLUMN scheduled_for TIMESTAMPTZ,
  ADD COLUMN schedule_timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN authorized_at TIMESTAMPTZ,
  ADD COLUMN authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.amplify_day_campaigns
  DROP CONSTRAINT amplify_day_campaigns_status_check,
  ADD CONSTRAINT amplify_day_campaigns_status_check
    CHECK (status IN ('preparing', 'ready_locked', 'scheduled', 'sending', 'sent', 'cancelled'));

ALTER TABLE public.amplify_day_campaign_recipients
  ADD COLUMN provider_email_id TEXT,
  ADD COLUMN scheduled_for TIMESTAMPTZ,
  ADD COLUMN send_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (send_attempt_count >= 0),
  ADD COLUMN last_attempt_at TIMESTAMPTZ,
  ADD COLUMN sent_at TIMESTAMPTZ,
  ADD COLUMN delivered_at TIMESTAMPTZ,
  ADD COLUMN opened_at TIMESTAMPTZ,
  ADD COLUMN clicked_at TIMESTAMPTZ,
  ADD COLUMN bounced_at TIMESTAMPTZ,
  ADD COLUMN complained_at TIMESTAMPTZ,
  ADD COLUMN suppressed_at TIMESTAMPTZ,
  ADD COLUMN delivery_delayed_at TIMESTAMPTZ,
  ADD COLUMN delivery_error TEXT;

ALTER TABLE public.amplify_day_campaign_recipients
  DROP CONSTRAINT amplify_day_campaign_recipients_status_check,
  ADD CONSTRAINT amplify_day_campaign_recipients_status_check
    CHECK (status IN ('ready', 'blocked', 'excluded', 'sending', 'scheduled', 'sent', 'failed'));

ALTER TABLE public.amplify_day_invitations
  DROP CONSTRAINT amplify_day_invitations_invite_email_status_check,
  ADD CONSTRAINT amplify_day_invitations_invite_email_status_check
    CHECK (invite_email_status IN (
      'not_sent', 'sending', 'scheduled', 'sent', 'delivered', 'failed',
      'bounced', 'complained', 'suppressed'
    ));

CREATE UNIQUE INDEX amplify_day_campaign_recipient_provider_email_unique
  ON public.amplify_day_campaign_recipients (provider_email_id)
  WHERE provider_email_id IS NOT NULL;

CREATE TABLE public.amplify_day_campaign_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id TEXT NOT NULL UNIQUE,
  provider_email_id TEXT NOT NULL,
  campaign_recipient_id UUID REFERENCES public.amplify_day_campaign_recipients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX amplify_day_campaign_email_events_recipient_idx
  ON public.amplify_day_campaign_email_events (campaign_recipient_id, occurred_at DESC);

ALTER TABLE public.amplify_day_campaign_email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.amplify_day_campaign_email_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.amplify_day_campaign_email_events TO service_role;
