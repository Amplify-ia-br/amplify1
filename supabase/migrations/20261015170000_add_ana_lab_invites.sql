-- Convites e cadastro individual de testadores do Lab da Ana: só mudanças aditivas.

CREATE TABLE IF NOT EXISTS public.ana_lab_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6,32}$'),
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 160),
  cohort TEXT CHECK (cohort IS NULL OR char_length(cohort) <= 40),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 500),
  uses INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ana_lab_testers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES public.ana_lab_invites (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  email TEXT NOT NULL CHECK (char_length(email) <= 160),
  profile TEXT NOT NULL,
  organization TEXT CHECK (organization IS NULL OR char_length(organization) <= 120),
  cohort TEXT,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_version TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ana_lab_testers_invite_email_idx
  ON public.ana_lab_testers (invite_id, lower(email));

ALTER TABLE public.ana_test_sessions
  ADD COLUMN IF NOT EXISTS tester_id UUID REFERENCES public.ana_lab_testers (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cohort TEXT;

CREATE INDEX IF NOT EXISTS ana_test_sessions_tester_idx
  ON public.ana_test_sessions (tester_id, created_at DESC);

ALTER TABLE public.ana_lab_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ana_lab_testers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ana_lab_invites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ana_lab_testers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_lab_invites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_lab_testers TO service_role;

-- Cadastro atômico: trava o convite, confere validade e cota, e emite o acesso.
CREATE OR REPLACE FUNCTION public.ana_lab_signup(
  p_code TEXT,
  p_name TEXT,
  p_email TEXT,
  p_profile TEXT,
  p_organization TEXT,
  p_token_hash TEXT,
  p_consent_version TEXT
)
RETURNS TABLE (result_status TEXT, result_tester_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite public.ana_lab_invites%ROWTYPE;
  v_tester public.ana_lab_testers%ROWTYPE;
  v_new_id UUID;
BEGIN
  SELECT * INTO v_invite FROM public.ana_lab_invites WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT 'revoked'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF v_invite.expires_at <= now() THEN
    RETURN QUERY SELECT 'expired'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT * INTO v_tester
  FROM public.ana_lab_testers
  WHERE invite_id = v_invite.id AND lower(email) = lower(p_email);

  IF FOUND THEN
    IF v_tester.revoked_at IS NOT NULL THEN
      RETURN QUERY SELECT 'revoked'::TEXT, NULL::UUID;
      RETURN;
    END IF;
    UPDATE public.ana_lab_testers
    SET token_hash = p_token_hash,
        name = p_name,
        profile = p_profile,
        organization = p_organization
    WHERE id = v_tester.id;
    RETURN QUERY SELECT 'reentry'::TEXT, v_tester.id;
    RETURN;
  END IF;

  IF v_invite.uses >= v_invite.max_uses THEN
    RETURN QUERY SELECT 'used'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.ana_lab_testers
    (invite_id, name, email, profile, organization, cohort, consent_version, token_hash)
  VALUES
    (v_invite.id, p_name, p_email, p_profile, p_organization, v_invite.cohort, p_consent_version, p_token_hash)
  RETURNING id INTO v_new_id;

  UPDATE public.ana_lab_invites SET uses = uses + 1 WHERE id = v_invite.id;

  RETURN QUERY SELECT 'ok'::TEXT, v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ana_lab_signup(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ana_lab_signup(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
