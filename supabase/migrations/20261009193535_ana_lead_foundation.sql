-- Harden update policies created by the initial site migration.
ALTER POLICY "Users can update own profile"
  ON public.profiles
  WITH CHECK ((SELECT auth.uid()) = id);

ALTER POLICY "Admins can update any profile"
  ON public.profiles
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

ALTER POLICY "Editors and admins can update posts"
  ON public.blog_posts
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'editor')
  );

ALTER POLICY "Editors and admins can update blog images"
  ON storage.objects
  WITH CHECK (
    bucket_id = 'blog-images' AND (
      public.has_role((SELECT auth.uid()), 'admin') OR
      public.has_role((SELECT auth.uid()), 'editor')
    )
  );

-- Trigger-only helper: it must not be callable through the Data API.
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.ana_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_key UUID NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'site'
    CHECK (channel IN ('site', 'whatsapp', 'email', 'outbound', 'other')),
  page_path TEXT CHECK (page_path IS NULL OR char_length(page_path) <= 500),
  page_context TEXT CHECK (page_context IS NULL OR char_length(page_context) <= 160),
  status TEXT NOT NULL DEFAULT 'engaged'
    CHECK (status IN (
      'engaged', 'qualifying', 'qualified', 'meeting_requested',
      'meeting_booked', 'handoff', 'nurture', 'disqualified', 'closed'
    )),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ana_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ana_conversations(id) ON DELETE CASCADE,
  external_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  model TEXT CHECK (model IS NULL OR char_length(model) <= 200),
  knowledge_mode TEXT CHECK (knowledge_mode IS NULL OR knowledge_mode IN ('mcp', 'direct')),
  source_ids TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, external_id)
);

CREATE TABLE public.ana_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID UNIQUE REFERENCES public.ana_conversations(id) ON DELETE SET NULL,
  name TEXT CHECK (name IS NULL OR char_length(name) BETWEEN 2 AND 160),
  email TEXT CHECK (email IS NULL OR (email = lower(email) AND char_length(email) <= 320)),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 40),
  company TEXT CHECK (company IS NULL OR char_length(company) <= 200),
  role TEXT CHECK (role IS NULL OR char_length(role) <= 200),
  offer_interest TEXT CHECK (offer_interest IS NULL OR char_length(offer_interest) <= 160),
  source TEXT NOT NULL DEFAULT 'site'
    CHECK (source IN ('site', 'whatsapp', 'email', 'outbound', 'other')),
  stage TEXT NOT NULL DEFAULT 'engaged'
    CHECK (stage IN (
      'engaged', 'qualifying', 'qualified', 'meeting_requested',
      'meeting_booked', 'handoff', 'nurture', 'disqualified', 'won', 'lost'
    )),
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  meeting_url TEXT CHECK (meeting_url IS NULL OR char_length(meeting_url) <= 1000),
  summary TEXT CHECK (summary IS NULL OR char_length(summary) <= 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (marketing_consent OR consent_at IS NULL)
);

CREATE INDEX ana_conversations_status_last_message_idx
  ON public.ana_conversations (status, last_message_at DESC);

CREATE INDEX ana_messages_conversation_created_idx
  ON public.ana_messages (conversation_id, created_at);

CREATE INDEX ana_leads_stage_updated_idx
  ON public.ana_leads (stage, updated_at DESC);

CREATE INDEX ana_leads_email_idx
  ON public.ana_leads (email)
  WHERE email IS NOT NULL;

CREATE TRIGGER update_ana_conversations_updated_at
  BEFORE UPDATE ON public.ana_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ana_leads_updated_at
  BEFORE UPDATE ON public.ana_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ana_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ana_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ana_leads ENABLE ROW LEVEL SECURITY;

-- Ana writes through server-side routes only. No browser role receives access
-- to lead or conversation data.
REVOKE ALL ON TABLE public.ana_conversations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ana_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ana_leads FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ana_leads TO service_role;
