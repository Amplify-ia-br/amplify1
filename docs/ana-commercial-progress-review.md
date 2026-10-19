# Ana — qualificação completa com pendências e continuidade

13/10/2026. Implementação sobre `d765e5b0420fd0b6bd281a1ee318477f71de07cb`, branch `fix/ana-conversation-progress`, PR #14. Base remota reconferida: `staging=912898cb703bad7c8d2e5f6ccaf3eb2307125823`. Candidata `eb60550` preservada, sem merge integral.

## Decisão aprovada

Qualificação completa, mas não respostas obrigatórias: perguntar apenas o que falta investigar; aceitar desconhecimento ou recusa de um dado; registrar a resposta internamente; continuar sem insistência ou explicações artificiais sobre o time investigar depois. Desconhecimento/recusa de dados não equivale a consentimento de contato. Nenhum campo universal de faturamento, porte, setor ou volume foi criado.

O playbook `okf/internal/lead-qualification.md` orienta a coleta organizacional: pessoa, organização/contexto, motivo, área/público, uso atual de IA, resultado esperado, restrição, prazo, decisão/contratação e próximo passo. O próximo passo de contato é registrado após autorização explícita, separada da coleta do canal. Nome continua opcional na conversa; desconhecimento/recusa pode deixar pendência também de identidade. Um canal válido e autorização continuam necessários ao handoff.

`ANA_MASTER.md` não está versionado nesta candidata; a cópia local da candidata preservada descrevia critérios mais simples. Não foi alterada. A decisão desta entrega está registrada aqui, sem alterar OKF factual ou carregar documentos internos na recuperação pública.

## Causas e correções

| Relato | Causa demonstrada antes da correção | Implementação |
| --- | --- | --- |
| Necessidade → nome → reinício | Necessidade persistia; resposta imediata confundia ausência de próxima pergunta com ausência de contexto. | Retomada contextual após o nome, sem reabrir descoberta. |
| L.E.I.A. para escritório | Fato escolar fabricado para processos empresariais; catálogo recuperado não delimitava recomendação. | Contexto operacional neutro; elegibilidade derivada; instrução e guardrail de recomendação; fallback filtra documento escolar fora do contexto, preservando explicações explicitamente pedidas. |
| Linguagem artificial / estagnação | Vocabulário de política nas instruções e ausência de validação da pergunta selecionada. | Retirada de “vencedor/desempate”; objetivos conjuntos mantidos; avaliador e guardrail compartilham verificação da pergunta recomendada. Não inventar qualificação quando nenhuma pergunta é necessária. |
| Contato sem organização | Completude limitada a necessidade, desafio e prazo; extração organizacional centrada em escolas. | Entrevista comercial separada de cobertura factual; reconhecimento de empresa/escritório; pendências não bloqueiam automaticamente a entrevista. |

A primeira rodada de 25 testes novos, executada antes da implementação, teve **1 PASS / 24 FAIL** (`.ana-eval/commercial-before.json`). A reprodução usou respostas históricas ou sintéticas identificadas e estado local, não geração paga.

Também corrigidos, com regressões: “não sei minhas prioridades” não vira prazo desconhecido; “não sei” sobre faixa escolar/internet não vira incompatibilidade; prazo ou objetivos conjuntos não viram nome de empresa; descrição “empresa pequena/escola particular” não vira identidade organizacional.

## Estado e compatibilidade

- `qualification.answers` é opcional no JSON existente. Por campo: `provided`, `unknown` ou `declined`; resposta e, na extração de trechos, `sourceText` preservam evidência textual limitada. O histórico canônico mantém a mensagem completa.
- Informação posterior substitui a pendência. Fatos legados continuam disponíveis. Um adiamento legado sem texto original é marcado `legacy`, sem inventar uma citação ou atribuir uma recusa específica.
- `organizationalOpportunity` identifica a trilha B2B; `nextStep` registra o contato autorizado. Campos e chaves de pergunta são aditivos; não há nova API, tabela ou migration.
- `qualified` indica entrevista percorrida com aderência não contradita; não garante que todos os dados sejam conhecidos. `qualificationScore` mede fatos conhecidos. O Ana Lab explicita essa diferença no rótulo, sem redesenho de interface.
- Requisitos escolares desconhecidos não viram `true`; incompatibilidades confirmadas continuam bloqueando a qualificação da respectiva trilha. Objetivos múltiplos e diagnóstico para descobrir prioridades continuam válidos.
- Contato informado em resposta a uma pergunta de canal, sem autorização anterior, não concede consentimento. Recusa de um dado comercial isolado não revoga nem concede consentimento de contato.
- Persistência usa o mesmo JSON, resumo e mecanismos de sessão/gravação existentes. Não houve SQL, alteração de schema, RLS, credencial ou integração.

## Verificação

| Verificação | Resultado |
| --- | --- |
| `npm test -- --reporter=json --outputFile=.ana-eval/commercial-verified-vitest.json` | **405/405**, 37 arquivos; 349 anteriores + 56 novos |
| `npm run lint` | PASS |
| `npm run build` | PASS; validação OKF 20 documentos / 7 públicos |
| `npx vite-node scripts/evaluate-ana-progress.ts --output=.ana-eval/commercial-verified-offline.json` | **74/74**, incluindo sequências multiturmo sem LLM |
| Replay das 148 respostas históricas com rede bloqueada | **0 falhas de estado**; 35 textos rejeitados segundo a política atual, detalhados abaixo |
| Integridade dos relatórios históricos | **34/34** hashes preservados |
| `npx tsc --noEmit --project tsconfig.app.json` | 10 erros preexistentes, idênticos por arquivo/código/mensagem ao baseline `912898c`; nenhum novo |

O replay não é uma nova avaliação ao vivo. Os 35 textos antigos agora rejeitados se dividem em: 24 perguntavam prazo em vez de organização; 10 ofereciam contato antes do contexto comercial; 1 não realizava a nova pergunta de organização. Não foram alterados os resultados históricos. Dois falsos positivos iniciais da validação de oferta foram investigados; o detector passou a separar frases e distinguir descrição factual de recomendação, com teste específico.

Expectativas antigas atualizadas expressamente: organização antes de prazo/contato nos roteiros de consultoria; contexto organizacional também no programa escolar; “não sei” permite seguir, não paralisa a qualificação. Testes de handoff receberam contexto sintético suficiente e autorização explícita, preservando as verificações de confirmação técnica. Não se enfraqueceram testes de consentimento, preços, histórico canônico, sessão ou falha de persistência.

### Arquivos desta atualização

- Motor: `conversation.ts`, novo `qualification.ts`, `agent.ts`, `guardrails.ts`, `store.ts`.
- Avaliação: `evaluation.ts`, `reference-suite.ts`, `progress-suite.ts`, `progress-multiturn.ts`.
- Testes: novo `commercial-progress.test.ts`, `conversation.test.ts`, `progress.test.ts`, `agent-generation.test.ts`, `store.test.ts`.
- Ana Lab: `src/components/ana/AnaLab.tsx`, somente dois rótulos de diagnóstico.
- Este relatório. Todos os arquivos do motor/avaliação/testes ficam em `src/lib/ana`.

## Publicação: parada obrigatória antes do staging

Esta entrega atualiza o PR, **sem merge e sem deploy em staging/produção**. O push pode gerar Preview automático da Vercel; Preview não equivale a publicação no ambiente customizado staging nem a autorização para testá-lo com dados reais. A aprovação anterior de `d765e5b` não autoriza automaticamente o novo SHA.

Após autorização do SHA novo:

1. Reconferir PR, SHA, Preview correspondente, time `team_EPPengw4uFF2XNA17VBaQbkG`, projeto `prj_FYv1x3Iy6WCBIpK2fCexkRIej3Kl` e ambiente `staging` (`env_tJcvQCB3NDVq2iiLJOmFEAuA1gOD`).
2. Comprovar as URLs/identidade efetivas de persistência contra **Amplify Staging**, ref `bmohxahvlfinmxyczyqy`, sem imprimir segredos. A evidência histórica não substitui essa conferência. Se não houver acesso suficiente, parar antes do deploy.
3. Capturar o deployment ativo e aliases de staging e produção. Último staging documentado: `dpl_G1W4whERhpbs7yX7v7YJu5TUMgyc` (`d765e5b`). Manter também `dpl_jcar4RZ7i6YVvDCJCuvhxVBPEGYk` (`912898c`).
4. Usar `vercel redeploy <Preview do SHA autorizado> --target staging --scope team_EPPengw4uFF2XNA17VBaQbkG`. Exigir READY, `gitSource.sha`, `customEnvironment.id` e alias corretos. Não usar `--prod`, promoção ou rollback genérico.
5. Verificar Ana Lab, continuidade, fontes direct/MCP, sessão, persistência e consentimento. Reproduzir os quatro relatos, aceites de explicação, objetivos conjuntos, desconhecimento/recusa e os dois guardrails anteriores. Somente sessões sintéticas; nenhum envio comercial externo.
6. Em falha crítica, interromper chamadas e executar redeploy do ponto de retorno capturado com `--target staging`. É reconstrução, não rollback instantâneo. Conferir READY/SHA/alias, sem apagar as sessões sintéticas. Se o retorno falhar, reportar e não alterar infraestrutura.

URL de staging existente (ainda sem esta atualização): https://aplify-site-env-staging-leonardocamacho-7240s-projects.vercel.app/lab/ana

## Custos e limitações

Ledger original preservado: `/Users/leonardocamacho/Aplify-site-staging/.ana-eval/budget.json`, **776 entradas**, limite **US$ 5**, comprometido **US$ 4,937242845**. Nenhuma chamada de inferência paga, nova reserva ou liberação de reserva nesta entrega. Testes pessoais fora do executor não são automaticamente contabilizados nesse ledger.

Novas chamadas reais dependem de autorização específica, reconciliação comprovada e reserva conservadora para todas as tentativas/rotas antes de cada turno. Não renovar automaticamente os US$ 0,50 anteriores. Sem saldo, publicar somente após autorização do SHA e registrar homologação ao vivo pendente.

Extração e guardrails continuam determinísticos e baseados em padrões: cobrem as regressões e variações testadas, não certificam toda interpretação semântica possível. Naturalidade e frequência/custo de retries precisam de homologação real. Não houve auditoria SQL independente de staging nesta etapa. Produção continua bloqueada para esta entrega; exige homologação, avaliação humana e autorização separada.

Skills aplicadas: Vercel Deployments & CI/CD (identidade de release e autorização por ambiente) e Supabase (compatibilidade JSON, isolamento e preservação da persistência sem migrations).
