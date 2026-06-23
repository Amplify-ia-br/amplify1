const landingPageUrl = process.env.NEXIALISTA_LANDING_URL || "https://amplify.ia.br/nexialista";
const diagnosisUrl = process.env.NEXIALISTA_DIAGNOSIS_URL || "https://amplify.ia.br/contato?origem=nexialista-diagnostico";
const linkedinUrl = process.env.NEXIALISTA_LINKEDIN_URL || "https://linkedin.com/in/leocamacho";

export const NEXIALISTA_WORKFLOWS = {
  free_access: {
    key: "free_access",
    name: "Nexialista | Acesso Gratuito Liberado",
    completionTag: "fluxo_gratuito_concluido",
    initialDelayHours: 0,
    steps: [
      {
        key: "free_access_1",
        delayAfterHours: 72,
        subject: "Seu acesso ao Profissional Nexialista está aqui",
        preview: "Mas antes de baixar, preciso te explicar por que você recebeu isso.",
        ctaLabel: "Acessar o e-book agora",
        ctaUrl: landingPageUrl,
        body: `Olá, [NOME].

Você está recebendo acesso gratuito ao Profissional Nexialista porque suas respostas no diagnóstico indicaram um contexto com potencial real de aplicação.

Não é sorteio. Não é uma ação em massa. É o Incentivo Nexialista da Amplify — uma forma de fazer este material chegar a profissionais que provavelmente vão tirar algo prático dele.

O e-book tem valor de referência de R$ 127. Para o seu perfil, liberamos o acesso para que você leia primeiro e, se fizer sentido, aprofunde a conversa depois.

O material é assinado por Fernando Godoy, CEO e cofundador da Amplify. Eu, Leonardo Camacho, estou te enviando o acesso e acompanhando esta jornada porque atuo na conexão entre o conteúdo, o diagnóstico e a aplicação prática em empresas.

Se você tentou baixar pela página e não conseguiu, deixo o link aqui também.

[BOTÃO: Acessar o e-book agora →]

Qualquer dúvida, pode responder este email diretamente. Se preferir um contato mais direto, também estou no LinkedIn:
${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "free_access_2",
        delayAfterHours: 96,
        subject: "O problema não é usar pouca IA. É usar IA sem critério.",
        preview: "Três sinais de que sua empresa está no modo ferramental — e como sair.",
        ctaLabel: "Agendar conversa com Leonardo",
        ctaUrl: diagnosisUrl,
        body: `Olá, [NOME].

Há alguns dias te enviei o Profissional Nexialista. Espero que você tenha conseguido começar a leitura.

Enquanto isso, deixo uma reflexão que aparece com frequência nas conversas que tenho com líderes.

Muitas empresas já estão usando IA. O problema é que o uso acontece de forma solta: uma área testa uma ferramenta, outra cria um processo paralelo, alguém automatiza uma tarefa, mas nada disso conversa com a estratégia.

Isso não é falta de adoção. É falta de critério.

O e-book ajuda justamente nesse ponto: antes de escolher uma ferramenta, entender qual decisão será melhorada, qual processo será afetado e quem precisa aprender a trabalhar de outro jeito.

Se fizer sentido olhar para isso com mais calma na sua empresa, posso conversar com você sem compromisso e sem apresentação institucional.

[BOTÃO: Agendar conversa com Leonardo →]

${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "free_access_3",
        subject: "Uma pergunta antes de encerrar",
        preview: "Leu o material? O que ficou?",
        ctaLabel: "Quero agendar uma conversa",
        ctaUrl: diagnosisUrl,
        body: `Olá, [NOME].

Esta é a última mensagem deste fluxo, então vou ser direto.

Você recebeu o Profissional Nexialista gratuitamente porque o diagnóstico indicou um contexto em que o material poderia ser útil de verdade.

Se ele ficou na caixa de entrada, sem problema. Acontece. Mas, se você leu e alguma parte tocou em um problema real da sua empresa, eu gostaria de entender o que ficou.

Na Amplify, trabalhamos com empresas que querem sair do uso disperso de IA e construir um caminho mais claro: estratégia, formação de times, processos e aplicação prática.

Se isso tiver aderência ao seu momento, vale uma conversa de 30 minutos. Se não for o timing, tudo bem também.

[BOTÃO: Quero agendar uma conversa →]

P.S.: Se você conhece alguém que deveria passar por essa reflexão, envie a landing page. O incentivo é calculado individualmente pelo diagnóstico.

Leonardo Camacho
AI Educator – Amplify`,
      },
    ],
  },
  purchased_downloaded: {
    key: "purchased_downloaded",
    name: "Nexialista | Comprou e Baixou",
    completionTag: "fluxo_compra_concluido",
    initialDelayHours: 0,
    steps: [
      {
        key: "purchased_1",
        delayAfterHours: 96,
        subject: "Seu e-book chegou. Aqui está o que eu espero que você faça com ele.",
        preview: "Não é só leitura — é um instrumento de diagnóstico.",
        ctaLabel: "Acessar o material",
        ctaUrl: landingPageUrl,
        body: `Olá, [NOME].

O Profissional Nexialista está disponível para você agora.

Se o download pela página não funcionou, ou se você preferiu deixar para depois, o link está aqui também.

[BOTÃO: Acessar o material →]

Antes de abrir o arquivo, deixo uma sugestão simples de leitura.

Não leia como mais um e-book de IA. Leia como um instrumento de diagnóstico. A cada seção, tente responder: onde minha empresa está neste espectro?

O material é assinado por Fernando Godoy e nasce da experiência da Amplify com líderes e empresas que precisam transformar IA em decisão, não apenas em uso de ferramenta.

Se em algum momento você quiser discutir o que encontrou — sobre sua empresa, seus times ou decisões que estão em aberto — pode responder este email.

Boa leitura.

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "purchased_2",
        delayAfterHours: 120,
        subject: "Como um líder lê o Profissional Nexialista",
        preview: "Três perguntas para fazer enquanto você avança no material.",
        ctaLabel: "Solicitar diagnóstico Amplify",
        ctaUrl: diagnosisUrl,
        body: `Olá, [NOME].

Espero que você tenha conseguido avançar no material.

Quero deixar três perguntas para carregar durante a leitura:

1. Em quais decisões estratégicas da sua empresa a IA ainda não tem papel definido?
2. Qual área da organização tem mais dificuldade em absorver novas formas de trabalhar?
3. Se você tivesse que nomear um profissional nexialista hoje, quem seria — ou por que ninguém se encaixaria?

Essas perguntas aparecem com frequência nos diagnósticos que fazemos na Amplify. Elas ajudam a tirar a conversa do plano das ferramentas e levar para decisões, processos e pessoas.

Se você quiser passar por esse processo com nossa equipe, posso agendar uma sessão de diagnóstico. Sem compromisso de projeto; primeiro, clareza.

[BOTÃO: Solicitar diagnóstico Amplify →]

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "purchased_3",
        subject: "O passo seguinte ao livro",
        preview: "Diagnóstico → Estratégia → Capacidade real.",
        ctaLabel: "Agendar diagnóstico com a Amplify",
        ctaUrl: diagnosisUrl,
        body: `Olá, [NOME].

O e-book é um bom ponto de partida, mas ele não resolve sozinho as perguntas que provavelmente aparecem depois da leitura.

Algumas delas costumam ser bem práticas:

por onde começar;
quem precisa participar;
qual processo vale priorizar;
como evitar que IA vire apenas mais uma pauta solta.

É nessa passagem — do diagnóstico para um plano de ação — que a Amplify costuma atuar.

Se o material levantou perguntas que sua empresa ainda não sabe responder, posso conversar com você por 30 minutos e entender o contexto. Se não for o momento, sem problema.

[BOTÃO: Agendar diagnóstico com a Amplify →]

P.S.: Se quiser me encontrar antes de uma reunião formal, estou no LinkedIn. Prefiro conversas diretas a formulários.
${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
    ],
  },
  checkout_abandoned: {
    key: "checkout_abandoned",
    name: "Nexialista | Checkout Iniciado, Não Pagou",
    completionTag: "fluxo_checkout_concluido",
    initialDelayHours: 6,
    steps: [
      {
        key: "checkout_1",
        delayAfterHours: 48,
        subject: "Seu incentivo ainda está reservado",
        preview: "Não fechou o acesso. Só pausou.",
        ctaLabel: "Retomar meu acesso",
        ctaUrl: landingPageUrl,
        body: `Olá, [NOME].

Você começou o processo de acesso ao Profissional Nexialista, mas não finalizou.

Pode ter sido só uma interrupção. Por isso, seu incentivo segue reservado por mais algumas horas.

O e-book tem valor de referência de R$ 127, mas o diagnóstico pode liberar um incentivo de acordo com o perfil e o contexto de aplicação.

Se ainda fizer sentido para você, é só retomar pelo botão abaixo. Se ficou alguma dúvida sobre o material ou sobre o processo, pode responder este email diretamente.

[BOTÃO: Retomar meu acesso →]

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "checkout_2",
        delayAfterHours: 72,
        subject: "Por que esse material existe",
        preview: "Não é mais um e-book de IA. Deixa eu explicar.",
        ctaLabel: "Acessar o Profissional Nexialista",
        ctaUrl: landingPageUrl,
        body: `Olá, [NOME].

Antes de você decidir se vai ou não acessar o Profissional Nexialista, quero explicar por que esse material existe.

Na prática, vemos um padrão se repetir: empresas compram ferramentas, estimulam testes, fazem pilotos, mas continuam sem uma resposta simples para a pergunta principal — que decisão ou processo a IA precisa melhorar?

O problema raramente é falta de ferramenta. O problema é a falta de alguém capaz de conectar tecnologia, contexto de negócio e mudança no trabalho.

É esse o ponto do profissional nexialista. O e-book, assinado por Fernando Godoy, organiza essa reflexão a partir da visão da Amplify sobre IA aplicada em empresas.

Se isso conversa com o que você está vivendo, o material provavelmente vale a leitura.

[BOTÃO: Acessar o Profissional Nexialista →]

Se quiser falar comigo antes, estou no LinkedIn: ${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "checkout_3",
        subject: "Último lembrete: Profissional Nexialista",
        preview: "Depois disso, arquivo. Mas deixo uma porta aberta.",
        ctaLabel: "Garantir meu acesso agora",
        ctaUrl: landingPageUrl,
        body: `Olá, [NOME].

Este é o último lembrete sobre o acesso ao Profissional Nexialista.

Não vou insistir depois daqui. Se não for o momento, tudo bem.

Mas deixo a porta aberta: se em algum momento você quiser acessar o material, ou simplesmente conversar sobre como sua empresa está pensando IA hoje, estarei por aqui.

O e-book está disponível por R$ 127. Para perfis com potencial de aplicação real, o diagnóstico pode liberar parte ou todo o incentivo. Se quiser retomar, volte pela página e siga com calma.

[BOTÃO: Garantir meu acesso agora →]

${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
    ],
  },
  diagnosis_abandoned: {
    key: "diagnosis_abandoned",
    name: "Nexialista | Diagnóstico Iniciado, Não Concluído",
    completionTag: "fluxo_diagnostico_abandonado_concluido",
    initialDelayHours: 12,
    steps: [
      {
        key: "diagnosis_abandoned_1",
        delayAfterHours: 48,
        subject: "Você começou o diagnóstico Nexialista",
        preview: "Faltou pouco para transformar suas respostas em um próximo passo claro.",
        ctaLabel: "Concluir meu diagnóstico",
        ctaUrl: landingPageUrl,
        body: `Olá, [NOME].

Você começou o diagnóstico Nexialista, mas não concluiu.

Pelo que já apareceu nas suas respostas, existe um contexto que pode valer uma leitura mais cuidadosa: empresa, escala e uma possível aplicação prática de IA.

Não quero assumir demais com um diagnóstico incompleto. Mas também não quero deixar esse sinal se perder.

Se fizer sentido, retome pela página e conclua as últimas respostas. Assim conseguimos calcular seu incentivo corretamente e indicar o próximo passo com mais critério.

[BOTÃO: Concluir meu diagnóstico →]

Se preferir falar diretamente, estou no LinkedIn:
${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "diagnosis_abandoned_2",
        subject: "Ainda vale concluir?",
        preview: "Uma pergunta simples antes de eu arquivar este sinal.",
        ctaLabel: "Retomar o diagnóstico",
        ctaUrl: landingPageUrl,
        body: `Olá, [NOME].

Passando só uma última vez sobre o diagnóstico Nexialista.

Você começou, mas não terminou. Isso pode não significar nada além de interrupção no dia. Ainda assim, o começo já indicou uma empresa com contexto para pensar IA além de ferramentas soltas.

Se o tema ainda fizer sentido, retome quando puder. O diagnóstico ajuda a separar curiosidade de prioridade real.

[BOTÃO: Retomar o diagnóstico →]

Se não for o momento, sem problema.

Leonardo Camacho
AI Educator – Amplify`,
      },
    ],
  },
  hot_lead: {
    key: "hot_lead",
    name: "Nexialista | Lead Quente / Oportunidade",
    completionTag: "fluxo_lead_quente_concluido",
    initialDelayHours: 2,
    steps: [
      {
        key: "hot_1",
        delayAfterHours: 72,
        subject: "Quero conversar com você",
        preview: "Sem pitch. Com uma proposta concreta.",
        ctaLabel: "Agendar conversa com Leonardo",
        ctaUrl: diagnosisUrl,
        body: `Olá, [NOME].

Seu diagnóstico indica que talvez exista uma questão concreta sobre IA na sua empresa — não apenas curiosidade sobre ferramenta.

Por isso, em vez de te enviar mais conteúdo, prefiro fazer um convite simples.

Posso conversar com você por 40 minutos, sem pitch e sem apresentação institucional, para entender onde sua organização está e o que faria sentido como próximo passo.

Minha atuação na Amplify é justamente nessa ponte entre estratégia, aprendizado organizacional e aplicação prática de IA. A conversa só vale se for útil para você.

Se fizer sentido, responda este email ou use o link abaixo.

[BOTÃO: Agendar conversa com Leonardo →]

${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "hot_2",
        subject: "Ainda faz sentido conversar?",
        preview: "Pergunta direta. Resposta direta.",
        ctaLabel: "Sim, quero agendar",
        ctaUrl: diagnosisUrl,
        body: `Olá, [NOME].

Mandei um email há alguns dias e não quero insistir além do necessário.

Só queria entender se ainda faz sentido conversar agora.

Se o timing não for bom, tudo bem. Se quiser falar, podemos fazer uma conversa curta e objetiva.

[BOTÃO: Sim, quero agendar →]

Se preferir uma conversa menos formal antes de agendar: ${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
    ],
  },
  discovery: {
    key: "discovery",
    name: "Nexialista | Lead em Descoberta",
    completionTag: "fluxo_descoberta_concluido",
    initialDelayHours: 6,
    steps: [
      {
        key: "discovery_1",
        delayAfterHours: 120,
        subject: "O que é um profissional nexialista — e por que isso importa agora",
        preview: "Um conceito que surgiu da pesquisa. E da realidade das empresas.",
        ctaLabel: "Conhecer o Profissional Nexialista",
        ctaUrl: landingPageUrl,
        body: `Olá, [NOME].

Quero apresentar o conceito que está no centro do e-book assinado por Fernando Godoy e do trabalho que desenvolvemos na Amplify.

O profissional nexialista é quem consegue conectar IA com estratégia, dados com decisão e tecnologia com cultura. Não precisa ser a pessoa mais técnica do time. Precisa entender onde a IA encaixa — e onde ela pode atrapalhar.

Muitas empresas já têm pessoas curiosas, pilotos e ferramentas em uso. O que falta, com frequência, é alguém capaz de organizar esse movimento em torno de decisões reais.

Nos próximos emails, vou explorar alguns sintomas de IA dispersa e o que diferencia empresas que conseguem sair desse estágio.

Se quiser antecipar essa conversa, estou no LinkedIn.
${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "discovery_2",
        delayAfterHours: 168,
        subject: "Cinco sintomas de IA dispersa na sua empresa",
        preview: "Você provavelmente reconhece pelo menos três.",
        ctaLabel: "Conversar com a Amplify",
        ctaUrl: diagnosisUrl,
        body: `Olá, [NOME].

No email anterior, apresentei o conceito de profissional nexialista. Hoje, quero falar dos sintomas.

Nas conversas que fazemos na Amplify, aparecem cinco padrões recorrentes em empresas que já usam IA, mas ainda de forma dispersa:

1. Cada área descobriu uma ferramenta diferente, sem integração ou compartilhamento de aprendizado.
2. A liderança não consegue nomear quais decisões estratégicas poderiam ser melhoradas com IA.
3. Os times que mais adotaram ferramentas continuam reclamando de retrabalho.
4. Nenhuma iniciativa de IA está conectada a uma meta de negócio clara.
5. O assunto aparece nas reuniões de diretoria, mas ninguém sabe exatamente quem é responsável por ele.

Se você reconhece dois ou mais desses pontos, talvez sua empresa esteja no modo ferramental: a tecnologia chegou antes da estratégia.

No próximo email, explico como sair desse estágio.

Leonardo Camacho
AI Educator – Amplify`,
      },
      {
        key: "discovery_3",
        subject: "Da ferramenta para a capacidade organizacional",
        preview: "O salto que as empresas mais avançadas já deram.",
        ctaLabel: "Conversar com a Amplify",
        ctaUrl: diagnosisUrl,
        body: `Olá, [NOME].

Esta é a última mensagem desta sequência.

Empresas que saem do modo ferramental costumam fazer três movimentos:

Primeiro, definem quem tem autoridade para decidir como a IA será usada. Não deixam o tema solto entre TI, inovação e entusiastas isolados.

Segundo, criam um processo de aprendizado: o que funciona em uma área é documentado, ajustado e reaproveitado.

Terceiro, conectam as iniciativas de IA a resultados de negócio — crescimento, margem, produtividade, qualidade ou velocidade de decisão.

Na Amplify, ajudamos empresas a estruturar esse caminho com diagnóstico, formação de lideranças e acompanhamento da implementação.

Se você chegou até aqui e o tema parece relevante para o seu momento, posso conversar com você e entender o que está em aberto. Se não for prioridade agora, sem problema.

[BOTÃO: Conversar com a Amplify →]

Ou me encontre diretamente: ${linkedinUrl}

Leonardo Camacho
AI Educator – Amplify`,
      },
    ],
  },
};

export function getWorkflow(key) {
  return NEXIALISTA_WORKFLOWS[key] || null;
}

export function listWorkflows() {
  return Object.values(NEXIALISTA_WORKFLOWS);
}
