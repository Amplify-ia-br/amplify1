-- ============================================
-- EBOOK LEADS (lead magnet: Executivo X.0)
-- Captura de leads na landing page de download do ebook.
-- Mesmo padrão de insert público usado em nps_responses.
-- ============================================
CREATE TABLE public.ebook_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_site TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ebook_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ebook_leads_created_at ON public.ebook_leads (created_at DESC);
CREATE INDEX idx_ebook_leads_email ON public.ebook_leads (email);

-- Qualquer visitante pode enviar seus dados para baixar o material.
CREATE POLICY "Anyone can submit ebook lead"
ON public.ebook_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Apenas admins podem ler os leads capturados.
CREATE POLICY "Admins can view ebook leads"
ON public.ebook_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
