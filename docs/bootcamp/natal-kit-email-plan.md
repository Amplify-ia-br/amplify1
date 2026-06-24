# Plano de e-mails Kit - Bootcamp IA para Negocios em Natal

Versao: 24/06/2026  
LP: https://amplify.ia.br/agenda/natal-23-07-26/cidade  
Evento: Bootcamp IA para negocios em Natal  
Data: 23 de julho de 2026  
Local: Bright Coworking Natal

## Objetivo

Transformar a LP em um funil de relacionamento com segmentos claros no Kit, separando quem apenas pediu programacao, quem demonstrou intencao de compra, quem pediu plano corporativo, quem comprou, quem compareceu e quem nao compareceu.

O papel dos e-mails nao e repetir a LP. Cada fluxo deve reduzir uma friccao especifica: entender valor, concluir compra, justificar internamente, preparar presenca ou transformar o evento em proxima conversa comercial.

## Mapa dos segmentos

| Segmento | Evento de entrada | Sequencia Kit | ID |
|---|---|---:|
| Interessado / pediu programacao | bootcamp_program_requested ou bootcamp_interest_captured | Bootcamp IA Natal - Programacao solicitada | 2805414 |
| Checkout sem compra | bootcamp_checkout_started ou bootcamp_checkout_clicked | Bootcamp IA Natal - Checkout sem compra | 2805415 |
| Plano corporativo | bootcamp_corporate_lead | Bootcamp IA para Negocios Natal - Corporativo | 2805401 |
| Participante confirmado | bootcamp_order_approved ou bootcamp_participant_confirmed | Bootcamp IA Natal - Participante confirmado | 2805416 |
| Compareceu | bootcamp_attended | Bootcamp IA Natal - Pos-evento compareceu | 2805417 |
| Inscrito ausente | bootcamp_missed | Bootcamp IA Natal - Inscrito ausente | 2805418 |

IDs atuais no Kit:

- `bootcamp_interest`: 2805414
- `bootcamp_checkout_abandoned`: 2805415
- `bootcamp_corporate`: 2805401
- `bootcamp_confirmed`: 2805416
- `bootcamp_attended`: 2805417
- `bootcamp_missed`: 2805418

## Regras de automacao

- Quando um lead entra em checkout, ele deve sair dos fluxos genericos de descoberta.
- Quando vira participante confirmado, ele deve sair dos fluxos de interesse, checkout, corporativo, patrocinio e lista de espera.
- O fluxo corporativo registra no Kit a mensagem de WhatsApp gerada na LP no campo `bootcamp_whatsapp_message`.
- A integracao com Sympla deve alimentar compradores, participantes, check-in e ausencia via `api/bootcamp-sync-sympla`.
- Lembretes D-3, D-1 e manha do evento devem ser tratados como broadcast operacional por data, nao como Sequence do Kit, porque Sequence usa atraso relativo a entrada do lead.

## Fluxo 1 - Interessado / programacao solicitada

### E-mail 1

Assunto: Aqui esta a programacao do Bootcamp IA em Natal  
Preheader: O roteiro para decidir se essa imersao faz sentido para voce.  
Delay: imediato

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Recebi seu pedido para ver a programacao do Bootcamp IA para negocios em Natal.

A imersao foi desenhada para quem precisa parar de testar ferramentas soltas e comecar a decidir, com metodo, onde a IA entra no negocio.

Em um dia presencial, vamos trabalhar diagnostico, priorizacao de casos de uso, desenho de rotinas e caminhos praticos para tirar a IA do improviso.

Se fizer sentido para voce, garanta sua vaga pelo Sympla. A turma e presencial e as vagas sao limitadas.

Leonardo Camacho  
Educador de IA e Head de Solucoes da Amplify

### E-mail 2

Assunto: O problema nao e falta de ferramenta de IA  
Preheader: O problema costuma ser falta de criterio para aplicar.  
Delay: 1 dia

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

A maioria das empresas ja tem gente usando IA. O que poucas tem e um metodo comum para decidir onde usar, como medir valor e quando nao usar.

Sem esse metodo, a IA vira uma sequencia de testes isolados: muita curiosidade, pouca mudanca real no trabalho.

O Bootcamp em Natal existe para criar esse criterio. Voce sai com repertorio, matriz de decisao e clareza para escolher aplicacoes com impacto em receita, produto, atendimento, operacao e gestao.

Se esse e o tipo de conversa que sua empresa precisa ter agora, a inscricao individual ja esta aberta.

### E-mail 3

Assunto: Por que fazer isso presencialmente  
Preheader: O valor do Bootcamp esta no metodo, na pratica e na troca.  
Delay: 3 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Conteudo sobre IA existe em excesso. O que falta e um espaco para organizar pensamento, discutir casos reais e transformar possibilidades em proximos passos.

No Bootcamp, a proposta e trabalhar com exemplos de negocios, decisoes praticas e exercicios para voce voltar com criterios mais fortes.

E uma imersao para quem quer usar IA com responsabilidade, foco e consequencia no trabalho.

Se voce esta avaliando participar, esse e um bom momento para fechar sua vaga antes da virada do lote.

### E-mail 4

Assunto: Ultimo lembrete antes da virada do lote  
Preheader: A condicao atual do Bootcamp Natal muda em breve.  
Delay: 6 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Passando para lembrar que o lote atual do Bootcamp IA para negocios em Natal tem prazo e vagas limitadas.

Se a programacao fez sentido para voce, recomendo resolver a inscricao agora. Depois da virada, a condicao muda e a turma pode ficar sem disponibilidade.

Nos vemos em Natal.

Leonardo Camacho

## Fluxo 2 - Checkout sem compra

### E-mail 1

Assunto: Vi que voce abriu a inscricao do Bootcamp  
Preheader: Se ficou alguma duvida antes de concluir, aqui vai o essencial.  
Delay: imediato

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Vi que voce abriu a inscricao do Bootcamp IA para negocios em Natal.

O evento e presencial, acontece no Bright Coworking Natal e foi desenhado para quem precisa aplicar IA com metodo, nao apenas acompanhar tendencia.

Se sua duvida e se vale para seu contexto: o Bootcamp e especialmente util para lideres, gestores, empreendedores e profissionais que precisam transformar IA em rotina, decisao e resultado.

Se ja estava decidido, basta concluir a inscricao pelo Sympla.

### E-mail 2

Assunto: Vale o investimento?  
Preheader: Uma forma simples de olhar para a decisao.  
Delay: 1 dia

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Uma boa forma de decidir sobre o Bootcamp e comparar o investimento com o custo de continuar improvisando.

Quando a IA entra sem criterio, a empresa perde tempo em ferramentas, automacoes frageis, prompts soltos e iniciativas que nao viram processo.

A imersao concentra um dia de metodo para voce identificar oportunidades, priorizar aplicacoes e voltar com um plano mais claro.

Se isso economizar algumas semanas de tentativa e erro, o retorno ja comeca a aparecer.

### E-mail 3

Assunto: Sua inscricao ainda nao foi concluida  
Preheader: A turma e limitada e o lote muda em breve.  
Delay: 3 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Sua inscricao no Bootcamp IA para negocios em Natal ainda nao apareceu como concluida.

Se voce quer participar, recomendo finalizar antes da virada do lote. A turma e presencial, com vagas limitadas, e a condicao atual nao fica aberta indefinidamente.

Se for uma decisao de empresa ou grupo, fale com o Adriano pelo WhatsApp para avaliar condicao corporativa.

## Fluxo 3 - Plano corporativo

### E-mail 1

Assunto: Recebi seu interesse no plano corporativo do Bootcamp em Natal  
Preheader: Vou te ajudar a montar o melhor formato para sua equipe.  
Delay: imediato

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Recebi seu interesse no plano corporativo do Bootcamp IA para negocios em Natal.

A proposta e simples: ajudar sua equipe a sair do uso solto de IA e entrar em um metodo pratico para diagnosticar oportunidades, redesenhar rotinas e priorizar casos de uso que geram resultado.

Se voce ja abriu a conversa no WhatsApp com o Adriano, ele vai conduzir os detalhes de ingressos, condicoes e disponibilidade da turma.

Se ainda nao abriu, responda este email com quantidade estimada de participantes e objetivo da empresa.

Nos vemos no Bootcamp.

Leonardo Camacho  
Educador de IA e Head de Solucoes da Amplify

### E-mail 2

Assunto: Como justificar o Bootcamp IA para negocios para a empresa  
Preheader: Tres argumentos para levar a decisao adiante.  
Delay: 2 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Quando uma empresa leva um grupo para o Bootcamp, o ganho nao esta apenas no conteudo. O principal valor e criar linguagem comum para a equipe decidir onde a IA entra, onde nao entra e quais projetos merecem prioridade.

Tres bons motivos para aprovar uma turma corporativa:

- reduzir improviso no uso de IA;
- mapear oportunidades concretas por area;
- voltar com criterios para priorizar automacoes, agentes e melhorias de processo.

Se quiser, envie ao Adriano o numero de pessoas e o contexto da sua equipe para avaliarmos a melhor condicao.

Leonardo Camacho

### E-mail 3

Assunto: Ultimo lembrete sobre condicao corporativa para Natal  
Preheader: A turma tem vagas limitadas e o lote muda em breve.  
Delay: 5 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Passando para lembrar do seu interesse em ingressos corporativos para o Bootcamp IA para negocios em Natal.

A turma presencial tem limite de vagas e o lote individual muda em 10/07. Para equipes, a condicao depende da quantidade de participantes e disponibilidade no momento da solicitacao.

Se a conversa ainda fizer sentido, fale com o Adriano e envie a quantidade estimada de pessoas. Assim ele consegue retornar com uma proposta objetiva.

Leonardo Camacho

## Fluxo 4 - Participante confirmado

### E-mail 1

Assunto: Inscricao confirmada: Bootcamp IA para negocios em Natal  
Preheader: Aqui estao os proximos passos para aproveitar melhor a imersao.  
Delay: imediato

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Sua participacao no Bootcamp IA para negocios em Natal foi confirmada.

O encontro sera presencial no Bright Coworking Natal, em 23 de julho de 2026.

Para aproveitar melhor, comece pensando em uma rotina, area ou decisao do seu trabalho que poderia melhorar com IA. Esse caso real vai ajudar voce a transformar o conteudo em aplicacao pratica.

Mais perto da data, enviaremos os lembretes operacionais com horario, endereco e orientacoes finais.

### E-mail 2

Assunto: Traga um caso real para trabalhar no Bootcamp  
Preheader: A imersao fica melhor quando voce chega com um problema concreto.  
Delay: 1 dia

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Uma recomendacao simples para chegar melhor ao Bootcamp: escolha um problema real.

Pode ser uma rotina repetitiva, uma decisao dificil, uma area com gargalo, uma etapa comercial, um processo de produto ou uma atividade que depende demais de pessoas especificas.

Durante a imersao, esse caso ajuda a conectar o metodo com o seu contexto e torna a aplicacao mais concreta.

### E-mail 3

Assunto: Como se preparar sem estudar horas antes  
Preheader: Voce nao precisa chegar tecnico; precisa chegar com contexto.  
Delay: 3 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Voce nao precisa chegar ao Bootcamp sabendo programar, dominando ferramentas ou estudando IA generativa em profundidade.

O mais importante e chegar com contexto de negocio: onde ha desperdicio de tempo, perda de qualidade, demora para decidir ou oportunidade de crescer melhor.

O metodo da imersao ajuda a traduzir esse contexto em criterios de aplicacao.

### E-mail 4

Assunto: Convide alguem da sua empresa para alinhar linguagem  
Preheader: IA avanca melhor quando mais de uma pessoa entende o metodo.  
Delay: 6 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Um ponto importante: IA raramente vira vantagem quando fica concentrada em uma pessoa so.

Se existe alguem da sua equipe que tambem participa das decisoes sobre processos, produto, operacao, comercial ou atendimento, pode fazer sentido trazer essa pessoa para o Bootcamp.

Quando duas ou mais pessoas saem com a mesma linguagem, fica mais facil priorizar, testar e implementar depois.

## Fluxo 5 - Pos-evento: compareceu

### E-mail 1

Assunto: Obrigado por participar do Bootcamp IA em Natal  
Preheader: Agora comeca a parte mais importante: aplicar.  
Delay: imediato apos check-in sincronizado

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Obrigado por participar do Bootcamp IA para negocios em Natal.

O mais importante agora e escolher uma aplicacao pequena, concreta e util para levar adiante nos proximos dias.

Minha sugestao: nao tente transformar tudo de uma vez. Escolha um processo, defina o resultado esperado e rode um primeiro ciclo de teste com criterio.

### E-mail 2

Assunto: O primeiro passo depois do Bootcamp  
Preheader: Transforme repertorio em uma decisao pratica.  
Delay: 2 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Depois de uma imersao, e comum sair com muitas ideias. O risco e tentar abrir frentes demais e nao consolidar nenhuma.

Escolha um caso de uso com tres criterios: frequencia alta, impacto claro e baixa complexidade de implementacao.

Esse tipo de aplicacao cria aprendizado rapido e ajuda a empresa a ganhar confianca sem depender de projetos grandes demais.

### E-mail 3

Assunto: Quando faz sentido chamar a Amplify  
Preheader: Se voce quiser transformar o metodo em execucao dentro da empresa.  
Delay: 7 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Se depois do Bootcamp voce percebeu que existe uma oportunidade maior dentro da empresa, a Amplify pode ajudar a avancar com diagnostico, desenho de solucoes e capacitacao aplicada.

Esse trabalho faz sentido quando a organizacao quer sair de iniciativas soltas e construir um caminho mais consistente de adocao de IA.

Se quiser conversar, responda este email com o contexto e o principal desafio que voce quer resolver.

## Fluxo 6 - Pos-evento: inscrito ausente

### E-mail 1

Assunto: Sentimos sua falta no Bootcamp IA em Natal  
Preheader: Veja como seguir acompanhando os proximos passos.  
Delay: imediato apos ausencia sincronizada

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Sentimos sua falta no Bootcamp IA para negocios em Natal.

Como o encontro foi presencial, parte importante da experiencia acontece nas discussoes e exercicios em sala. Ainda assim, queremos manter voce perto das proximas oportunidades.

Se quiser participar de uma proxima turma ou conversar sobre uma agenda para sua empresa, responda este email.

### E-mail 2

Assunto: Quer entrar na lista da proxima turma?  
Preheader: Podemos te avisar quando houver uma nova data.  
Delay: 2 dias

Oi, {{ subscriber.first_name | default: "tudo bem" }}.

Se o tema continua fazendo sentido para voce, podemos te avisar sobre proximas turmas do Bootcamp IA para negocios.

Tambem podemos conversar sobre uma turma corporativa, caso faca sentido levar o metodo para um grupo da sua empresa.

Responda este email com "proxima turma" ou "corporativo" e seguimos por ali.

## Broadcasts operacionais recomendados

Esses pontos devem ser criados como broadcasts por data, nao como sequences:

- D-7: confirmar endereco, horario e objetivo do encontro.
- D-3: lembrar o que levar e pedir que a pessoa escolha um caso real.
- D-1: lembrete final com endereco completo, horario de chegada e contato de suporte.
- Manha do evento: mensagem curta com endereco e horario.
- Pos-evento, se houver material ou certificado: broadcast para participantes confirmados/comparecidos.

## Oportunidades na LP

- Manter o formulario "receber programacao" como entrada de topo/meio de funil.
- Manter o checkout individual como CTA principal para leads decididos.
- Manter o plano corporativo com mensagem de WhatsApp customizada e registro no Kit.
- Adicionar, depois do evento, uma CTA de proxima turma ou diagnostico corporativo para trafego residual.
- Criar UTM distinta para botoes de hero, preco, programacao e corporativo para comparar conversao por bloco.

## Riscos e cuidados

- Sequencias Kit sao relativas ao momento de entrada, nao ao calendario do evento. Por isso, lembretes operacionais precisam ser broadcasts.
- Os e-mails publicados podem ser enviados imediatamente quando novos leads forem adicionados aos fluxos.
- A sincronizacao de ausentes so deve usar `markAbsences: true` depois do evento.
- Se o Sympla tiver outro evento para segunda turma, ele precisa de `symplaEventId` e fluxo proprio ou tag distinta.
