-- Trigger-only function: it must not be callable through the Data API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- RLS policies need this helper for signed-in users, but anonymous callers do not.
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

CREATE INDEX IF NOT EXISTS amplify_day_inviters_created_by_idx
  ON public.amplify_day_inviters (created_by);

CREATE INDEX IF NOT EXISTS amplify_day_invitations_created_by_idx
  ON public.amplify_day_invitations (created_by);

CREATE INDEX IF NOT EXISTS blog_posts_author_id_idx
  ON public.blog_posts (author_id);
