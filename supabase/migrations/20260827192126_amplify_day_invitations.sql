CREATE TABLE public.amplify_day_inviters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  email TEXT NOT NULL CHECK (email = lower(email)),
  role TEXT NOT NULL CHECK (char_length(role) BETWEEN 2 AND 160),
  company TEXT NOT NULL CHECK (char_length(company) BETWEEN 2 AND 160),
  signature TEXT NOT NULL CHECK (char_length(signature) BETWEEN 2 AND 1200),
  base_message TEXT NOT NULL CHECK (char_length(base_message) BETWEEN 2 AND 2400),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.amplify_day_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL DEFAULT 'amplify-day-2026',
  inviter_id UUID NOT NULL REFERENCES public.amplify_day_inviters(id) ON DELETE RESTRICT,
  guest_name TEXT NOT NULL CHECK (char_length(guest_name) BETWEEN 2 AND 160),
  guest_email TEXT NOT NULL CHECK (guest_email = lower(guest_email)),
  guest_company TEXT NOT NULL CHECK (char_length(guest_company) BETWEEN 2 AND 160),
  guest_role TEXT NOT NULL CHECK (char_length(guest_role) BETWEEN 2 AND 160),
  personal_message TEXT CHECK (personal_message IS NULL OR char_length(personal_message) <= 1200),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^AMP-[A-HJ-NP-Z2-9]{6}$'),
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'copied', 'visited', 'confirmed', 'revoked')),
  copied_at TIMESTAMPTZ,
  first_visited_at TIMESTAMPTZ,
  last_visited_at TIMESTAMPTZ,
  visit_count INTEGER NOT NULL DEFAULT 0 CHECK (visit_count >= 0),
  confirmed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT '2026-09-24 03:00:00+00',
  confirmation_email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (confirmation_email_status IN ('pending', 'sent', 'failed', 'not_applicable')),
  confirmation_email_id TEXT,
  confirmation_email_error TEXT,
  kit_sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (kit_sync_status IN ('pending', 'synced', 'failed', 'not_applicable')),
  kit_sync_error TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX amplify_day_invitations_active_email_unique
  ON public.amplify_day_invitations (event_key, lower(guest_email))
  WHERE status <> 'revoked';

CREATE INDEX amplify_day_invitations_inviter_status_idx
  ON public.amplify_day_invitations (inviter_id, status, created_at DESC);

CREATE INDEX amplify_day_invitations_expires_at_idx
  ON public.amplify_day_invitations (expires_at);

CREATE TRIGGER update_amplify_day_inviters_updated_at
  BEFORE UPDATE ON public.amplify_day_inviters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_amplify_day_invitations_updated_at
  BEFORE UPDATE ON public.amplify_day_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.amplify_day_inviters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amplify_day_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can view Amplify Day inviters"
  ON public.amplify_day_inviters FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'editor')
  );

CREATE POLICY "Editors can create Amplify Day inviters"
  ON public.amplify_day_inviters FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid()) AND (
      public.has_role((SELECT auth.uid()), 'admin') OR
      public.has_role((SELECT auth.uid()), 'editor')
    )
  );

CREATE POLICY "Editors can update Amplify Day inviters"
  ON public.amplify_day_inviters FOR UPDATE TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'editor')
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'editor')
  );

CREATE POLICY "Editors can view Amplify Day invitations"
  ON public.amplify_day_invitations FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'editor')
  );

CREATE POLICY "Editors can create Amplify Day invitations"
  ON public.amplify_day_invitations FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid()) AND (
      public.has_role((SELECT auth.uid()), 'admin') OR
      public.has_role((SELECT auth.uid()), 'editor')
    )
  );

CREATE POLICY "Editors can update Amplify Day invitations"
  ON public.amplify_day_invitations FOR UPDATE TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'editor')
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'editor')
  );

REVOKE ALL ON TABLE public.amplify_day_inviters FROM anon;
REVOKE ALL ON TABLE public.amplify_day_invitations FROM anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.amplify_day_inviters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.amplify_day_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.amplify_day_inviters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.amplify_day_invitations TO service_role;
