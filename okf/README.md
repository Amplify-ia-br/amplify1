---
id: amplify-okf
title: Base de conhecimento da Amplify
description: Manual de organização, manutenção e publicação da base de conhecimento da Amplify.
type: index
visibility: internal
status: active
owner: leadership
source_of_truth: true
tags:
  - documentação
  - governança
  - OKF
sources: []
relationships: []
last_reviewed: 2026-10-07
updated_at: 2026-10-07
---

# Base de conhecimento da Amplify

OKF é o formato usado pela Amplify para manter conhecimento institucional em arquivos Markdown versionados no Git. O repositório é a fonte canônica. Páginas, agentes e outras interfaces devem consumir esses arquivos sem criar uma segunda versão do mesmo conteúdo.

## Estrutura

```text
okf/
├── README.md
├── public/
├── internal/
└── restricted/
```

- `public/`: conteúdo elegível para a área pública `/knowledge`, sujeito à regra de publicação por status.
- `internal/`: estratégia, procedimentos e referências que podem circular apenas entre pessoas autorizadas.
- `restricted/`: informações sensíveis com acesso definido pelo responsável do documento.

Nesta etapa, o Astro carrega somente `okf/public`. As outras pastas permanecem fora da aplicação pública.

## Schema OKF v0.1

Todo documento Markdown da pasta `okf` começa com frontmatter YAML no formato abaixo:

```yaml
id: document-id
title: Título do documento
description: Resumo curto e específico do conteúdo.
type: policy

visibility: public
status: approved

owner: leadership
# reviewer: nome-ou-papel

source_of_truth: true

tags:
  - exemplo

sources: []

relationships:
  - type: related_to
    target: another-document-id

last_reviewed: 2026-10-07
# review_due: 2027-04-07
updated_at: 2026-10-07

# supersedes: previous-document-id
```

Datas usam `YYYY-MM-DD`. Identificadores usam letras minúsculas, números e hífens.

## Significado dos campos

| Campo | Obrigatório | Uso |
|---|---|---|
| `id` | sim | Identificador único e estável do documento. Também forma a URL pública. |
| `title` | sim | Nome exibido para leitores. |
| `description` | sim | Resumo usado no índice, na busca e em metadados da página. |
| `type` | sim | Categoria estrutural, como `company`, `method`, `policy`, `strategy` ou `glossary`. |
| `visibility` | sim | Define se o conteúdo é `public`, `internal` ou `restricted`. |
| `status` | sim | Estado editorial: `draft`, `review`, `approved`, `active` ou `deprecated`. |
| `owner` | sim | Papel responsável pela exatidão e manutenção do conteúdo. |
| `reviewer` | não | Papel ou pessoa que deve fazer a revisão editorial ou técnica. |
| `source_of_truth` | sim | Indica se o documento é a referência principal sobre o assunto. |
| `tags` | sim | Termos usados para navegação, filtro e busca. Pode ser uma lista vazia. |
| `sources` | sim | Fontes que sustentam o conteúdo. Pode ser uma lista vazia quando não houver fonte registrada. |
| `relationships` | sim | Relações tipadas com outros documentos por `id`. Pode ser uma lista vazia. |
| `last_reviewed` | sim | Data da última revisão de conteúdo. |
| `review_due` | não | Data planejada para a próxima revisão. Não produz automação nesta versão. |
| `updated_at` | sim | Data da última alteração material no arquivo. |
| `supersedes` | não | `id` do documento anterior que este documento substitui. |

## Regra de visibilidade

A pasta e o campo `visibility` precisam concordar:

- arquivos em `public/` usam `visibility: public`;
- arquivos em `internal/` usam `visibility: internal`;
- arquivos em `restricted/` usam `visibility: restricted`.

O arquivo raiz `README.md` é interno. A coleção Astro usa um caminho fixo para `okf/public`; não deve receber glob amplo, caminho dinâmico ou importação das outras pastas.

O campo `visibility` sozinho não é uma barreira de segurança. Conteúdo interno ou restrito nunca deve ser copiado para componentes, propriedades do cliente ou índices da área pública.

## Estados editoriais

- `draft`: conteúdo em elaboração.
- `review`: aguardando validação.
- `approved`: aprovado para o uso indicado.
- `active`: regra ou referência vigente.
- `deprecated`: mantido apenas para histórico ou para suportar `supersedes`.

Estar na pasta `public` não basta para publicar um documento. A área pública só inclui arquivos com `visibility: public` e `status: approved` ou `status: active`. Documentos com status `draft`, `review` ou `deprecated` não aparecem na listagem, nas rotas nem na busca.

## Como adicionar um documento

1. Escolha a pasta conforme a visibilidade real do conteúdo.
2. Copie o schema v0.1 e preencha os campos obrigatórios.
3. Crie um `id` estável e único. Não use o título como identificador descartável.
4. Registre fontes e relações conhecidas. Não invente fontes para preencher o campo.
5. Escreva o conteúdo em Markdown.
6. Rode `npm run okf:validate`.
7. Se for público, rode `npm run build` e confira `/knowledge` e `/knowledge/[id]`.
8. Inclua o arquivo no commit correspondente.

## Como atualizar um documento

1. Edite o arquivo existente. Não crie uma cópia para uma correção comum.
2. Atualize `updated_at` quando houver mudança material.
3. Atualize `last_reviewed` quando o conteúdo inteiro tiver sido revisado.
4. Ajuste `review_due` se houver uma próxima revisão acordada.
5. Preserve o `id` para não quebrar URLs e relações.
6. Rode a validação antes do commit.

## Como funciona `supersedes`

Use `supersedes` quando um novo documento assumir formalmente o lugar de outro. O documento anterior deve continuar no repositório, receber `status: deprecated` e apontar o leitor para a referência vigente no corpo do texto.

Não use `supersedes` para revisões normais. Nesses casos, edite o documento existente e deixe o Git registrar o histórico.

## Responsabilidade e revisão

`owner` identifica quem responde pela exatidão, pelos limites de divulgação e pela manutenção do conteúdo. Pode ser um papel, como `leadership`, `commercial` ou `product`.

`reviewer` é opcional e identifica quem deve revisar o documento quando essa função for diferente do responsável. O campo não transfere a responsabilidade do `owner`.

`review_due` registra uma data planejada. Nesta versão, a data não cria aviso, tarefa ou bloqueio automático.

## Relações

Cada item de `relationships` tem um tipo livre e um `target` que corresponde ao `id` de outro documento.

```yaml
relationships:
  - type: related_to
    target: company
```

A validação falha quando o destino não existe. Um documento público também não pode apontar para um documento interno ou restrito, evitando a exposição de identificadores e relações não públicas.

## Validação local

Use:

```bash
npm run okf:validate
```

A validação também roda automaticamente antes de `npm run dev` e `npm run build`. Ela verifica:

- presença e formato do frontmatter;
- schema OKF v0.1;
- coerência entre pasta e visibilidade;
- unicidade de `id`;
- formato das datas;
- destinos de `relationships`;
- destinos de `supersedes`;
- ausência de relações públicas com documentos não públicos.

Erros informam o arquivo, o campo e o motivo. O build ou o servidor de desenvolvimento não inicia até que o problema seja corrigido.

## Área pública

O índice está em `/knowledge`. Cada documento publicado recebe a rota `/knowledge/[id]`. A busca e os filtros operam no navegador sobre título, descrição, tipo, tags, status e texto somente dos documentos publicados.

## Consumo por agentes

A mesma camada de leitura da área pública alimenta uma API REST somente leitura e um servidor MCP por Streamable HTTP:

- `/api/knowledge`: lista documentos publicados e aceita filtros por tipo, tag e status;
- `/api/knowledge/search`: busca textual com o parâmetro `q`;
- `/api/knowledge/:id`: recupera metadata e conteúdo Markdown de um documento publicado;
- `/api/mcp`: disponibiliza as tools `search_knowledge`, `get_knowledge` e `list_knowledge`.

Essas interfaces não leem nem expõem `internal/` ou `restricted/`. Também não expõem documentos públicos com status `draft`, `review` ou `deprecated`. O contrato de uso está em [AGENTS.md](AGENTS.md).

Não existem nesta versão autenticação da KB, embeddings, busca semântica, escrita por agentes ou interface para conteúdo interno.

## Arquivos principais

- [Empresa](public/company.md)
- [Portfólio](public/portfolio.md)
- [Catálogo de ofertas](public/offers.md)
- [Método](public/method.md)
- [Amplify Academy](public/amplify-academy.md)
- [Glossário](public/glossary.md)
- [Estratégia do portfólio](internal/portfolio-strategy.md)
- [Política comercial](internal/commercial-policy.md)
- [Clientes, referências e cases](internal/clients-and-cases.md)
- [Qualificação de oportunidades](internal/lead-qualification.md)
- [Objeções comerciais](internal/commercial-objections.md)
- [Desenvolvimento de produtos](internal/product-development.md)
- [Propriedade e direitos de uso](internal/intellectual-property.md)
- [Padrão editorial](internal/editorial-standard.md)
