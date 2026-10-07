ALTER TABLE public.amplify_day_invitations
  ALTER COLUMN inviter_id DROP NOT NULL,
  ADD COLUMN registration_origin TEXT NOT NULL DEFAULT 'nominal_invite'
    CHECK (registration_origin IN ('nominal_invite', 'open_application'));

ALTER TABLE public.amplify_day_leads
  ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review', 'approved', 'not_selected')),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN invitation_id UUID UNIQUE REFERENCES public.amplify_day_invitations(id) ON DELETE SET NULL;

CREATE INDEX amplify_day_leads_review_queue_idx
  ON public.amplify_day_leads (review_status, completed_at DESC)
  WHERE stage = 'complete';

CREATE INDEX amplify_day_invitations_origin_idx
  ON public.amplify_day_invitations (registration_origin, created_at DESC);
