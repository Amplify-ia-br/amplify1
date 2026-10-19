ALTER TABLE public.ana_leads
  ADD COLUMN IF NOT EXISTS qualification JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(qualification) = 'object'),
  ADD COLUMN IF NOT EXISTS contact_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS handoff_requested_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ana_leads_contact_consent_at_check'
      AND conrelid = 'public.ana_leads'::regclass
  ) THEN
    ALTER TABLE public.ana_leads
      ADD CONSTRAINT ana_leads_contact_consent_at_check
      CHECK (contact_consent OR contact_consent_at IS NULL);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS ana_leads_offer_stage_idx
  ON public.ana_leads (offer_interest, stage, updated_at DESC)
  WHERE offer_interest IS NOT NULL;
