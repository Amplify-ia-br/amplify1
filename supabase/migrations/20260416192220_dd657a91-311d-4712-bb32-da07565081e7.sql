
-- ============================================
-- 1. ENUM de papéis
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

-- ============================================
-- 2. PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. USER_ROLES
-- ============================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. has_role function (security definer)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================
-- 5. updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 6. handle_new_user trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. RLS profiles
-- ============================================
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 8. RLS user_roles
-- ============================================
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 9. BLOG POSTS
-- ============================================
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  category TEXT,
  read_time TEXT,
  author_name TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS blog_posts
CREATE POLICY "Public can view published posts" ON public.blog_posts
  FOR SELECT USING (published = true);

CREATE POLICY "Editors and admins can view all posts" ON public.blog_posts
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Editors and admins can insert posts" ON public.blog_posts
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Editors and admins can update posts" ON public.blog_posts
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Editors and admins can delete posts" ON public.blog_posts
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
  );

-- ============================================
-- 10. STORAGE BUCKET blog-images
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view blog images" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Editors and admins can upload blog images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'blog-images' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
    )
  );

CREATE POLICY "Editors and admins can update blog images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'blog-images' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
    )
  );

CREATE POLICY "Editors and admins can delete blog images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'blog-images' AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')
    )
  );

-- ============================================
-- 11. SEED admin user (fernando@amplify.ia.br)
-- ============================================
DO $$
DECLARE
  admin_user_id UUID;
  existing_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'fernando@amplify.ia.br' LIMIT 1;

  IF existing_user_id IS NULL THEN
    admin_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'fernando@amplify.ia.br',
      crypt('TempPassword!ChangeMe2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Fernando Godoy"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  ELSE
    admin_user_id := existing_user_id;
  END IF;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (admin_user_id, 'fernando@amplify.ia.br', 'Fernando Godoy')
  ON CONFLICT (id) DO NOTHING;

  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Seed initial blog post
  INSERT INTO public.blog_posts (
    title, slug, excerpt, content, category, read_time, author_name, author_id, published, published_at
  ) VALUES (
    'Hoje eu não vim falar de tecnologia. Eu vim anunciar o fim da sua vantagem.',
    'fim-da-sua-vantagem-competitiva',
    'A vantagem competitiva não é ter IA. É implementar antes do seu concorrente. E esperar não é prudência. É perder mercado com educação.',
    '<p><strong>Hoje eu não vim falar de tecnologia.</strong></p><p><strong>Eu vim anunciar o fim de uma vantagem competitiva: a sua.</strong></p><p>A vantagem competitiva não é ter IA.<br>É implementar antes do seu concorrente.<br>E esperar não é prudência. É perder mercado com educação.</p><hr><p><strong>O inimigo não é a falta de IA.<br>É a ilusão confortável de que dá pra esperar "só mais um pouco".</strong></p><p>Ela aparece com 3 máscaras:</p><ul><li><strong>Agenda lotada</strong> — "agora não dá tempo"</li><li><strong>Piloto eterno</strong> — POC que nunca vira produção</li><li><strong>Medo de expor ineficiência</strong> — IA revela gargalos e retrabalho</li></ul><hr><p>Na prática, você não perde pra quem tem mais tecnologia.<br><strong>Você perde pra quem decide e executa mais rápido.</strong></p><blockquote><p><strong>Tempo é o novo custo fixo.</strong></p><p>IA não reduz custo. Ela reduz atraso.<br>Atraso é o imposto invisível que come sua margem — e derruba suas vendas.</p></blockquote><p><strong>O caminho que funciona (sem hype) é simples:</strong></p><p><strong>Capacitar pessoas + diagnosticar processos + implantar automações.</strong></p><p>Isso destrava vendas, encurta ciclo, melhora follow-up e devolve tempo mental.</p>',
    'Estratégia',
    '4 min',
    'Fernando Godoy',
    admin_user_id,
    true,
    '2025-01-31 12:00:00+00'
  )
  ON CONFLICT (slug) DO NOTHING;
END $$;
