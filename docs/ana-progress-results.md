# Ana: continuidade e progresso conversacional

## Identificação e escopo

- Repositório: `Amplify-ia-br/amplify1`.
- Base confirmada localmente e no remoto antes das alterações: `origin/staging`, `912898cb703bad7c8d2e5f6ccaf3eb2307125823`.
- Branch isolada: `fix/ana-conversation-progress`.
- Worktree: `/Users/leonardocamacho/Aplify-site-ana-progress`.
- Candidata anterior preservada: `eb60550cdc4dee6c9746db0fa3771bdd2acb05a4`, sem merge integral.
- Diagnóstico anterior às correções: [ana-progress-diagnosis.md](ana-progress-diagnosis.md).

O escopo é o motor próprio em `src/lib/ana`. Não foram modificados in.bot, voz, interface, OKF, `ANA_MASTER.md`, schema, migrations ou persistência. Não houve publicação nem execução de encaminhamento comercial.

## Alterações

O controlador existente continua sendo a única fonte de decisão. O estado opcional distingue objetivos combinados, prioridades desconhecidas e respostas temporariamente indisponíveis; nenhum desses registros se tornou requisito comercial.

1. Aceites como “ok quero sim” e “Legal! Me explique então” retomam a explicação oferecida, sem iniciar qualificação ou presumir requisitos escolares/consentimento.
2. Nomes fornecidos junto da descrição do negócio são preservados, assim como respostas contextuais anteriores.
3. Processos e problemas explicitados fora do questionário satisfazem o campo de desafio existente. Buscar um diagnóstico para descobrir oportunidades não exige inventar uma prioridade.
4. Vários objetivos dentro da mesma consultoria não se tornam múltiplas ofertas. O fluxo comercial de múltiplas ofertas e os critérios escolares permanecem existentes.
5. Um prazo desconhecido permanece pendente sem insistência nem qualificação artificial. Uma mensagem fora do assunto não é armazenada como prazo; uma resposta posterior pode resolver a pendência.
6. A geração recebe somente a próxima pergunta recomendada. Guardrails verificam desvio da explicação prometida e insistência em desempatar objetivos.

Reutilização seletiva de `eb60550`: avaliadores e seus testes, estrutura de avaliação multiturmo e contabilização conservadora de chamadas. Foram adaptados ao schema da base, sem importar o motor completo, migrations ou uma segunda camada de memória/decisão. O runner original e os 50 cenários originais foram preservados; apenas o tipo de cenário ganhou expectativas opcionais de qualificação.

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `src/lib/ana/conversation.ts` | Compreensão, fatos opcionais, suficiência e seleção da próxima ação |
| `src/lib/ana/agent.ts` | Diretrizes de geração coerentes com a decisão do controlador |
| `src/lib/ana/guardrails.ts` | Validação de explicação e prioridades já resolvidas |
| `src/lib/ana/reference-suite.ts` | Tipo opcional `expectedQualification`; cenários intactos |
| `src/lib/ana/progress-suite.ts` | Dez checkpoints dos diálogos reais |
| `src/lib/ana/progress-multiturn.ts` | Cinco sequências, 14 turnos avaliados por modelo |
| `src/lib/ana/progress.test.ts` | 39 testes de regressão e casos negativos |
| `src/lib/ana/evaluation.ts`, `evaluation.test.ts` | Avaliadores reutilizados seletivamente e oito testes |
| `scripts/evaluate-ana-progress.ts` | Comparação baseline/correção, offline/live, orçamento compartilhado |
| `.gitignore` | Ignora evidências locais `.ana-eval/` |
| `docs/ana-progress-diagnosis.md`, `ana-progress-results.md` | Causas-raiz e resultados |

## Verificação determinística

| Verificação | Baseline | Correção |
| --- | ---: | ---: |
| Suíte existente | 289/289 | 289/289 |
| Novos testes iniciais de reprodução | 6/23 | 23/23 |
| Suíte final completa | — | 336/336 |
| Avaliação offline (50 originais + dez replays + 14 turnos) | 54/74 | 74/74 |

Zero regressões determinísticas observadas. As avaliações offline não geram respostas de modelos: 52 respostas do baseline e 46 da correção ficam sem checagem de geração. Elas verificam estado e respostas imediatas, não naturalidade.

Comandos: `npm test`, `npm run lint`, `npm run build`, `git diff --check` e `npx vite-node scripts/evaluate-ana-progress.ts` com `--engine-root` para alternar o motor.

Build e lint passaram. A checagem efetiva `npx tsc --noEmit --project tsconfig.app.json` encontrou os mesmos dez erros preexistentes nos dois worktrees, sem novos erros: importação `astro:content`, fixture de `agent.test.ts`, `finishReason` em `http.ts`, tipo de IDs em `retrieval.ts`, overload em `store.ts`, três erros em `leia/mailer.test.ts`, importação em `okf/service.ts` e tipo `Lead` na página administrativa. Não foram alterados arquivos fora do escopo para mascarar esses erros.

## Avaliação ao vivo

Comparação pareada: mesmos 74 checks por modelo, `openai/gpt-5.4-mini-fast` e `google/gemini-3.1-flash-lite`, mesma documentação local. Após cada seed fixo, os turnos seguintes usam respostas realmente geradas, não respostas roteirizadas. O runner conserva os critérios lexicais originais, registra falhas por camada, retries, fallback e IDs de cobrança; não certifica semântica integral.

O baseline completo passou em **98/148**. A primeira correção passou em **141/148**, com sete checks falhando; três tinham passado no baseline. Todos os sete pares cenário/modelo foram repetidos duas vezes em cada motor, sem descartar os resultados iniciais.

| Investigação da primeira rodada | Duas rodadas adicionais | Conclusão/ação |
| --- | --- | --- |
| Gemini: diagnóstico, turno de prioridades desconhecidas | Baseline 2/2; correção 0/2 nesse turno | Regressão real, reproduzida em testes e corrigida: texto explicativo não é pergunta; campo resolvido não é pendência |
| Gemini: educação infantil | Baseline 1/2; correção 0/2 | Piora amostral com perguntas indevidas/fallback; diretriz final passou a explicitar a decisão já existente de não perguntar |
| Gemini: descrição sem preço | Baseline 0/2; correção 0/2 | Falso positivo lexical: “problemas reais”, sem valor monetário; critérios brutos mantidos |
| OpenAI: pista da página L.E.I.A. | Ambos 0/2 | Limitação preexistente: resposta institucional sem a menção exigida à oferta da página |
| OpenAI: educação infantil | Baseline 1/2; correção 0/2 | Mesma ambiguidade de geração investigada e diretriz reforçada |
| OpenAI: qualificação em formato livre | Baseline 2/4; correção 3/4, contando dois turnos por rodada | Controlador corrigido; alerta residual na realização da pergunta de consentimento. Na primeira rodada a pergunta era semanticamente reconhecível, mas não pelo matcher; em uma repetição virou oferta condicional sem interrogação |
| Gemini: recusa de contato | Baseline 0/2; correção 2/2 | Oscilação de geração em perguntas genéricas; sem nova autorização ou encaminhamento de contato |

Após os ajustes, foram repetidas duas rodadas nos dois modelos: diagnóstico **12/12 turnos PASS** e educação infantil **4/4 PASS**. Os testes do controlador continuam preservando os requisitos de prazo, elegibilidade e consentimento.

### Rodada completa da versão final

| Grupo (dois modelos) | Baseline | Versão final |
| --- | ---: | ---: |
| 50 cenários originais por modelo | 92/100 | 97/100 |
| Dez replays reais por modelo | 0/20 | 20/20 |
| 14 turnos reais por modelo | 6/28 | 27/28 |
| Total bruto | **98/148** | **144/148** |

As expectativas de estado do controlador passaram nos 148 checks finais. O único FAIL multiturmo final é lexical: a explicação descreve o processo, mas não repete literalmente “diagnóstico”. Os quatro FAILs brutos finais são mantidos:

1. OpenAI, pedido de proposta: perguntou por plano de infraestrutura em vez da pergunta de nome recomendada. Desvio real de geração, embora sem solicitar contato ou registrar consentimento.
2. OpenAI, recusa seguida de pergunta: respondeu sobre estudantes/L.E.I.A., mas omitiu a frente de operação/consultoria pedida. Resposta incompleta.
3. OpenAI, três processos no diagnóstico, turno 3: não repetiu a palavra “diagnóstico”; revisão da resposta identifica uma explicação do processo. Alerta lexical.
4. Gemini, descrição sem preço: “problemas reais” foi capturado pela proibição literal de “reais”; não houve valor monetário. Alerta lexical.

Todos passaram no baseline dessa rodada e foram repetidos duas vezes por motor, sem modificar o código ou os critérios entre as repetições:

| Caso final | Baseline: duas repetições | Correção: duas repetições | Interpretação |
| --- | ---: | ---: | --- |
| Pedido de proposta | 2/2 | 2/2 | Desvio observado na rodada completa não se repetiu; evidência insuficiente para atribuí-lo causalmente ao patch |
| Recusa seguida de pergunta | 2/2 | 2/2 | Omissão observada não se repetiu; continua documentada como risco de geração |
| Três processos, sequência completa | 1/6 | 5/6 | Turnos de progresso corrigidos. No turno explicativo, ambos tiveram uma falha lexical por omitir “diagnóstico” |
| Descrição sem preço | 2/2 | 0/2 | “Problemas reais” continuou disparando o matcher, sem preço informado |

Não há declaração de zero regressões ao vivo nem de homologação para publicação. Há zero regressões determinísticas, melhora consistente nos diálogos-alvo e desvios residuais de geração/avaliação explicitados. A versão final completa teve **zero fallbacks documentais** e 12 retries de qualidade, contra um fallback e 13 retries no baseline; isso não mede qualidade semântica integral.

Fingerprint SHA-256 dos arquivos TypeScript de Ana na versão final, idêntico nas avaliações offline e live: `6c7572fbdecf9019047dc2dfba8345fb9be2c5a2fe38d62b3a58d20bd412617a`. As avaliações foram executadas sobre o working tree isolado, com HEAD-base `912898c`; os relatórios identificam essa condição explicitamente.

Os relatórios locais ficam em `.ana-eval/`, fora do Git. `baseline-live-multi.json` é uma tentativa interrompida por reserva conservadora de orçamento, não uma rodada comparável completa. O teto cumulativo de US$ 5 foi preservado; reservas antigas foram reconciliadas com recibos confirmados, mantendo uma provisão para rotas não observadas.

Ao encerrar, o ledger compartilhado contabilizava US$ 4,582513 entre custos e reservas (abaixo do teto de US$ 5). Desta implementação: US$ 1,008728 confirmados, mais US$ 0,086180 ainda conservadoramente reservados para uma chamada sem recibo confirmado naquele momento. Não houve aumento de limite nem reinicialização de orçamento.

Evidências principais:

- `.ana-eval/vitest-final.json`: 336 testes aprovados.
- `.ana-eval/baseline-offline.json` e `candidate-offline-final.json`: comparação determinística.
- `.ana-eval/baseline-live-complete.json` e `candidate-live-final.json`: comparação completa, sem interrupção.
- `.ana-eval/candidate-live-complete.json`: primeira correção, preservada para auditoria.
- `.ana-eval/recheck-*-{baseline,candidate}.json`: repetições dos sete alertas iniciais.
- `.ana-eval/final-diagnostic-recheck.json` e `final-education-recheck.json`: validação dos ajustes.
- `.ana-eval/final-regression-recheck-*-{baseline,candidate}.json`: repetições dos quatro alertas finais.

## Reprodução

Executar no worktree isolado. A avaliação sem `--live` não faz chamadas pagas:

```sh
npm test
npm run lint
npm run build
npx vite-node scripts/evaluate-ana-progress.ts --output=.ana-eval/offline.json
npx vite-node scripts/evaluate-ana-progress.ts --engine-root=/Users/leonardocamacho/Aplify-site-ana-continuity --output=.ana-eval/baseline-offline.json
```

Para uma nova avaliação ao vivo, fornecer o caminho de credenciais já autorizado em `ANA_EVAL_ENV_FILE` e reutilizar o orçamento compartilhado existente (não criar outro ledger para contornar o teto):

```sh
npx vite-node scripts/evaluate-ana-progress.ts --live --env-file="$ANA_EVAL_ENV_FILE" --budget-dir=/Users/leonardocamacho/Aplify-site-staging/.ana-eval --output=.ana-eval/new-live.json
```

`--scenario=...`, `--suite=multiturn`, `--models=...` e `--runs=2` permitem repetir um caso. O runner retorna código 1 quando algum check falha e 2 em interrupção/configuração/orçamento; uma avaliação com FAIL não é confundida com falta de execução.

## Limitações

- Compreensão por regras e padrões não cobre toda formulação possível; testes demonstram os casos presentes, não compreensão geral de português.
- PASS lexical não equivale a qualidade semântica; FAIL lexical pode ocorrer sem erro comportamental. Resultados brutos e revisão precisam permanecer separados.
- Avaliação in-process não mede transporte HTTP, UI ou persistência real. Os testes existentes dessas camadas foram preservados; não foi executada migração ou teste comercial com contatos reais.
- A arquitetura de consentimento e persistência da base foi preservada, não substituída pela implementação mais ampla da candidata anterior.
- Política de prioridades entre ofertas distintas não foi redefinida. Nenhuma mudança em `ANA_MASTER.md`.
