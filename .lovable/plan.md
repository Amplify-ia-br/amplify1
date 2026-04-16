
Vou criar uma área administrativa completa para gestão do blog, com autenticação, controle de acesso por papéis (admin e editor), e um editor completo para criação/edição de posts.

## O que será construído

### 1. Backend (Lovable Cloud)

**Tabela `profiles`** — dados básicos dos usuários (id, full_name, email, created_at)

**Enum `app_role`** + tabela `user_roles` — papéis separados (admin, editor) seguindo boas práticas de segurança (sem armazenar role no profile, evitando escalonamento de privilégios)

**Função `has_role(user_id, role)`** — security definer para checar permissões nas RLS sem recursão

**Tabela `blog_posts`** com campos:
- id, title, slug (único), excerpt, content (texto longo / markdown), cover_image_url
- category, read_time, author_name
- published (boolean), published_at, created_at, updated_at
- author_id (FK para auth.users)

RLS:
- SELECT público: apenas posts com `published = true`
- SELECT/INSERT/UPDATE/DELETE: admin e editor autenticados

**Bucket de Storage `blog-images`** (público) para upload de capas e imagens inline, com policies permitindo upload por admin/editor e leitura pública.

**Trigger** para auto-criar perfil ao registrar usuário (`handle_new_user`).

**Trigger** `updated_at` automático em `blog_posts`.

### 2. Autenticação

- Página `/auth` com login (email + senha). **Sem signup público** — apenas admin cria usuários da agência.
- Auto-confirm de email habilitado (para facilitar criação manual de contas pela agência).
- Hook `useAuth` para sessão + listener `onAuthStateChange`.
- Hook `useUserRole` para verificar papel do usuário logado.

### 3. Área Administrativa

Rotas protegidas (requer login + role admin/editor):

- **`/admin`** — Dashboard com lista de posts (publicados e rascunhos), botão "Novo Post", filtros por status.
- **`/admin/posts/new`** — Editor de novo post.
- **`/admin/posts/:id/edit`** — Editor de post existente.
- **`/admin/users`** — Apenas admin: listar usuários, criar novo usuário (agência), atribuir/remover papel `editor`.

**Editor de Post** com:
- Campo título (gera slug automaticamente, editável)
- Campo categoria, tempo de leitura, autor
- Upload de imagem de capa (preview + envio para Storage)
- Editor de conteúdo rich text (usaremos **TipTap** — leve, moderno, suporta markdown, headings, listas, links, imagens inline, citações, código)
- Upload de imagens dentro do conteúdo (Storage)
- Campo excerpt (resumo)
- Toggle "Publicado" + botão "Salvar rascunho" / "Publicar"
- Botão "Excluir" (com confirmação)

### 4. Integração com Blog Público

- `Blog.tsx` passa a buscar posts de `blog_posts` (apenas `published = true`), ordenados por `published_at` desc.
- `BlogPost.tsx` busca pelo `slug` (rota mudará de `/blog/:id` para `/blog/:slug` para SEO).
- Mantém o post atual ("Hoje eu não vim falar de tecnologia") — vou inseri-lo via SQL migration como dado seed.

### 5. Navegação

- Link discreto "Admin" no Footer (não polui o menu principal).
- Após login, botão "Sair" + link "Admin" aparecem no Navbar para usuários autenticados.

## Detalhes técnicos

**Bibliotecas a adicionar**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`.

**Segurança**:
- Roles em tabela separada (`user_roles`) — nunca em `profiles`
- `has_role()` como SECURITY DEFINER
- Validação com Zod nos formulários (título, slug, conteúdo)
- Sanitização do HTML do TipTap antes de renderizar no blog público (DOMPurify)

**Fluxo da agência**:
1. Você cria conta admin para si (eu insiro via SQL após você definir email/senha) ou se cadastra na primeira execução
2. Em `/admin/users`, você cria a conta da agência com papel `editor`
3. Agência faz login em `/auth`, acessa `/admin`, cria/edita posts
4. Apenas admin pode gerenciar usuários; editor só gerencia posts

## Arquivos a criar/editar

**Criar**:
- `supabase/migrations/...` (profiles, user_roles, blog_posts, storage bucket, RLS, triggers)
- `src/hooks/useAuth.tsx`, `src/hooks/useUserRole.tsx`
- `src/pages/Auth.tsx`
- `src/pages/admin/AdminLayout.tsx`, `AdminDashboard.tsx`, `PostEditor.tsx`, `UserManagement.tsx`
- `src/components/admin/ProtectedRoute.tsx`
- `src/components/admin/RichTextEditor.tsx` (TipTap)
- `src/components/admin/ImageUpload.tsx`
- `src/lib/slugify.ts`

**Editar**:
- `src/App.tsx` (novas rotas)
- `src/pages/Blog.tsx` (buscar do banco)
- `src/pages/BlogPost.tsx` (buscar por slug)
- `src/components/layout/Navbar.tsx` e `Footer.tsx` (link admin/sair)

## Pergunta antes de implementar

Para criar sua conta de admin inicial preciso saber: você prefere que eu **(a)** habilite signup público temporariamente, você se cadastra, eu te promovo a admin via SQL e depois desabilito o signup; ou **(b)** você me informa um email e eu já crio a conta admin diretamente via migration (você define a senha no primeiro login via "esqueci minha senha")?

A opção **(a)** é mais simples e rápida. Confirme qual prefere e eu prossigo.
