# AGENTS.md — Guia para Codex (Ana Lab + Central de Conhecimento)

Repositório: `Amplify-ia-br/amplify1` (branch base `main`). Stack: Astro (SSR, adapter Vercel) + React islands, Vite/Vitest, Supabase (auth + governança), Vercel AI SDK (AI Gateway), MCP.

> Nomenclatura: os termos "Ana Labs Zero" e "central de análise e melhorias" não existem literalmente no código.
> - "Ana Labs" = **Ana Lab** (`/lab/ana`), laboratório de testes da agente comercial Ana.
> - "Central de análise e melhorias" = **Central de Conhecimento (OKF) + painel `/admin/knowledge`** (revisão, aprovação, feedback e sugestões), mais o painel de diagnósticos do Ana Lab.
> Se existir uma versão "Zero" fora deste repositório, confirme com o usuário antes de assumir.

## 1. Ana Lab (agente Ana)

Rota (noindex): `/lab/ana`. API: `POST /api/ana-chat`.

| O que | Onde |
| --- | --- |
| Página/layout | `src/pages/lab/ana.astro`, `src/layouts/AnaLabLayout.astro` |
| UI do chat (modo MCP/direct, seletor de modelo, BYOK, diagnósticos de recuperação, custo) | `src/components/ana/AnaLab.tsx`, `AnaLab.css` |
| Endpoint Vercel / rota Astro | `api/ana-chat.ts` → `src/pages/api/ana-chat.ts` |
| Handler (validação, streaming, metadados de tokens/custo/generationId) | `src/lib/ana/http.ts` |
| Modelos, fallbacks do AI Gateway, schema do request, estimativa de custo | `src/lib/ana/config.ts` (modelo padrão: `openai/gpt-5.4-mini-fast`) |
| Prompt/regras da Ana + chamada `streamText` | `src/lib/ana/agent.ts` |
| Recuperação (intents, termos, ranking, modo `mcp` via `@ai-sdk/mcp` vs `direct`) | `src/lib/ana/retrieval.ts` |
| Tools diretas (`search_knowledge`, `get_knowledge`, `list_knowledge`) | `src/lib/ana/tools.ts` |
| Testes | `src/lib/ana/config.test.ts`, `retrieval.test.ts` |
| Feedback dos testadores (polegar cima/baixo + comentário por resposta da Ana) | UI `src/components/ana/AnaFeedback.tsx` (renderizada em `AnaLab.tsx`, uma `sessionId` por conversa); API `POST /api/ana-feedback` → `api/ana-feedback.ts`, `src/pages/api/ana-feedback.ts`, `src/lib/ana/feedback.ts`; tabela Neon `ana_feedback` (`migrations/003_ana_feedback.sql`, upsert por `session_id + message_id`, guarda pergunta, resposta, modelo, modo, intent, fontes e generationId) |

Regras importantes já implementadas (não regredir):
- Ana responde só com o contexto OKF fornecido; sem inventar preço, sem chamar produto de "principal/líder"; escreve sempre **L.E.I.A.**; sem Markdown; última linha "Fonte: …".
- BYOK Anthropic (`byok/anthropic/claude-haiku-5-5`) exige `apiKey` na sessão; `thinking` desativado; não enviar opções de sampling não suportadas.
- Modelos Gateway têm fallbacks automáticos; tags de observabilidade: `ana-lab`, `knowledge-<mode>`, `intent-<intent>`.
- `vercel.json` inclui `okf/public/**` nas functions `api/ana-chat.ts`, `api/mcp.ts` e `api/knowledge/**`.

## 2. Base de conhecimento OKF (fonte canônica)

Conteúdo em Markdown com frontmatter validado (`src/lib/okf-schema.ts`):
- `okf/public/` — consumível por API/MCP/Ana (somente `visibility: public` + status `approved|active`).
- `okf/internal/`, `okf/restricted/` — nunca expostos por API/MCP.
- Contrato de consumo por agentes: `okf/AGENTS.md` (leia antes de mexer em API/MCP).

Leitura (somente leitura, noindex):
- API: `/api/knowledge`, `/api/knowledge/search`, `/api/knowledge/:id` → `api/knowledge/*.ts`, `src/pages/api/knowledge/*`.
- MCP Streamable HTTP: `/api/mcp` → `api/mcp.ts`, `src/lib/okf/mcp-server.ts`, `mcp.ts`, `file-mcp.ts`.
- Núcleo/serviço/HTTP: `src/lib/okf/core.ts`, `service.ts`, `file-service.ts`, `http.ts`, `vercel.ts`.
- Site público da base: `src/pages/knowledge/index.astro`, `[id].astro`, `src/layouts/KnowledgeLayout.astro`, `src/components/knowledge/*`.

Validação: `npm run okf:validate` (`scripts/validate-okf.ts`) roda em `predev` e `prebuild`.

## 3. Central de análise e melhorias (governança editorial)

Fluxo: **criar/importar → revisar → aprovar → publicar no Git → feedback/sugestões inline → nova revisão**.

| O que | Onde |
| --- | --- |
| Painel admin (abas: Documentos, Criar ou importar, Aprovações, Áreas e responsáveis) | `src/pages/admin/_KnowledgeAdmin.tsx`; rota `/admin/knowledge` em `src/admin/AdminApp.tsx`; menu em `src/pages/admin/_AdminLayout.tsx` |
| Importação de Google Docs (Picker/OAuth) | `src/lib/knowledge-workflow/google-doc.ts` |
| Publicação aprovada → commit em `okf/<visibility>/<id>.md` via GitHub API | `src/lib/knowledge-workflow/http.ts`, `publication.ts`; endpoint `POST /api/knowledge-workflow/publish` (`api/knowledge-workflow/publish.ts`, `src/pages/api/knowledge-workflow/publish.ts`) |
| Curtir/comentar/sugerir trechos nos documentos | `src/components/knowledge/KnowledgeAnnotations.tsx` (usada em `src/pages/knowledge/[id].astro`) |
| Sincronizar `okf/` existente → tabelas de governança | `npm run okf:sync-governance` (`scripts/sync-okf-governance.mjs`) |
| Banco (Supabase) | `supabase/migrations/20261015192625_knowledge_governance.sql` + `…193515_…_indexes`, `…193701_enforce_knowledge_approval_roles`, `…193840_allow_service_role_knowledge_triggers` |

Modelo de dados: `knowledge_admins`, `knowledge_areas`, `knowledge_area_members` (roles `owner|editor`), `knowledge_documents`, `knowledge_revisions` (status inclui `approved`, `publishing`), `knowledge_sources`, `knowledge_annotations` (`like|comment|suggestion`; status `open|accepted|rejected|resolved|orphaned`), `knowledge_audit_events`. RLS ativo; aprovação restrita a dono da área/admin (triggers).

Permissões de publicação: só dono da área ou admin da KB; revisão precisa estar `approved`; falha de GitHub preserva a aprovação. Commits automáticos aparecem como `docs(okf): publish <id>` na `main`.

Variáveis de ambiente (ver `.env.example`; nunca commitar valores):
- Cliente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `PUBLIC_GOOGLE_CLIENT_ID`, `PUBLIC_GOOGLE_API_KEY`, `PUBLIC_GOOGLE_APP_ID`.
- Servidor: `GITHUB_OKF_TOKEN`, `GITHUB_OKF_REPOSITORY` (padrão `Amplify-ia-br/amplify1`), `GITHUB_OKF_BRANCH` (padrão `main`), `SUPABASE_SERVICE_ROLE_KEY` (apenas para o script de sync), `KNOWLEDGE_BOOTSTRAP_EMAIL`.
- AI Gateway: autenticação via runtime da Vercel (sem chave manual).

## 4. Histórico relevante (git)

- `fd51d02`, `324d58e`, `b6de121`: base de conhecimento, API/MCP e conteúdo da L.E.I.A.
- `38fd73a`…`9b2bfd9` (PR #13): criação do Ana Lab, fallbacks Gateway, BYOK, recuperação otimizada.
- `79827cc`, `120bf91` (PR #15): alinhamento de portfólio/ofertas no OKF.
- `4ed7beb`, `409c0aa` (PR #16): governança editorial e anotações inline.
- `440d99a`…`16f9311` (PRs #17–#20): correções do publisher na Vercel (rota, imports, retry, sessão).

## 5. Como trabalhar aqui

- Antes de PR: `npm run okf:validate && npm test && npm run lint && npm run build`.
- Trabalhe em branch (`feat/…`, `fix/…`) e abra PR; não faça push direto na `main`.
- Conteúdo factual vive em `okf/`; não duplique fatos de produto no prompt da Ana.
- Conteúdo `internal`/`restricted` nunca deve chegar à Ana, API ou MCP.
- Textos de UI em português; nomes de arquivos em inglês.
