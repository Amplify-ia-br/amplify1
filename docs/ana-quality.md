# Qualidade da Ana

A Ana usa o histórico persistido no servidor como memória canônica. O navegador envia somente a mensagem nova, e o servidor cria os identificadores das mensagens. Cada conversa fica vinculada a uma sessão anônima assinada em cookie `HttpOnly`, impedindo que o simples conhecimento do UUID dê acesso ao histórico de outra pessoa.

Antes de uma resposta aparecer, o servidor valida o texto completo, tenta uma correção com outro modelo aprovado e, se necessário, usa uma resposta determinística baseada na documentação recuperada. Mensagens do usuário e da Ana são persistidas antes de serem consideradas concluídas em produção.

O rate limit é distribuído pelo Supabase e falha de forma fechada em produção. `ANA_SESSION_SECRET` pode ser definido como segredo dedicado; quando ausente, o servidor usa a credencial privada do Supabase com separação de domínio. Nenhum desses valores pode ser exposto ao navegador.

A migration de vínculo de sessão invalida, por segurança, a continuidade de conversas criadas antes desse controle. Depois da implantação, esses testes antigos devem começar por **Nova conversa**.

## Suíte de referência

`src/lib/ana/reference-suite.ts` contém 50 conversas que cobrem abertura, L.E.I.A., portfólio, fluxo comercial e segurança. Os cenários validam o controlador em todos os testes do projeto.

```bash
npm run test:ana
```

## Avaliação ao vivo

O runner ao vivo testa as mesmas conversas nos modelos aprovados. Sem `--live`, ele não chama provedores nem consome créditos.

```bash
npm run ana:eval
npm run ana:eval -- --live
```

Por padrão, a execução ao vivo faz três rodadas com `openai/gpt-5.4-mini-fast` e `google/gemini-3.1-flash-lite`. Para uma rodada ou categoria específica:

```bash
npm run ana:eval -- --live --runs=1 --category=leia
```

O comando termina com erro se uma resposta violar as regras, cair no fallback determinístico ou falhar nos critérios do cenário. O relatório registra retentativas e o modelo efetivamente usado.
