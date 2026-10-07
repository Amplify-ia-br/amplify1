CREATE INDEX amplify_day_campaigns_inviter_id_idx
  ON public.amplify_day_campaigns (inviter_id);

CREATE INDEX amplify_day_campaigns_created_by_idx
  ON public.amplify_day_campaigns (created_by);

CREATE INDEX amplify_day_campaigns_authorized_by_idx
  ON public.amplify_day_campaigns (authorized_by)
  WHERE authorized_by IS NOT NULL;

CREATE INDEX amplify_day_invitations_campaign_id_idx
  ON public.amplify_day_invitations (campaign_id)
  WHERE campaign_id IS NOT NULL;
