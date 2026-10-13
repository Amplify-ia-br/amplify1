# Ana: revisão pré-homologação controlada

13/10/2026. Revisão sobre `f888da6`, branch `fix/ana-conversation-progress`. `git fetch origin` e `git ls-remote` confirmaram `origin/staging=912898cb703bad7c8d2e5f6ccaf3eb2307125823`, sem novidades desde o baseline. A candidata `eb60550` não será mesclada.

## Diagnóstico antes do ajuste

As quatro reprovações de `candidate-live-final.json` foram revisadas junto das repetições já existentes. Nenhuma avaliação histórica foi reescrita. Um manifesto SHA-256 dos arquivos está em `.ana-eval/pre-review-evidence-hashes.json`.

1. **Plano de infraestrutura em lugar da pergunta recomendada:** falha real de geração/guardrail. O controlador recomendava nome opcional, mas o modelo perguntou por Standard/Silver/Gold. A validação de produção aceitou a resposta, embora o avaliador a rejeitasse. Estado e recuperação não falharam. As duas repetições históricas passaram, o que impede atribuir causalmente a variação ao patch; a lacuna de validação, contudo, é reproduzível sem LLM.
2. **Resposta incompleta após recusa:** falha real de geração/guardrail. Estado continha estudantes e processos, consentimento revogado e nenhuma pergunta recomendada. A recuperação trouxe `leia` e `portfolio`. A resposta explicou apenas o programa educacional e sua implantação, omitindo consultoria/operação. Não há evidência para alterar o OKF ou a recuperação. A ausência de validação da cobertura pedida é reproduzível.
3. **Explicação sem a palavra “diagnóstico”:** falso positivo lexical neste texto específico. A resposta explicou contexto, avaliação de oportunidades, desenho e implantação. O resultado original continua FAIL; não será recalculado como PASS.
4. **“Problemas reais” identificado como preço:** falso positivo lexical, sem valor monetário. O guardrail monetário já diferencia palavras comuns de valores. Não será enfraquecido nem será removido o critério histórico.

Antes de alterar o motor, 11 novos testes determinísticos com respostas gravadas produziram **6 PASS / 5 FAIL**: as duas respostas inválidas passavam pela validação, não acionavam retry e a resposta incompleta persistia mesmo após duas tentativas simuladas. Nenhuma chamada paga foi realizada.

## Ajuste delimitado

- Fazer valer a regra existente de pergunta recomendada quando esta for o nome, preservando a opção de não perguntar nome.
- Derivar apenas para o turno atual a necessidade de cobrir estudantes e operação quando a pessoa retoma uma pergunta geral de como a Amplify pode ajudar e ambas as necessidades já estão conhecidas. Uma pergunta posterior sobre uma frente específica não exige repetir as duas.
- Validar a cobertura mínima somente quando os dois documentos já foram recuperados. Reutilizar retry e fallback existentes, sem nova chamada adicional ou orçamento automático.
- Não acrescentar campo obrigatório, mudar completude comercial, consentimento, persistência, OKF ou `ANA_MASTER.md`.

## Resultados desta revisão

| Verificação sem geração paga | Resultado |
| --- | --- |
| `npm test -- --reporter=json --outputFile=.ana-eval/pre-staging-verified-vitest.json` | **349/349**, incluindo 336 anteriores e 13 novos |
| `npm run lint` | PASS |
| `npm run build` / validação OKF | PASS; 20 documentos, sete públicos |
| `npx vite-node scripts/evaluate-ana-progress.ts --output=.ana-eval/pre-staging-verified-offline.json` | **74/74**, sem geração de LLM |
| Replay das 148 respostas históricas, com rede bloqueada | Zero falhas de estado; zero respostas anteriormente PASS rejeitadas pelos novos guardrails |
| Respostas reais de infraestrutura e omissão operacional | Ambas agora rejeitadas; retry e fallback verificados com modelo simulado |
| Integridade dos relatórios | **34/34** arquivos históricos com hashes originais preservados |
| `git diff --check` | PASS |
| `npx tsc --noEmit --project tsconfig.app.json` | Mesmos dez erros preexistentes; nenhum novo |

O replay histórico verifica decisões sobre textos já observados, não gera novos textos e **não transforma 144/148 em uma nova taxa ao vivo**. A evidência ao vivo continua sendo a rodada anterior e suas repetições. A taxa real de correção pelo retry e seu custo incremental só poderão ser medidos após autorização para novas chamadas.

Os erros de tipos preexistentes estão em `content.config.ts`, `ana/agent.test.ts`, `ana/http.ts`, `ana/retrieval.ts`, `ana/store.ts`, `leia/mailer.test.ts` (três), `okf/service.ts` e `_AmplifyDayInvitations.tsx`. Não foram corrigidos fora deste escopo. Build também mantém avisos preexistentes de Browserslist e anotações de dependências.

## Arquivos e isolamento

Nesta revisão, somente:

- `src/lib/ana/conversation.ts`: escopo opcional derivado da resposta atual; não é campo comercial persistido.
- `src/lib/ana/agent.ts`: explicita esse escopo na instrução de geração.
- `src/lib/ana/guardrails.ts`: duas validações adicionais; nenhuma regra removida ou relaxada.
- `src/lib/ana/pre-staging.test.ts`: 13 testes com respostas gravadas, recuperação local e geração simulada.
- `docs/ana-staging-review.md`: diagnóstico, evidências e condições de homologação.

O diff cumulativo do PR inclui a correção de continuidade anterior e seus testes/avaliadores, totalizando 15 arquivos. Não contém mudanças em OKF factual, `ANA_MASTER.md`, banco, migrations, infraestrutura, dependências, interface ou fluxos externos. `eb60550` e os três documentos locais não rastreados da candidata foram preservados; não houve merge integral.

## Custos

Ledger original: `/Users/leonardocamacho/Aplify-site-staging/.ana-eval/budget.json`. Limite mantido em **US$ 5**, 773 entradas, sem reinicialização.

- Antes: US$ 4,58251292 entre custos e reservas.
- Uma reserva de US$ 0,0861795 reconciliada para recibo confirmado de US$ 0,00132225.
- Depois: **US$ 4,49765567** entre custos e reservas.
- Parcela confirmada: US$ 2,23849127.
- Reservas conservadoras remanescentes: US$ 2,25916440, mantidas por falta de evidência para liberá-las.
- Margem contábil: US$ 0,50234433, **não é autorização para gastar**.
- Novas gerações nesta revisão: **zero**. Apenas consulta de cobrança já existente.

Evidências locais: `.ana-eval/budget-before-review.json`, `budget-review-reconciliation.json`, `pre-review-evidence-hashes.json`, `pre-staging-archival-replay.json` e relatórios de teste citados. Estes arquivos permanecem fora do Git; o relatório e os testes reproduzíveis estão no PR.

## PR e controle de publicação

Base: `staging`; head: `fix/ana-conversation-progress`; preparar como **draft**, sem auto-merge. O SHA exato de entrega é o `headRefOid` verificado após o push, informado junto da URL do PR. Se esse SHA mudar, a autorização de deploy deve ser revalidada.

A inspeção de CI/CD foi somente leitura. O projeto correto é `aplify-site` (`prj_FYv1x3Iy6WCBIpK2fCexkRIej3Kl`), time `team_EPPengw4uFF2XNA17VBaQbkG`. A configuração da Vercel associa produção a `main` e o ambiente customizado `staging` exclusivamente à branch `staging`. O push da branch de trabalho pode disparar Preview automático; não promove nem altera staging/produção. Nenhuma configuração foi modificada. O único workflow GitHub existente roda em `main`, não oferece uma barreira automatizada de testes para este PR em staging; por isso os resultados locais e a aprovação explícita são necessários.

## Prontidão e próximos passos autorizáveis

**Pronta para revisão do PR e autorização de homologação controlada; ainda não homologada.** Parar antes de merge/deploy para staging ou produção.

Depois de autorização explícita para o SHA e para consumo de LLM:

1. Publicar somente no ambiente staging e conferir no provedor projeto, ambiente e SHA exato antes de testar. Se um merge produzir outro SHA, verificar novamente o conteúdo testado e pedir autorização para a nova identidade.
2. No Ana Lab, reproduzir os aceites de explicação escolar, diagnóstico com prioridades desconhecidas, três processos juntos, Carlitos com objetivos iguais e qualificação suficiente em formato livre.
3. Acrescentar as duas reprovações reais: proposta sem escolher infraestrutura prematuramente e recusa seguida de resposta que cubra estudantes e operação.
4. Verificar sessão/histórico canônico, estado, próximos campos, consentimento/recusa, ausência de repetição, recuperação direta e MCP dos documentos públicos esperados. Confirmar que nenhuma ação comercial foi alegada sem confirmação técnica.
5. Registrar respostas, retries/fallback, custos e SHA. Não aplicar migrations, SQL ou ajustes de infraestrutura. O endpoint normalmente persiste conversas de teste; confirmar o uso dessas sessões antes do smoke, sem tratar isso como autorização para editar dados existentes.

### Pendências para produção

- Autorização de deploy staging e autorização separada de consumo para smoke/avaliações; nenhuma implícita neste PR.
- Homologação no deployment do SHA exato, incluindo UI, transporte, persistência e MCP reais; esses caminhos não foram exercitados ao vivo nesta revisão.
- Verificação da frequência/custo dos novos retries. Validações de intenção/cobertura por padrões têm limites e não certificam semântica integral.
- Revisão dos dez erros de tipos preexistentes e definição de uma barreira de CI para staging, se requerida pela política de release — fora deste patch e sem mudança automática de infraestrutura.
- Revisão humana do resultado e autorização explícita para eventual produção. A melhora histórica e o replay offline não equivalem à aprovação de release.
