ALTER TABLE public.amplify_day_invitations
  ADD COLUMN IF NOT EXISTS target_stage text NOT NULL DEFAULT 'amplify'
  CHECK (target_stage IN ('amplify', 'teia'));

ALTER TABLE public.amplify_day_campaigns
  ADD COLUMN IF NOT EXISTS target_stage text NOT NULL DEFAULT 'amplify'
  CHECK (target_stage IN ('amplify', 'teia'));

ALTER TABLE public.amplify_day_campaign_recipients
  ADD COLUMN IF NOT EXISTS target_stage text NOT NULL DEFAULT 'amplify'
  CHECK (target_stage IN ('amplify', 'teia'));

ALTER TABLE public.amplify_day_leads
  ADD COLUMN IF NOT EXISTS target_stage text NOT NULL DEFAULT 'amplify'
  CHECK (target_stage IN ('amplify', 'teia'));

CREATE INDEX IF NOT EXISTS amplify_day_invitations_target_stage_idx
  ON public.amplify_day_invitations (target_stage, status);

CREATE INDEX IF NOT EXISTS amplify_day_leads_target_stage_idx
  ON public.amplify_day_leads (target_stage, stage);
