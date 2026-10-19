-- Mantém separado quem é o testador do cenário que ele executou.
ALTER TABLE public.ana_test_sessions
  ADD COLUMN IF NOT EXISTS mission_origin TEXT
    CHECK (mission_origin IS NULL OR mission_origin IN ('recommended', 'manual')),
  ADD COLUMN IF NOT EXISTS mission_mapping_version TEXT
    CHECK (mission_mapping_version IS NULL OR char_length(mission_mapping_version) <= 40);

CREATE INDEX IF NOT EXISTS ana_test_sessions_mission_origin_idx
  ON public.ana_test_sessions (mission_origin, created_at DESC);

NOTIFY pgrst, 'reload schema';
