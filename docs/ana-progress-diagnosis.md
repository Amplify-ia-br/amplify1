# Ana: diagnóstico anterior às correções de progresso

13/10/2026. Base local e remota confirmada via `git rev-parse` e `git ls-remote`: `912898cb703bad7c8d2e5f6ccaf3eb2307125823`.
Branch isolada: `fix/ana-conversation-progress`. Candidata `eb60550` preservada.

Antes de modificar o motor: suíte existente **289/289**. Novas fixtures dos diálogos e casos negativos em `progress-suite.ts`/`progress.test.ts`: **6/23 passaram, 17 falharam**. Os dez pontos de replay dos diálogos reais falharam. Execução: `npx vitest run src/lib/ana/progress.test.ts`.

## Causas demonstradas no controlador

1. Compreensão/compromisso: `acceptedAssistantOffer` só reconhece o verbo imediatamente depois de “posso (te)”. “Posso seguir a partir daí e te explicar” não é reconhecido. Os prefixos “ok” e “Legal! Me explique” também escapam. O aceite indevidamente aceita “sim, mas antes quanto custa?”, mostrando que expandir apenas os sinônimos não basta.
2. Compreensão de nome: a captura de “Meu nome é Carlitos e eu sou dono...” inclui a descrição do negócio e a validação descarta tudo. A memória não recebeu o nome correto.
3. Compreensão de escopo: `businessChallenge` só é preenchido em resposta a formatos estreitos de pergunta. Processos explicitados espontaneamente (atendimento, chamados, cobrança) não satisfazem o campo existente. Não há necessidade de um novo campo obrigatório.
4. Política comercial: pedido explícito de diagnóstico/orçamento pode não ativar `advancementIntent`. O motor não chega à próxima pergunta necessária. O objetivo legítimo de descobrir oportunidades no diagnóstico tampouco é representado como problema motivador.
5. Estado/política: `qualificationFocus = multiple` representa ofertas de naturezas diferentes, mas pode ser usado para “ambos” dentro de uma única consultoria. Isso pode introduzir indevidamente requisitos escolares. Objetivos e áreas do mesmo trabalho precisam manter a trilha original.
6. Geração: quando não há próxima pergunta, a diretriz de `disclosure` manda fazer uma pergunta aberta. Ela conflita com a regra global de não inventar perguntas e deixa o modelo continuar o interrogatório. O guardrail não valida esse desvio.
7. Suficiência: a proteção por histórico de perguntas evita parte das repetições, porém não comprova que a informação foi resolvida. A próxima ação precisa usar os fatos existentes e a finalidade do pedido. Uma ausência legítima de prioridade não deve eliminar os requisitos comerciais realmente existentes, como prazo.

## Limites da evidência

Os replays reproduzem decisões determinísticas usando as falas anteriores fornecidas pelo usuário; ainda não equivalem a uma execução multiturmo com respostas novas de modelos. As falhas da redação atribuídas ao modelo serão avaliadas ao vivo com respostas reais, sem declarar causa exclusivamente de memória.

## Escopo de correção

Evoluir `conversation.ts` e `agent.ts`, com proteção em `guardrails.ts` e avaliações reutilizadas seletivamente de `eb60550`. Preservar os critérios de completude existentes. Prioridades operacionais desconhecidas podem integrar a finalidade de um diagnóstico; múltiplas ofertas sem escolha continuam seguindo as regras vigentes. Sem mudanças no ANA_MASTER, OKF, migrations, persistência atômica ou publicação.

## Achado multiturmo após a primeira correção, antes do ajuste final

A rodada completa da primeira correção passou em 141/148 checks. No cenário de diagnóstico com Gemini, o turno de prioridades desconhecidas passou no baseline e falhou na correção. Duas rodadas adicionais de cada motor reproduziram a diferença nesse turno: baseline 2/2 PASS; correção 0/2 PASS.

Causa-raiz: `isBusinessChallengeQuestion` procurava o padrão em toda a resposta anterior, sem exigir uma pergunta. Uma explicação com “qualquer implementação”, “desafios” e “IA” satisfazia a expressão. A nova indicação de resposta indisponível era ativada mesmo com `businessChallenge` já preenchido, suprimindo indevidamente a próxima pergunta de prazo. Não é falha de memória nem flutuação isolada do modelo. Dois testes determinísticos foram adicionados antes do ajuste: um com o trecho real da explicação e outro com um desafio já suficientemente respondido.

Os dois testes falharam antes do ajuste e foram corrigidos exigindo pergunta real e pendência efetiva. A informação já persistida também resolve a pendência quando o histórico é parcial.

Educação infantil apresentou piora amostral no Gemini: baseline 2/3 PASS, primeira correção 0/3 PASS. As respostas pediam nome mesmo com `shouldAskQuestion=false`, ou caíam em fallback após rejeições. A diretriz final de `nurture` proibia apenas pergunta “comercial”, ambiguidade em relação ao nome. Foi explicitada a decisão existente de não perguntar nada nesse turno, sem alterar elegibilidade ou critérios comerciais. A hipótese será reavaliada ao vivo; os resultados anteriores não serão substituídos.
