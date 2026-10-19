-- Controle de custo do Lab da Ana: teto diário por convite e chave para pausar o Lab. Só mudanças aditivas.

ALTER TABLE public.ana_lab_invites
  ADD COLUMN IF NOT EXISTS daily_limit INTEGER NOT NULL DEFAULT 60 CHECK (daily_limit BETWEEN 1 AND 500);

CREATE TABLE IF NOT EXISTS public.ana_lab_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  paused BOOLEAN NOT NULL DEFAULT false,
  paused_at TIMESTAMPTZ,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ana_lab_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ana_lab_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ana_lab_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ana_lab_settings TO service_role;
