ALTER TABLE public.ana_conversations
  ADD COLUMN session_hash TEXT
  CHECK (session_hash IS NULL OR session_hash ~ '^[0-9a-f]{64}$');

-- Existing laboratory conversations predate session ownership. Give them an
-- unreachable binding so possessing a legacy UUID cannot expose their history.
UPDATE public.ana_conversations
SET session_hash = encode(gen_random_bytes(32), 'hex')
WHERE session_hash IS NULL;

ALTER TABLE public.ana_conversations
  ALTER COLUMN session_hash SET NOT NULL;

CREATE INDEX ana_conversations_session_hash_idx
  ON public.ana_conversations (session_hash)
  WHERE session_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_ana_conversation(
  p_conversation_key UUID,
  p_session_hash TEXT,
  p_page_path TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  claimed_id UUID;
BEGIN
  IF p_session_hash IS NULL OR p_session_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_session_hash';
  END IF;

  INSERT INTO public.ana_conversations (
    conversation_key,
    channel,
    page_path,
    last_message_at,
    session_hash
  )
  VALUES (
    p_conversation_key,
    'site',
    p_page_path,
    now(),
    p_session_hash
  )
  ON CONFLICT (conversation_key) DO UPDATE
  SET page_path = COALESCE(EXCLUDED.page_path, public.ana_conversations.page_path),
      last_message_at = now()
  WHERE public.ana_conversations.session_hash = EXCLUDED.session_hash
  RETURNING id INTO claimed_id;

  RETURN claimed_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ana_conversation(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ana_conversation(UUID, TEXT, TEXT)
  TO service_role;
