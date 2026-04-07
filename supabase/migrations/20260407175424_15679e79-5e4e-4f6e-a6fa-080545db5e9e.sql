
CREATE TABLE public.nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  name TEXT,
  email TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit NPS response"
ON public.nps_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
