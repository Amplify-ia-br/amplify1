---
id: ana-ghl-handoff-contract
title: Contrato de handoff da Ana para o GoHighLevel
description: Dados, tags, ordem de escrita e critérios para a Ana entregar oportunidades qualificadas ao workflow comercial.
type: implementation-contract
visibility: internal
status: active
owner: commercial-operations
source_of_truth: true
tags:
  - Ana
  - GoHighLevel
  - CRM
  - handoff
  - distribuição comercial
sources:
  - Configuração informada do workflow ANA — Handoff e Distribuição no GoHighLevel em 2026-10-20
relationships:
  - type: implements
    target: lead-qualification
last_reviewed: 2026-10-20
updated_at: 2026-10-20
---

# Contrato de handoff da Ana para o GoHighLevel

Este documento define a fronteira entre qualificação, handoff e distribuição territorial. A qualificação decide se a oportunidade está pronta e produz contexto comercial. O handoff persiste esse contexto e sinaliza a entrega. O workflow do GoHighLevel escolhe o vendedor conforme o território.

Agendamento em Calendars & Appointments é uma etapa posterior e não faz parte deste contrato inicial.

## Estado da infraestrutura em 20 de outubro de 2026

- a integração privada do GoHighLevel possui token criado;
- `GHL_PRIVATE_INTEGRATION_TOKEN` está configurada na Vercel;
- `GHL_LOCATION_ID` está configurada em Production e Preview;
- as permissões da integração foram liberadas;
- o ambiente foi redeployado depois da inclusão das variáveis;
- o workflow `ANA — Handoff e Distribuição` existe e permanece em rascunho;
- o gatilho do workflow é a aplicação da tag `ana-handoff-ready`.

O workflow deve continuar em rascunho até que a sincronização, a normalização de UF, cada rota territorial e a idempotência do handoff tenham sido validadas em Preview.

`GHL_ANA_PIPELINE_ROUTES` liga cada cluster ao funil e à etapa inicial correspondentes. A configuração atual usa B2C/Leads de Entrada para pessoas, Empresas/Novo Lead para empresas e outras organizações, Escolas/Novo Lead para escolas e Governos/Oportunidade para órgãos públicos. As variáveis legadas `GHL_ANA_PIPELINE_ID` e `GHL_ANA_PIPELINE_STAGE_ID` continuam aceitas somente como fallback de funil único. Sem um destino completo para o cluster, a integração falha fechada antes de alterar o contato ou aplicar `ana-handoff-ready`.

## Tags e distribuição territorial

| Regra de UF | Tag aplicada | Distribuição |
|---|---|---|
| AL, BA, CE, MA, PB, PE, PI, RN e SE | `ana-region-nordeste` | Adriano |
| SP | `ana-region-sp` | Igor |
| DF | `ana-region-df` | round-robin entre Binho, Gilson, Samuel e Mike |
| PR, SC, RS e ES | `ana-region-sul` | Leonardo Camacho |
| demais UFs do Brasil | nenhuma das quatro tags regionais | round-robin entre Adriano, Igor, Binho, Gilson, Samuel, Leonardo e Mike |

O nome correto da quarta tag é `ana-region-sul`. O Espírito Santo pertence a essa rota comercial mesmo sem pertencer geograficamente à região Sul.

Antes de aplicar uma nova tag regional, a integração deve remover qualquer tag regional anterior da Ana. A UF deve ser normalizada para a sigla oficial em maiúsculas. UF ausente ou inválida impede o handoff territorial e gera pendência ou revisão; não deve cair silenciosamente no round-robin nacional.

## Contrato mínimo de dados

### Identidade e contato

- `full_name`;
- `email`, quando conhecido;
- `phone`, quando conhecido, normalizado com DDI e DDD;
- `preferred_channel`, quando declarado;
- origem e canal da conversa.

O handoff exige pelo menos um canal válido entre e-mail e telefone. Se a conversa já ocorrer pelo WhatsApp, a integração deve reutilizar esse número e registrar a escolha desse canal para a finalidade combinada. Confirmações de agendamento ou lembretes só podem ser citados quando já houver um horário escolhido.

### Organização

- `organization_name`, quando a demanda for institucional;
- `organization_website`, quando disponível;
- `organization_type`;
- `city`, quando conhecida;
- `state` como UF normalizada.

### Roteamento e qualificação

- `motion`: `inbound` ou `outbound`;
- `cluster`;
- `recommended_product` ou rota comercial;
- origem e campanha, quando disponíveis;
- status dos gates aplicáveis;
- campos hard pendentes;
- `account_score`, quando aplicável;
- `opportunity_score`, quando aplicável;
- `total_score`;
- `qualification_completeness`;
- `score_model_version`;
- resumo para o vendedor;
- próxima ação acordada.

`account_score` é o nome canônico enviado nas novas integrações. Durante a migração, o runtime também aceita e pode preencher o alias legado `icp_score`; ambos devem representar exatamente o mesmo valor, sem dupla contagem.

### Campos L.E.I.A.

- tipo de instituição;
- escola particular ou pública;
- etapas de ensino;
- estudantes elegíveis;
- faixa de mensalidade;
- `reputacao_escola`;
- justificativa, fonte e responsável por `reputacao_escola`;
- papel do contato;
- acesso aos decisores;
- ano de interesse;
- problema ou motivo do interesse.

## Identificação e deduplicação

A busca deve seguir esta ordem:

1. usar o identificador do contato no GoHighLevel quando já for conhecido;
2. procurar por telefone normalizado;
3. procurar por e-mail normalizado;
4. criar contato somente quando nenhum registro corresponder.

Se telefone e e-mail corresponderem a contatos diferentes, a integração não faz merge automático. Ela registra conflito e envia para revisão humana.

O processamento deve usar um identificador idempotente de handoff. Repetir a mesma solicitação não pode criar outro contato, outra oportunidade aberta ou uma nova distribuição.

## Critérios para liberar o handoff

Antes de aplicar `ana-handoff-ready`, a integração valida:

- nome da pessoa;
- pelo menos um canal válido;
- organização, quando a rota for institucional;
- UF válida;
- cluster;
- produto ou rota recomendada;
- resumo da necessidade;
- resposta a todos os gates hard aplicáveis;
- próxima ação combinada;
- persistência bem-sucedida dos dados obrigatórios no GoHighLevel.

Para a distribuição comercial automática, a próxima ação deve ser `commercial_conversation`. `receive_materials` e `follow_up_later` geram nutrição e podem sincronizar o contato, mas não recebem `ana-handoff-ready`.

Para o L.E.I.A., a rota padrão exige também nome da escola, tipo de instituição, escola particular ou pública, etapas atendidas e papel do contato. Estudantes elegíveis são medium; site, faixa de mensalidade e `reputacao_escola` não bloqueiam sozinhos o handoff.

Um lead B2C não entra automaticamente na distribuição territorial institucional. Uma escola pública segue para Educação B2G ou Consultoria conforme a necessidade, nunca para a rota padrão do L.E.I.A. nem para perda automática.

## Ordem obrigatória de escrita

1. persistir a sessão e o resultado da qualificação na origem;
2. encontrar ou criar o contato no GoHighLevel;
3. atualizar identidade, canais, organização e UF;
4. atualizar cluster, rota, gates, completude, scores, evidências, resumo e próxima ação;
5. remover uma tag regional anterior que não corresponda mais à UF;
6. aplicar a tag regional correta, quando houver;
7. criar ou atualizar uma única oportunidade aberta aplicável;
8. reler ou validar que os campos obrigatórios foram persistidos;
9. aplicar `ana-handoff-ready` como última operação.

`ana-handoff-ready` é um evento de entrega, não apenas uma classificação. Ela nunca deve ser aplicada antes dos dados e da tag regional. Se qualquer escrita obrigatória falhar, a tag não é aplicada.

Na releitura anterior à entrega, a integração confirma identidade e canal informados, organização, UF, custom fields configurados, a tag regional esperada — ou a ausência de tags regionais na rota nacional — e que não restou uma `ana-handoff-ready` antiga. Qualquer divergência interrompe o handoff para permitir uma nova tentativa idempotente.

Falhas temporárias podem ser repetidas a partir da etapa segura mais recente. Uma repetição deve preservar idempotência. Falha em outro destino de marketing não pode apagar nem duplicar o estado já confirmado no GoHighLevel.

Antes da chamada ao GoHighLevel, o outbox deve adquirir atomicamente o processamento do `handoff_id`. Uma segunda requisição para o mesmo handoff não pode executar as mutações do CRM em paralelo. Um processamento abandonado só pode ser retomado após o tempo de lease; estados concluídos não podem ser rebaixados para falha. A conclusão do outbox e a marcação da sessão como entregue devem ocorrer na mesma operação atômica.

## Pós-handoff

Depois da distribuição, o vendedor deve receber um resumo com:

- rota ou produto;
- organização e setor;
- contato e papel na decisão;
- problema principal;
- público ou escala;
- estágio atual;
- prazo;
- processo de contratação, quando conhecido;
- gates, score e completude;
- informações pendentes;
- objeções ou dúvidas;
- próxima ação e objetivo da reunião.

Quando Calendars & Appointments for integrado, a Ana deve consultar a agenda do vendedor efetivamente atribuído. Ela oferece horários no canal atual, sem exigir WhatsApp para revelar as opções. WhatsApp é solicitado apenas se necessário para confirmar e lembrar o compromisso; o appointment só é criado depois da escolha e da confirmação explícita da pessoa.

## Validação antes de publicar o workflow

Os testes devem cobrir, no mínimo:

- uma UF de cada rota territorial;
- ES usando `ana-region-sul`;
- todos os participantes dos round-robins de DF e nacional;
- UF por extenso, em minúsculas e com espaços;
- UF ausente ou inválida;
- contato existente por telefone;
- contato existente por e-mail;
- conflito entre telefone e e-mail;
- mudança de UF e remoção da tag anterior;
- repetição do mesmo handoff;
- falha antes da aplicação de `ana-handoff-ready`;
- lead com gate hard pendente;
- escola pública;
- lead B2C;
- persistência do resumo e dos campos de qualificação antes da distribuição.

O workflow só pode ser publicado quando os testes confirmarem que nenhum contato incompleto é distribuído, nenhuma repetição cria duplicidade e `ana-handoff-ready` aparece sempre depois dos demais dados obrigatórios.
