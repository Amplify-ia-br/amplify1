# Ana: continuidade após escolha de uma frente

Data: 13/10/2026. Escopo: staging, sem migrations ou mudanças no OKF.

## Base e isolamento

Base confirmada no deployment ativo de staging: `e760b91783fe4ec0eea2a9d8c4817e7d7028c52b`.
Projeto Vercel: `leonardocamacho-7240s-projects/aplify-site`.
Ambiente: `staging`, vinculado à branch `staging`; produção usa `main`.
O candidato mais amplo `eb60550` não foi incorporado. Arquivos locais alheios a esta correção foram preservados em seus worktrees.

## Causas e correção

- O reconhecimento de prioridade cobria poucas formas de pergunta e não tratava escolhas após convites para aprofundar uma oferta. Agora a escolha explícita preenche `qualificationFocus` e um convite aceito exige explicação, sem repetir a escolha.
- “Podemos começar” era tratado como avanço comercial; “começar” na pergunta anterior podia transformar a escolha em prazo. Escolha de tema, prazo e contratação agora têm verificações distintas. Escolher tema não concede consentimento.
- O extrator não reconhecia “Eu me chama Leonardo”. Também usava um nome já conhecido para concluir que qualquer resposta posterior respondia à pergunta de nome. A variante é reconhecida; perguntas concretas não são interceptadas pelo cumprimento.
- A diretriz comercial podia substituir uma explicação solicitada por uma pergunta. A resposta solicitada tem precedência, preservando a proibição de antecipar contato/agendamento sem qualificação.
- Afirmações descritivas anteriores à pergunta eram contadas como perguntas feitas (por exemplo, mencionar séries escolares). A seleção da próxima pergunta agora considera apenas os trechos interrogativos, mantendo o histórico exibido.
- A orientação de geração usa divulgação progressiva: cerca de 120 palavras na primeira explicação, preservando ressalvas e informações relevantes, sem truncamento automático.
- O teste ao vivo detectou duas perguntas no cumprimento fixo. Foi removido “Tudo bem?”; os testes passaram a exigir uma única pergunta, sem relaxar o guardrail.

## Regressão reproduzível

```sh
npm test
npx vitest run src/lib/ana/continuity.test.ts
npm run lint
npx tsc --noEmit
npm run build
```

`continuity.test.ts` contém replay completo, extração de nome, pergunta institucional, escolha do L.E.I.A., mudança para consultoria, continuidade da qualificação, recusa, ambiguidade e separação entre escolha e contratação. Inclui resposta anterior real da Ana e variações de convites observadas nos testes ao vivo. As fixtures sintéticas estão identificadas.

| Verificação | Resultado |
| --- | --- |
| Testes existentes antes da mudança | 264/264 |
| Primeiro conjunto novo contra o baseline | 14 falhas em 21 testes, reproduzindo os defeitos |
| Suíte completa final | 289/289, incluindo 25 testes novos |
| Lint, TypeScript, diff check | PASS |
| Validação OKF e build | PASS |
| Rodada ao vivo final, dois modelos | 10/10 verificações |

## Avaliação ao vivo

Modelos existentes: `openai/gpt-5.4-mini-fast` e `google/gemini-3.1-flash-lite`.
Por modelo: um replay com convite controlado e uma conversa de quatro turnos alimentada pelas respostas reais anteriores do próprio modelo. Ambas registraram `qualificationFocus: leia` e responderam sobre o produto sem repetir a seleção. Sem fallback na rodada final.

As rodadas exploratórias encontraram convites não reconhecidos (“posso detalhar primeiro…”, “qual dessas frentes faz mais sentido?” e escolha de prioridade após explicar ambas). Foram incluídos na regressão antes da rodada final; os relatórios iniciais não foram descartados.

Relatórios locais da execução: worktree de avaliação `Aplify-site-staging/.ana-eval/continuity-live{,-v2,-v3}.json`. São artefatos locais, não credenciais nem arquivos publicados. O executor usa o mesmo controle cumulativo de US$ 5 da avaliação anterior, com reserva antes de cada chamada e conciliação de cobrança. Nenhuma ação comercial ou persistência de lead é executada por esse harness.

## Limitações

- Os testes ao vivo são amostrais e não certificam todas as formulações possíveis. O controlador mantém a arquitetura baseada em regras.
- As explicações finais observadas tiveram 121 e 124 palavras; 120 é orientação de concisão, não corte rígido. Não foi estabelecida uma comparação estatística de tamanho ou latência.
- Build tem avisos de Browserslist desatualizado e anotações de dependência Zod, sem falha.
- Esta correção não libera o candidato amplo anterior, não aplica migrations e não altera produção.
