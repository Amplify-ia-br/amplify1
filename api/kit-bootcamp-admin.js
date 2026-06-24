export const config = { runtime: "edge" };

const KIT_API_BASE_URL = "https://api.kit.com/v4";
const ADMIN_TOKEN = "500e45a479e855b481d2758a8d66a6cc2017765c53656c7f";

const SEQUENCES = [
  {
    key: "bootcamp_interest",
    name: "Bootcamp IA Natal - Programacao solicitada",
    emails: [
      {
        subject: "Aqui está a programação do Bootcamp IA em Natal",
        preview_text: "O roteiro para decidir se essa imersão faz sentido para você.",
        delay_value: 0,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Recebi seu pedido para ver a programação do Bootcamp IA para negócios em Natal.</p>
          <p>A imersão foi desenhada para quem precisa parar de testar ferramentas soltas e começar a decidir, com método, onde a IA entra no negócio.</p>
          <p>Em um dia presencial, vamos trabalhar diagnóstico, priorização de casos de uso, desenho de rotinas e caminhos práticos para tirar a IA do improviso.</p>
          <p>Se fizer sentido para você, garanta sua vaga pelo Sympla. A turma é presencial e as vagas são limitadas.</p>
          <p>Leonardo Camacho<br>Educador de IA e Head de Soluções da Amplify</p>
        `,
      },
      {
        subject: "O problema não é falta de ferramenta de IA",
        preview_text: "O problema costuma ser falta de critério para aplicar.",
        delay_value: 1,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>A maioria das empresas já tem gente usando IA. O que poucas têm é um método comum para decidir onde usar, como medir valor e quando não usar.</p>
          <p>Sem esse método, a IA vira uma sequência de testes isolados: muita curiosidade, pouca mudança real no trabalho.</p>
          <p>O Bootcamp em Natal existe para criar esse critério. Você sai com repertório, matriz de decisão e clareza para escolher aplicações com impacto em receita, produto, atendimento, operação e gestão.</p>
          <p>Se esse é o tipo de conversa que sua empresa precisa ter agora, a inscrição individual já está aberta.</p>
        `,
      },
      {
        subject: "Por que fazer isso presencialmente",
        preview_text: "O valor do Bootcamp está no método, na prática e na troca.",
        delay_value: 3,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Conteúdo sobre IA existe em excesso. O que falta é um espaço para organizar pensamento, discutir casos reais e transformar possibilidades em próximos passos.</p>
          <p>No Bootcamp, a proposta é trabalhar com exemplos de negócios, decisões práticas e exercícios para você voltar com critérios mais fortes.</p>
          <p>É uma imersão para quem quer usar IA com responsabilidade, foco e consequência no trabalho.</p>
          <p>Se você está avaliando participar, esse é um bom momento para fechar sua vaga antes da virada do lote.</p>
        `,
      },
      {
        subject: "Último lembrete antes da virada do lote",
        preview_text: "A condição atual do Bootcamp Natal muda em breve.",
        delay_value: 6,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Passando para lembrar que o lote atual do Bootcamp IA para negócios em Natal tem prazo e vagas limitadas.</p>
          <p>Se a programação fez sentido para você, recomendo resolver a inscrição agora. Depois da virada, a condição muda e a turma pode ficar sem disponibilidade.</p>
          <p>Nos vemos em Natal.</p>
          <p>Leonardo Camacho</p>
        `,
      },
    ],
  },
  {
    key: "bootcamp_checkout_abandoned",
    name: "Bootcamp IA Natal - Checkout sem compra",
    emails: [
      {
        subject: "Vi que você abriu a inscrição do Bootcamp",
        preview_text: "Se ficou alguma dúvida antes de concluir, aqui vai o essencial.",
        delay_value: 0,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Vi que você abriu a inscrição do Bootcamp IA para negócios em Natal.</p>
          <p>O evento é presencial, acontece no Bright Coworking Natal e foi desenhado para quem precisa aplicar IA com método, não apenas acompanhar tendência.</p>
          <p>Se sua dúvida é se vale para seu contexto: o Bootcamp é especialmente útil para líderes, gestores, empreendedores e profissionais que precisam transformar IA em rotina, decisão e resultado.</p>
          <p>Se já estava decidido, basta concluir a inscrição pelo Sympla.</p>
        `,
      },
      {
        subject: "Vale o investimento?",
        preview_text: "Uma forma simples de olhar para a decisão.",
        delay_value: 1,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Uma boa forma de decidir sobre o Bootcamp é comparar o investimento com o custo de continuar improvisando.</p>
          <p>Quando a IA entra sem critério, a empresa perde tempo em ferramentas, automações frágeis, prompts soltos e iniciativas que não viram processo.</p>
          <p>A imersão concentra um dia de método para você identificar oportunidades, priorizar aplicações e voltar com um plano mais claro.</p>
          <p>Se isso economizar algumas semanas de tentativa e erro, o retorno já começa a aparecer.</p>
        `,
      },
      {
        subject: "Sua inscrição ainda não foi concluída",
        preview_text: "A turma é limitada e o lote muda em breve.",
        delay_value: 3,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Sua inscrição no Bootcamp IA para negócios em Natal ainda não apareceu como concluída.</p>
          <p>Se você quer participar, recomendo finalizar antes da virada do lote. A turma é presencial, com vagas limitadas, e a condição atual não fica aberta indefinidamente.</p>
          <p>Se for uma decisão de empresa ou grupo, fale com o Adriano pelo WhatsApp para avaliar condição corporativa.</p>
        `,
      },
    ],
  },
  {
    key: "bootcamp_confirmed",
    name: "Bootcamp IA Natal - Participante confirmado",
    emails: [
      {
        subject: "Inscrição confirmada: Bootcamp IA para negócios em Natal",
        preview_text: "Aqui estão os próximos passos para aproveitar melhor a imersão.",
        delay_value: 0,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Sua participação no Bootcamp IA para negócios em Natal foi confirmada.</p>
          <p>O encontro será presencial no Bright Coworking Natal, em 23 de julho de 2026.</p>
          <p>Para aproveitar melhor, comece pensando em uma rotina, área ou decisão do seu trabalho que poderia melhorar com IA. Esse caso real vai ajudar você a transformar o conteúdo em aplicação prática.</p>
          <p>Mais perto da data, enviaremos os lembretes operacionais com horário, endereço e orientações finais.</p>
        `,
      },
      {
        subject: "Traga um caso real para trabalhar no Bootcamp",
        preview_text: "A imersão fica melhor quando você chega com um problema concreto.",
        delay_value: 1,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Uma recomendação simples para chegar melhor ao Bootcamp: escolha um problema real.</p>
          <p>Pode ser uma rotina repetitiva, uma decisão difícil, uma área com gargalo, uma etapa comercial, um processo de produto ou uma atividade que depende demais de pessoas específicas.</p>
          <p>Durante a imersão, esse caso ajuda a conectar o método com o seu contexto e torna a aplicação mais concreta.</p>
        `,
      },
      {
        subject: "Como se preparar sem estudar horas antes",
        preview_text: "Você não precisa chegar técnico; precisa chegar com contexto.",
        delay_value: 3,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Você não precisa chegar ao Bootcamp sabendo programar, dominando ferramentas ou estudando IA generativa em profundidade.</p>
          <p>O mais importante é chegar com contexto de negócio: onde há desperdício de tempo, perda de qualidade, demora para decidir ou oportunidade de crescer melhor.</p>
          <p>O método da imersão ajuda a traduzir esse contexto em critérios de aplicação.</p>
        `,
      },
      {
        subject: "Convide alguém da sua empresa para alinhar linguagem",
        preview_text: "IA avança melhor quando mais de uma pessoa entende o método.",
        delay_value: 6,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Um ponto importante: IA raramente vira vantagem quando fica concentrada em uma pessoa só.</p>
          <p>Se existe alguém da sua equipe que também participa das decisões sobre processos, produto, operação, comercial ou atendimento, pode fazer sentido trazer essa pessoa para o Bootcamp.</p>
          <p>Quando duas ou mais pessoas saem com a mesma linguagem, fica mais fácil priorizar, testar e implementar depois.</p>
        `,
      },
    ],
  },
  {
    key: "bootcamp_attended",
    name: "Bootcamp IA Natal - Pos-evento compareceu",
    emails: [
      {
        subject: "Obrigado por participar do Bootcamp IA em Natal",
        preview_text: "Agora começa a parte mais importante: aplicar.",
        delay_value: 0,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Obrigado por participar do Bootcamp IA para negócios em Natal.</p>
          <p>O mais importante agora é escolher uma aplicação pequena, concreta e útil para levar adiante nos próximos dias.</p>
          <p>Minha sugestão: não tente transformar tudo de uma vez. Escolha um processo, defina o resultado esperado e rode um primeiro ciclo de teste com critério.</p>
        `,
      },
      {
        subject: "O primeiro passo depois do Bootcamp",
        preview_text: "Transforme repertório em uma decisão prática.",
        delay_value: 2,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Depois de uma imersão, é comum sair com muitas ideias. O risco é tentar abrir frentes demais e não consolidar nenhuma.</p>
          <p>Escolha um caso de uso com três critérios: frequência alta, impacto claro e baixa complexidade de implementação.</p>
          <p>Esse tipo de aplicação cria aprendizado rápido e ajuda a empresa a ganhar confiança sem depender de projetos grandes demais.</p>
        `,
      },
      {
        subject: "Quando faz sentido chamar a Amplify",
        preview_text: "Se você quiser transformar o método em execução dentro da empresa.",
        delay_value: 7,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Se depois do Bootcamp você percebeu que existe uma oportunidade maior dentro da empresa, a Amplify pode ajudar a avançar com diagnóstico, desenho de soluções e capacitação aplicada.</p>
          <p>Esse trabalho faz sentido quando a organização quer sair de iniciativas soltas e construir um caminho mais consistente de adoção de IA.</p>
          <p>Se quiser conversar, responda este email com o contexto e o principal desafio que você quer resolver.</p>
        `,
      },
    ],
  },
  {
    key: "bootcamp_missed",
    name: "Bootcamp IA Natal - Inscrito ausente",
    emails: [
      {
        subject: "Sentimos sua falta no Bootcamp IA em Natal",
        preview_text: "Veja como seguir acompanhando os próximos passos.",
        delay_value: 0,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Sentimos sua falta no Bootcamp IA para negócios em Natal.</p>
          <p>Como o encontro foi presencial, parte importante da experiência acontece nas discussões e exercícios em sala. Ainda assim, queremos manter você perto das próximas oportunidades.</p>
          <p>Se quiser participar de uma próxima turma ou conversar sobre uma agenda para sua empresa, responda este email.</p>
        `,
      },
      {
        subject: "Quer entrar na lista da próxima turma?",
        preview_text: "Podemos te avisar quando houver uma nova data.",
        delay_value: 2,
        delay_unit: "days",
        content: `
          <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
          <p>Se o tema continua fazendo sentido para você, podemos te avisar sobre próximas turmas do Bootcamp IA para negócios.</p>
          <p>Também podemos conversar sobre uma turma corporativa, caso faça sentido levar o método para um grupo da sua empresa.</p>
          <p>Responda este email com "próxima turma" ou "corporativo" e seguimos por ali.</p>
        `,
      },
    ],
  },
];

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clean(value) {
  return String(value || "").trim();
}

function getApiKey() {
  return clean(process.env.KIT_API_KEY)
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

async function kitRequest(path, { method = "GET", body } = {}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return { ok: false, status: 500, body: { error: "KIT_API_KEY ausente" } };
  }

  const response = await fetch(`${KIT_API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Kit-Api-Key": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();
  let payload = {};

  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch (_error) {
    payload = { raw: responseText };
  }

  return { ok: response.ok, status: response.status, body: payload };
}

function extractSequences(payload) {
  if (Array.isArray(payload?.sequences)) return payload.sequences;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function extractSequence(payload) {
  return payload?.sequence || payload?.data || payload || null;
}

async function findSequenceByName(name) {
  const result = await kitRequest("/sequences");
  if (!result.ok) return { result, sequence: null };

  const sequence = extractSequences(result.body).find((item) => clean(item?.name) === name);
  return { result, sequence: sequence || null };
}

async function createSequence(sequenceConfig) {
  const result = await kitRequest("/sequences", {
    method: "POST",
    body: {
      name: sequenceConfig.name,
      active: true,
      hold: false,
      repeat: false,
      send_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      send_hour: 9,
      time_zone: "America/Sao_Paulo",
    },
  });

  return { result, sequence: result.ok ? extractSequence(result.body) : null };
}

async function createSequenceEmail(sequenceId, email) {
  return kitRequest(`/sequences/${encodeURIComponent(sequenceId)}/emails`, {
    method: "POST",
    body: {
      ...email,
      published: true,
    },
  });
}

async function provisionSequence(sequenceConfig) {
  const found = await findSequenceByName(sequenceConfig.name);
  let sequence = found.sequence;
  let created = false;
  let createResult = null;
  let emailResults = [];

  if (!sequence) {
    const createdSequence = await createSequence(sequenceConfig);
    createResult = createdSequence.result;
    sequence = createdSequence.sequence;
    created = true;

    if (!createResult.ok || !sequence?.id) {
      return { ok: false, key: sequenceConfig.key, found: found.result, create: createResult };
    }

    for (const email of sequenceConfig.emails) {
      emailResults.push(await createSequenceEmail(sequence.id, email));
    }
  }

  return {
    ok: true,
    key: sequenceConfig.key,
    created,
    sequence: {
      id: sequence?.id,
      name: sequence?.name || sequenceConfig.name,
    },
    emails: emailResults.map((result) => ({
      ok: result.ok,
      status: result.status,
      id: result.body?.email?.id || result.body?.sequence_email?.id || result.body?.id,
    })),
  };
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Metodo nao permitido." }, 405);
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (token !== ADMIN_TOKEN) {
    return jsonResponse({ error: "Nao autorizado." }, 401);
  }

  const results = [];

  for (const sequenceConfig of SEQUENCES) {
    results.push(await provisionSequence(sequenceConfig));
  }

  const ok = results.every((result) => result.ok);
  return jsonResponse({ ok, results }, ok ? 200 : 502);
}
