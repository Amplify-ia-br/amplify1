ALTER TABLE public.ana_test_sessions
  ADD COLUMN IF NOT EXISTS trusted BOOLEAN,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.ana_test_sessions
SET completed_at = updated_at
WHERE completed_at IS NULL AND overall_rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS ana_test_sessions_completed_at_idx
  ON public.ana_test_sessions (completed_at DESC)
  WHERE completed_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
