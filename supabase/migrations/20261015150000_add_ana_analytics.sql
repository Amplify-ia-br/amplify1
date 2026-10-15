-- Central de análises da Ana: só mudanças aditivas.

ALTER TABLE public.ana_test_turns
  ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS handoff JSONB,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS app_commit TEXT;

CREATE INDEX IF NOT EXISTS ana_test_turns_prompt_version_idx
  ON public.ana_test_turns (prompt_version, created_at DESC);

-- Cada avaliação junto da conversa que a originou.
CREATE OR REPLACE VIEW public.ana_feedback_review
WITH (security_invoker = true) AS
SELECT
  f.id AS feedback_id,
  f.created_at AS feedback_at,
  s.id AS session_id,
  s.tester_name,
  s.mission,
  s.model,
  s.overall_rating,
  s.helped,
  s.closing_comment,
  f.turn_index,
  f.verdict,
  f.reasons,
  f.comment AS turn_comment,
  (
    SELECT jsonb_agg(
      jsonb_build_object('turno', p.turn_index, 'usuario', p.user_text, 'ana', p.assistant_text)
      ORDER BY p.turn_index
    )
    FROM public.ana_test_turns p
    WHERE p.session_id = f.session_id AND p.turn_index < f.turn_index
  ) AS contexto_anterior,
  t.user_text,
  t.assistant_text,
  t.tool_calls,
  t.sources,
  t.handoff,
  t.issues,
  t.regenerated,
  t.errors,
  t.memory,
  t.resolved_model,
  t.estimated_cost_usd,
  t.latency_ms,
  t.prompt_version,
  t.app_commit
FROM public.ana_test_feedback f
JOIN public.ana_test_sessions s ON s.id = f.session_id
LEFT JOIN public.ana_test_turns t
  ON t.session_id = f.session_id AND t.turn_index = f.turn_index;

CREATE TABLE IF NOT EXISTS public.ana_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('sessions', 'recommendations')),
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  window_from TIMESTAMPTZ,
  window_to TIMESTAMPTZ,
  sessions_analyzed INTEGER NOT NULL DEFAULT 0,
  turns_analyzed INTEGER NOT NULL DEFAULT 0,
  recommendations_created INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 5) NOT NULL DEFAULT 0,
  error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ana_session_analyses (
  session_id UUID PRIMARY KEY REFERENCES public.ana_test_sessions (id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.ana_analysis_runs (id) ON DELETE SET NULL,
  goal_reached BOOLEAN,
  stage_reached TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  intent TEXT,
  objections TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT,
  model TEXT NOT NULL,
  turn_count_at_analysis INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ana_turn_analyses (
  session_id UUID NOT NULL,
  turn_index INTEGER NOT NULL,
  run_id UUID REFERENCES public.ana_analysis_runs (id) ON DELETE SET NULL,
  naturalness SMALLINT CHECK (naturalness BETWEEN 1 AND 5),
  relevance SMALLINT CHECK (relevance BETWEEN 1 AND 5),
  factuality SMALLINT CHECK (factuality BETWEEN 1 AND 5),
  commercial_progress SMALLINT CHECK (commercial_progress BETWEEN 1 AND 5),
  conciseness SMALLINT CHECK (conciseness BETWEEN 1 AND 5),
  tags TEXT[] NOT NULL DEFAULT '{}',
  failure_category TEXT,
  summary TEXT,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, turn_index),
  FOREIGN KEY (session_id, turn_index)
    REFERENCES public.ana_test_turns (session_id, turn_index) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.ana_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ana_analysis_runs (id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  rationale TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_change TEXT NOT NULL,
  regression_scenario TEXT,
  status TEXT NOT NULL DEFAULT 'nova'
    CHECK (status IN ('nova', 'aceita', 'rejeitada', 'implementada')),
  decision_note TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  implemented_commit TEXT,
  prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ana_recommendations_status_idx
  ON public.ana_recommendations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ana_turn_analyses_failure_idx
  ON public.ana_turn_analyses (failure_category);

ALTER TABLE public.ana_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ana_session_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ana_turn_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ana_recommendations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ana_analysis_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ana_session_analyses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ana_turn_analyses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ana_recommendations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ana_feedback_review FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_analysis_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_session_analyses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_turn_analyses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_recommendations TO service_role;
GRANT SELECT ON TABLE public.ana_feedback_review TO service_role;

NOTIFY pgrst, 'reload schema';
