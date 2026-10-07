ALTER TABLE public.amplify_day_inviters
  ADD COLUMN additional_cc_emails TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD CONSTRAINT amplify_day_inviters_additional_cc_limit
    CHECK (cardinality(additional_cc_emails) <= 5);

ALTER TABLE public.amplify_day_invitations
  ADD COLUMN invite_email_status TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (invite_email_status IN (
      'not_sent', 'sending', 'sent', 'delivered', 'failed',
      'bounced', 'complained', 'suppressed'
    )),
  ADD COLUMN invite_email_id TEXT,
  ADD COLUMN invite_email_cc TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN invite_email_sent_at TIMESTAMPTZ,
  ADD COLUMN invite_email_delivered_at TIMESTAMPTZ,
  ADD COLUMN invite_email_error TEXT,
  ADD COLUMN invite_email_attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (invite_email_attempt_count >= 0),
  ADD COLUMN invite_email_last_attempt_at TIMESTAMPTZ;

CREATE UNIQUE INDEX amplify_day_invitations_invite_email_id_unique
  ON public.amplify_day_invitations (invite_email_id)
  WHERE invite_email_id IS NOT NULL;

CREATE INDEX amplify_day_invitations_invite_email_status_idx
  ON public.amplify_day_invitations (invite_email_status, created_at DESC);
