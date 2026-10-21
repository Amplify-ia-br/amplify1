---
id: lead-qualification
title: Qualificação de oportunidades
description: Perfis de cliente, sinais de aderência e critérios de desqualificação por linha de oferta.
type: playbook
visibility: internal
status: active
owner: commercial
source_of_truth: true
tags:
  - comercial
  - qualificação
  - clientes
sources:
  - Ficha comercial L.E.I.A. v3.1
  - Critérios de pré-vendas do L.E.I.A. definidos por Binho Nogueira em 2026-10-19
relationships:
  - type: implemented_by
    target: ana-ghl-handoff-contract
last_reviewed: 2026-10-20
updated_at: 2026-10-20
---

# Qualificação de oportunidades

Os critérios abaixo ajudam a decidir se existe aderência e qual conversa deve acontecer em seguida. Eles não substituem julgamento comercial.

## Princípios da qualificação pela Ana

A Ana não deve aplicar um questionário único a todas as pessoas. A conversa começa pela necessidade apresentada, identifica o contexto e somente depois abre as perguntas próprias daquele cluster.

O tronco comum é uma sequência de decisões, não uma lista fixa de perguntas:

1. entender o que a pessoa quer realizar com Inteligência Artificial;
2. identificar se a necessidade é individual ou envolve uma organização;
3. quando houver organização, identificar o tipo de organização e o cluster aplicável;
4. identificar a rota de produto mais provável;
5. fazer perguntas específicas da rota;
6. avaliar gates, completude e score;
7. combinar um próximo passo;
8. coletar apenas os dados de contato necessários para executar esse próximo passo.

A abertura deve ser neutra, sem colocar escola, empresa ou governo em primeiro lugar. Uma formulação adequada é:

> O que você está buscando fazer com Inteligência Artificial?

Se a resposta não mostrar o contexto, Ana pode perguntar:

> Isso é para uma necessidade sua ou envolve alguma organização?

Depois que o cluster estiver identificado, o vocabulário acompanha o contexto:

| Cluster | Informação de público a descobrir |
|---|---|
| Pessoa física | objetivo profissional, tarefas que pretende melhorar e nível atual |
| Escola | etapas de ensino, estudantes elegíveis, responsáveis pedagógicos e decisores |
| Empresa | equipes, áreas, funções e quantidade de pessoas envolvidas |
| Governo | órgãos, áreas, servidores, lideranças e processo de contratação |
| Consultoria ou implantação | processos, áreas usuárias, sponsor e responsáveis técnicos |

"Público impactado" é uma categoria de informação comum. Não é uma pergunta comum e não deve levar Ana a mencionar professores, estudantes ou servidores fora do cluster correspondente.

Mesmo dentro do cluster Governo, Ana não pressupõe que o público seja formado apenas por servidores. Em uma rota educacional, pergunta de forma aberta quem participará da formação ou do programa; em Consultoria, pergunta quais áreas, equipes ou pessoas serão impactadas.

Dentro do cluster escolar, a rota também depende da natureza da iniciativa. Programa para estudantes pode seguir ao L.E.I.A.; formação de professores segue para Educação B2B ou B2G; automação, assistentes, governança e redesenho de processos seguem para Consultoria. Quando a necessidade inicial não deixar isso claro, Ana pergunta se o foco principal está em estudantes, profissionais da educação ou processos da instituição antes de abrir perguntas específicas do produto.

Se a fala trouxer sinais de mais de uma dessas intenções, Ana não escolhe uma por precedência: faz a mesma pergunta de desambiguação. Uma iniciativa estudantil de escola particular que não atende às etapas elegíveis do L.E.I.A. permanece com rota não resolvida para revisão ou nutrição; ela não vira automaticamente Educação B2B.

## Entrada inbound e outbound

Inbound e outbound são duas entradas diferentes que convergem para o mesmo registro de qualificação.

No inbound, a pessoa inicia o contato. Ana descobre progressivamente necessidade, cluster, organização, rota e próximo passo. Ela não deve presumir que a conta tem o perfil ideal.

No outbound, a Amplify seleciona previamente contas e pode pesquisar antes da abordagem informações públicas como tipo de organização, site, UF, etapas de ensino, unidades e contatos institucionais. A pré-qualificação antes da conversa aplica-se somente ao outbound. As informações pesquisadas devem ser validadas quando forem críticas ou incertas.

O prefill operacional é aceito em `POST /api/ana-turn` somente quando `mode` é `outbound`, no objeto `prequalification`, e a chamada server-to-server apresenta o token interno. O endpoint público não pode preencher silenciosamente critérios de perfil da conta ou gates em nome do lead. `reputacao_escola` continua fora desse prefill e usa exclusivamente o fluxo autenticado de enriquecimento com evidências.

## Coleta progressiva de identidade e contato

Ana não deve pedir nome, empresa, site, e-mail e WhatsApp em bloco na abertura. Cada dado é solicitado quando há uma razão clara para usá-lo e não deve ser perguntado novamente quando já estiver disponível com confiança.

| Dado | Momento adequado | Finalidade explicável |
|---|---|---|
| Nome da pessoa | depois da primeira interação útil | personalizar e identificar a conversa |
| Nome da organização | assim que a demanda institucional estiver clara | localizar a conta correta |
| Site | depois do nome da organização, quando necessário | confirmar a organização e evitar perguntas que possam ser respondidas por fonte pública |
| UF | antes do handoff institucional | aplicar a distribuição territorial |
| E-mail | depois que a pessoa escolher uma ação concreta e indicar e-mail como canal | executar a entrega ou continuidade combinada |
| WhatsApp | depois que a pessoa escolher uma ação concreta e indicar WhatsApp como canal | executar a entrega ou continuidade combinada |

Para pedir o site, Ana pode explicar o benefício:

> Você pode me enviar o site? Assim localizo a organização correta e evito perguntar o que consigo confirmar por lá.

Antes de solicitar o dado de contato, Ana combina a finalidade. A pergunta muda conforme o próximo passo escolhido:

- conversa comercial: `Qual WhatsApp com DDD o nosso time deve usar para falar com você?`;
- envio de materiais: `Qual WhatsApp com DDD devo usar para enviar os materiais?`;
- retomada posterior: `Qual WhatsApp com DDD podemos registrar para retomar este assunto mais adiante?`.

Ana não promete consultar a agenda nem pede WhatsApp apenas para então oferecer horários. Enquanto Calendars & Appointments não estiver integrado, a conversa comercial significa retorno do time, sem promessa de slot. Depois da integração, ela oferece os horários no canal atual. Somente depois que a pessoa escolher um horário pode pedir:

> Para confirmar o agendamento e enviar os lembretes, qual é o seu WhatsApp com DDD?

Se a conversa já estiver no WhatsApp, Ana pergunta se pode usar aquele mesmo número para a finalidade escolhida ou se a pessoa prefere e-mail. Se um canal válido já estiver registrado, ele deve ser reutilizado ou confirmado em vez de solicitado novamente. Confirmação de agendamento e lembretes só são mencionados quando já existe um horário escolhido.

Antes de pedir o canal, Ana combina uma destas intenções de próximo passo: conversar com o time, receber materiais primeiro ou retomar depois. Apenas a escolha de conversar com o time libera a distribuição comercial automática; as demais permanecem em nutrição, sem serem tratadas como perda.

## Hard, medium e soft

Hard, medium e soft definem a necessidade de obter uma informação antes do handoff. Eles não são pesos de lead scoring e não representam, por si, a importância econômica do critério.

- **Hard:** Ana não libera o handoff para a rota correspondente sem uma resposta confiável. Se não conseguir obter ou validar a informação, mantém o lead em qualificação ou o encaminha para revisão humana.
- **Medium:** Ana pergunta e pode reformular ou insistir uma vez. A ausência da resposta é registrada, reduz a completude, mas não bloqueia sozinha o handoff.
- **Soft:** Ana pergunta apenas quando for natural ou tenta obter a informação por enriquecimento. Recusa ou ausência não bloqueia o handoff.

O contrato de cada campo deve registrar separadamente:

- obrigatoriedade: `hard`, `medium` ou `soft`;
- participação no score e respectivo peso;
- condição de gate, quando houver;
- origem: declarada, inferida, pesquisada ou revisada por pessoa;
- evidência utilizada;
- nível de confiança.

## Score, completude e gates

As rotas podem usar dimensões e pesos diferentes. Um comprador B2C, uma escola e uma oportunidade de consultoria não devem ser avaliados pela mesma matriz apenas para manter uniformidade artificial.

Os conceitos comuns são:

- **Gate:** condição de elegibilidade ou roteamento que não pode ser compensada por pontos em outras dimensões.
- **Score:** prioridade relativa de uma conta ou oportunidade elegível.
- **Completude:** proporção das informações esperadas que foi obtida ou validada.

Um score alto não substitui um gate hard. Um score baixo ou provisório por falta de informações não deve produzir perda automática. Até haver volume suficiente de dados reais de conversão, scores novos devem operar em modo sombra: são calculados e registrados, mas não bloqueiam automaticamente o handoff.

## Educação B2C

### Bom perfil

- profissional, gestor, especialista ou empreendedor com uma necessidade de aprendizagem clara;
- disponibilidade para praticar e aplicar o conteúdo;
- acesso aos requisitos mínimos informados pelo curso;
- expectativa compatível com o nível e a duração da formação.

### Sinais de desqualificação

- procura por emprego garantido, renda garantida ou certificação sem avaliação;
- expectativa de suporte individual ilimitado;
- interesse apenas em copiar respostas prontas, sem aprender critérios de uso;
- recusa em cumprir pré-requisitos ou regras da turma.

## L.E.I.A.

### Referência comercial vigente

A Ficha L.E.I.A. v3.1 é a referência comercial vigente. Ela substitui, para qualificação e comunicação comercial, materiais anteriores que apresentem planos Standard, Silver e Gold ou condições diferentes.

Na v3.1:

- há um formato comercial único;
- a implantação inicial é de R$ 44.900;
- a renovação é de R$ 41.000;
- o E-book custa 12 parcelas de R$ 84 por aluno.

Quando estiver autorizada a falar de preço, Ana deve usar somente a v3.1 e deixar claro o que depende de quantidade de alunos, modalidade ou serviços adicionais. Divergências com páginas ou materiais anteriores devem ser tratadas como conteúdo desatualizado, não como opções comerciais válidas.

Se a pessoa perguntar diretamente pelo preço, valor, investimento ou custo do L.E.I.A. antes da qualificação, essa pergunta autoriza a resposta objetiva: Ana informa os três valores da v3.1 e então retoma o fluxo progressivo pelo nome e pelo contexto. Ela não adia a resposta, não usa preços antigos e não apresenta planos descontinuados.

### Gates da rota comercial padrão

Antes de liberar o handoff para a rota comercial padrão do L.E.I.A., Ana precisa conhecer:

1. o tipo de instituição;
2. se a escola é particular;
3. se atende ao 9º ano do Ensino Fundamental e/ou ao Ensino Médio, faixa contemplada pelo produto.

Essas informações são hard e ficam fora do score. Uma escola pública não deve ser marcada automaticamente como perdida: ela sai da rota comercial padrão do L.E.I.A. e segue para Educação B2G ou Consultoria, conforme a necessidade.

### Perfil prioritário no primeiro ciclo

Entre as escolas elegíveis, os sinais de prioridade comercial informados para o primeiro ciclo são:

- pelo menos 200 estudantes dentro da faixa atendida;
- mensalidade acima de R$ 2.000;
- reputação que possa contribuir para prova social do portfólio de clientes.

Quantidade de estudantes é medium: Ana pergunta, pode reformular ou insistir uma vez e registra a ausência sem bloquear sozinha o handoff. Faixa de mensalidade é soft e deve ser pesquisada ou perguntada com cuidado. Esses critérios priorizam contas; não substituem os gates e não devem gerar desqualificação automática sem regra comercial aprovada.

A definição operacional de `alunos_elegiveis` deve usar a mesma faixa do produto, do 9º ano do Ensino Fundamental à 3ª série do Ensino Médio. Se uma campanha futura adotar corte diferente, ela precisa registrar explicitamente a versão da regra.

### `reputacao_escola`

O campo chama-se `reputacao_escola`, e não "valor estratégico". Ele mede somente o potencial de reputação e prova social da escola. Uma conta sem nota alta nesse campo pode continuar sendo comercialmente estratégica por outros motivos.

Valores permitidos:

- `alta`;
- `media`;
- `baixa`;
- `nao_avaliada`.

O valor padrão é `nao_avaliada`. Ana não atribui reputação com base apenas em impressão conversacional. A classificação deve ser feita ou confirmada internamente, com uma justificativa curta e evidências verificáveis, como reconhecimento público, presença regional, histórico institucional, rede de unidades ou posição comprovada no mercado local.

`reputacao_escola`:

- não é perguntada ao lead;
- não funciona como gate;
- não desqualifica uma escola isoladamente;
- deve manter campos de justificativa, fonte e responsável pela avaliação;
- pode ser revisada quando surgirem novas evidências.

O registro interno é feito por uma chamada autenticada a `POST /api/ana-enrichment`. Uma avaliação diferente de `nao_avaliada` só é aceita junto com justificativa, fonte e responsável. O endpoint não fica disponível sem `ANA_INTERNAL_ENRICHMENT_TOKEN` e nunca expõe esses campos nas respostas públicas da conversa. Se o contato já estiver sincronizado e a integração com o GoHighLevel estiver habilitada, a atualização é registrada no contato e em uma nota idempotente, sem reaplicar `ana-handoff-ready` nem redistribuir a conta. Falhas ficam registradas em um outbox durável e a mesma chamada autenticada pode ser repetida com segurança para nova tentativa.

### Dados de qualificação do L.E.I.A.

O registro deve comportar pelo menos:

- `tipo_instituicao`;
- `escola_particular`;
- `etapas_ensino`;
- `alunos_elegiveis`;
- `faixa_mensalidade`;
- `reputacao_escola`;
- `reputacao_escola_justificativa`;
- `reputacao_escola_fonte`;
- `reputacao_escola_responsavel`;
- `papel_contato`;
- `acesso_decisores`;
- `ano_interesse`;
- `problema_ou_interesse`;
- `proxima_acao`.

Conta e oportunidade devem permanecer separadas. Tipo de escola, alunos, mensalidade e reputação pertencem à conta. Papel do contato, acesso aos decisores, interesse, timing, engajamento e próxima ação pertencem à oportunidade.

### Scoring inicial do L.E.I.A.

O modelo inicial serve para ordenar aprendizado comercial e deve operar em modo sombra até ser calibrado com conversões reais.

| Componente da conta | Pontos máximos | Razão |
|---|---:|---|
| estudantes na faixa atendida | 25 | aproxima escala de implantação e viabilidade econômica |
| faixa de mensalidade | 20 | aproxima a capacidade de absorção do valor pelas famílias |
| `reputacao_escola` | 15 | aproxima o potencial de prova social no primeiro ciclo |
| **Subtotal da conta** | **60** | |

| Componente da oportunidade | Pontos máximos | Razão |
|---|---:|---|
| papel do contato e acesso aos decisores | 15 | indica a capacidade de fazer a decisão avançar |
| interesse ou problema aderente | 10 | diferencia curiosidade de uma necessidade conectada à oferta |
| timing de implantação | 10 | reflete as janelas do calendário escolar |
| engajamento e próxima ação | 5 | ajuda a ordenar oportunidades equivalentes sem superar o fit da conta |
| **Subtotal da oportunidade** | **40** | |

O sistema deve salvar separadamente `account_score`, `opportunity_score`, `total_score`, `qualification_completeness`, `score_model_version` e as evidências dos pontos atribuídos. `account_score` é o nome canônico da dimensão da conta; `icp_score` existe apenas como alias temporário de compatibilidade para integrações anteriores. Campos desconhecidos ficam pendentes; não devem ser inventados nem tratados como resposta negativa. Enquanto a completude for insuficiente, o total é provisório e não pode, sozinho, impedir o handoff.

O componente de interesse ou problema só recebe pontos quando a resposta contém sinais verificáveis de aderência ao L.E.I.A., como público estudantil combinado com IA, uma iniciativa educacional, um problema claro ou um resultado esperado. Tamanho do texto, curiosidade genérica e automação de processos administrativos não pontuam. Da mesma forma, informar qualquer cargo não basta: o componente de papel do contato exige autoridade, influência ou acesso à decisão; declarações como “não participo da decisão” valem zero.

Na dimensão de próxima ação, conversa comercial ou reunião solicitada vale 5 pontos; envio de materiais vale 3; retomada posterior vale 1. A escolha do canal, sozinha, não conta como próxima ação.

## Educação B2G

### Bom perfil

- órgão ou escola de governo com patrocinador responsável;
- público e função dos participantes definidos;
- problema de aprendizagem ligado ao trabalho;
- disponibilidade para adaptar exemplos, materiais e regras ao contexto público;
- caminho de contratação e calendário minimamente conhecidos.

### Sinais de desqualificação

- pedido genérico de palestra apresentado como programa de formação;
- ausência de responsável pela contratação ou pelo conteúdo;
- expectativa de usar dados sensíveis em ferramentas não aprovadas;
- prazo incompatível com contratação, adaptação e preparação;
- exigência de promessa de eficiência sem forma de medir aplicação.

## Capacitação B2B

### Bom perfil

- liderança que reconhece uma necessidade de adoção ou produtividade;
- equipe, área e rotinas prioritárias identificadas;
- acesso às pessoas que conhecem o trabalho real;
- disposição para tratar segurança, dados e mudança de hábitos;
- expectativa de aplicação depois da aula.

### Sinais de desqualificação

- busca exclusiva pela menor hora-aula;
- pedido de conteúdo genérico sem acesso ao contexto da equipe;
- expectativa de resolver governança, integração ou redesenho de processo apenas com treinamento;
- ausência de patrocinador ou de tempo para participação;
- exigência de resultado garantido sem compromisso de adoção.

## Consultoria

### Bom perfil

- problema relevante e um responsável disposto a tomar decisões;
- acesso a áreas, processos, pessoas e dados necessários;
- orçamento ou capacidade real de contratação;
- interesse em medir resultado e rever a operação;
- abertura para descobrir que a melhor resposta pode não ser desenvolver software.

### Sinais de desqualificação

- solução já escolhida sem entendimento do problema;
- pedido de prova de conceito gratuita sem critério de continuidade;
- ausência de responsável interno;
- bloqueio de acesso às informações essenciais;
- expectativa de automatizar um processo quebrado sem redesenhá-lo;
- uso que viola lei, contrato, política de segurança ou direitos de terceiros;
- prazo, orçamento e resultado esperado sem relação entre si.

## Informações mínimas para encaminhar uma oportunidade

- nome da pessoa;
- pelo menos um canal válido, e-mail ou telefone;
- organização, quando a demanda for institucional;
- site, quando disponível;
- UF, quando houver distribuição territorial;
- cluster e rota de produto;
- problema que motivou o contato;
- público ou área envolvida;
- situação atual de uso de IA;
- resultado desejado;
- principal restrição;
- prazo;
- processo de decisão e contratação;
- status dos gates hard aplicáveis;
- próximo passo acordado.

A ausência de uma informação genérica que não se aplique à rota não bloqueia o encaminhamento. Para o L.E.I.A., os mínimos específicos são nome da escola, tipo de instituição, escola particular ou pública, etapas de ensino, papel do contato e status dos gates. Número de estudantes é medium; site e faixa de mensalidade não bloqueiam sozinhos o handoff.

O contrato de persistência, tags regionais e ordem de acionamento do workflow está em `ana-ghl-handoff-contract`.
