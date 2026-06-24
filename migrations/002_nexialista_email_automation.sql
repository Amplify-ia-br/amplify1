CREATE TABLE IF NOT EXISTS email_automation_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'nexialista',
  workflow_key text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_step integer NOT NULL DEFAULT 0,
  next_run_at timestamptz,
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_automation_active_unique_idx
  ON email_automation_enrollments (email, workflow_key)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS email_automation_due_idx
  ON email_automation_enrollments (status, next_run_at);

CREATE INDEX IF NOT EXISTS email_automation_email_idx
  ON email_automation_enrollments (email);

CREATE TABLE IF NOT EXISTS email_automation_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES email_automation_enrollments(id) ON DELETE CASCADE,
  email text NOT NULL,
  workflow_key text NOT NULL,
  step_key text NOT NULL,
  subject text NOT NULL,
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  status text NOT NULL,
  scheduled_at timestamptz,
  sent_at timestamptz,
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_automation_sends_unique_idx
  ON email_automation_sends (enrollment_id, step_key);

CREATE INDEX IF NOT EXISTS email_automation_sends_email_idx
  ON email_automation_sends (email);
