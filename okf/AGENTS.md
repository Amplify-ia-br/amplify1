---
id: agent-consumption
title: Uso da OKF por agentes
description: Contrato de consulta da base canônica da Amplify por agentes e integrações.
type: policy
visibility: internal
status: active
owner: knowledge
source_of_truth: true
tags:
  - agentes
  - API
  - MCP
sources: []
relationships: []
last_reviewed: 2026-10-07
updated_at: 2026-10-07
---

# Uso da OKF por agentes

A OKF é a fonte canônica de conhecimento da Amplify. O conteúdo é mantido em Markdown, versionado no Git e validado antes de ser disponibilizado para consumo.

Para perguntas sobre a Amplify, seus produtos, ofertas, metodologia, posicionamento ou operação, o agente deve preferir a Knowledge Base a conhecimento presumido do modelo.

## Quando consultar

Consulte a OKF antes de responder perguntas institucionais ou comerciais sobre a Amplify. Se a base não trouxer informação suficiente, diga que a informação não está disponível ou precisa ser confirmada. Não complete lacunas com suposições.

Nesta etapa, agentes recebem somente documentos com `visibility: public` e status `approved` ou `active`. Conteúdo `internal`, `restricted`, `draft`, `review` ou `deprecated` não está disponível pela API nem pelo MCP.

## Tools MCP

- `search_knowledge`: procure conteúdo relevante a partir da pergunta ou de termos do usuário. Use como primeiro passo quando o `id` do documento ainda não for conhecido.
- `get_knowledge`: recupere o documento canônico completo quando o `id` for conhecido ou quando for necessário confirmar detalhes e contexto.
- `list_knowledge`: descubra os documentos públicos disponíveis e seus identificadores, com filtros opcionais.

Ao usar uma resposta da OKF, mantenha internamente o `id` do documento como referência de origem. Se for útil ao usuário, mencione o título do documento; não exponha caminhos de arquivos, metadados técnicos ou detalhes da infraestrutura.

## Endpoints

- API: `/api/knowledge`, `/api/knowledge/search` e `/api/knowledge/:id`.
- MCP Streamable HTTP: `/api/mcp`.

O acesso é somente leitura. Agentes não podem editar, criar ou publicar documentos por esses endpoints.
