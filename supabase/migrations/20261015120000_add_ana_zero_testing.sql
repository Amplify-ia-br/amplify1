CREATE TABLE public.ana_test_sessions (
  id UUID PRIMARY KEY,
  tester_name TEXT NOT NULL DEFAULT ''
    CHECK (char_length(tester_name) <= 80),
  mission TEXT NOT NULL DEFAULT 'livre'
    CHECK (char_length(mission) <= 40),
  model TEXT NOT NULL
    CHECK (char_length(model) <= 120),
  turn_count INTEGER NOT NULL DEFAULT 0
    CHECK (turn_count >= 0),
  overall_rating SMALLINT
    CHECK (overall_rating BETWEEN 1 AND 5),
  helped BOOLEAN,
  closing_comment TEXT
    CHECK (closing_comment IS NULL OR char_length(closing_comment) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ana_test_turns (
  session_id UUID NOT NULL REFERENCES public.ana_test_sessions (id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL
    CHECK (turn_index >= 1),
  user_text TEXT NOT NULL
    CHECK (char_length(user_text) <= 4000),
  assistant_text TEXT NOT NULL
    CHECK (char_length(assistant_text) <= 8000),
  resolved_model TEXT,
  tool_calls TEXT[] NOT NULL DEFAULT '{}',
  memory JSONB NOT NULL DEFAULT '[]'::jsonb,
  issues TEXT[] NOT NULL DEFAULT '{}',
  regenerated BOOLEAN NOT NULL DEFAULT false,
  errors TEXT[] NOT NULL DEFAULT '{}',
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(10, 5),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, turn_index)
);

CREATE TABLE public.ana_test_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ana_test_sessions (id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL
    CHECK (turn_index >= 1),
  verdict SMALLINT NOT NULL
    CHECK (verdict IN (-1, 1)),
  reasons TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT
    CHECK (comment IS NULL OR char_length(comment) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, turn_index),
  FOREIGN KEY (session_id, turn_index)
    REFERENCES public.ana_test_turns (session_id, turn_index) ON DELETE CASCADE
);

CREATE INDEX ana_test_sessions_created_at_idx ON public.ana_test_sessions (created_at DESC);
CREATE INDEX ana_test_feedback_verdict_idx ON public.ana_test_feedback (verdict, created_at DESC);

ALTER TABLE public.ana_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ana_test_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ana_test_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ana_test_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ana_test_turns FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ana_test_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_test_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_test_turns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_test_feedback TO service_role;
