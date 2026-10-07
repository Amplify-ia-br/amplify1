alter table public.amplify_day_leads
  add column if not exists whatsapp text
  check (whatsapp is null or char_length(whatsapp) <= 40);
