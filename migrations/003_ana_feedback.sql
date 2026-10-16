-- Feedback dos testadores do Ana Lab (polegar + comentário por resposta).
CREATE TABLE IF NOT EXISTS ana_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  message_id text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('up', 'down')),
  comment text,
  question text,
  answer text,
  model text,
  mode text,
  intent text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  generation_id text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, message_id)
);

CREATE INDEX IF NOT EXISTS ana_feedback_created_at_idx ON ana_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS ana_feedback_rating_idx ON ana_feedback (rating, created_at DESC);
