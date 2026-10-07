ALTER TABLE public.amplify_day_invitations
  DROP CONSTRAINT IF EXISTS amplify_day_invitations_personal_message_check;

ALTER TABLE public.amplify_day_invitations
  ADD CONSTRAINT amplify_day_invitations_personal_message_check
  CHECK (personal_message IS NULL OR char_length(personal_message) <= 180);
