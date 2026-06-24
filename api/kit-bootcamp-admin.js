export const config = { runtime: "edge" };

const KIT_API_BASE_URL = "https://api.kit.com/v4";
const ADMIN_TOKEN = "95b32c7d106abf091b91065f405a7ab5176a07f20f383de0";
const SEQUENCE_NAME = "Bootcamp IA para Negocios Natal - Corporativo";

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

async function findSequenceByName() {
  const result = await kitRequest("/sequences");
  if (!result.ok) return { result, sequence: null };

  const sequence = extractSequences(result.body).find((item) => clean(item?.name) === SEQUENCE_NAME);
  return { result, sequence: sequence || null };
}

async function createSequence() {
  const result = await kitRequest("/sequences", {
    method: "POST",
    body: {
      name: SEQUENCE_NAME,
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
    body: email,
  });
}

async function createCorporateEmails(sequenceId) {
  const emails = [
    {
      subject: "Recebi seu interesse no plano corporativo do Bootcamp em Natal",
      preview_text: "Vou te ajudar a montar o melhor formato para sua equipe.",
      content: `
        <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
        <p>Recebi seu interesse no plano corporativo do Bootcamp IA para negocios em Natal.</p>
        <p>A proposta e simples: ajudar sua equipe a sair do uso solto de IA e entrar em um metodo pratico para diagnosticar oportunidades, redesenhar rotinas e priorizar casos de uso que geram resultado.</p>
        <p>Se voce ja abriu a conversa no WhatsApp com o Adriano, ele vai conduzir os detalhes de ingressos, condicoes e disponibilidade da turma.</p>
        <p>Se ainda nao abriu, responda este email com quantidade estimada de participantes e objetivo da empresa.</p>
        <p>Nos vemos no Bootcamp.</p>
        <p>Leonardo Camacho<br>Educador de IA e Head de Solucoes da Amplify</p>
      `,
      published: true,
      delay_value: 0,
      delay_unit: "days",
    },
    {
      subject: "Como justificar o Bootcamp IA para negocios para a empresa",
      preview_text: "Tres argumentos para levar a decisao adiante.",
      content: `
        <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
        <p>Quando uma empresa leva um grupo para o Bootcamp, o ganho nao esta apenas no conteudo. O principal valor e criar linguagem comum para a equipe decidir onde a IA entra, onde nao entra e quais projetos merecem prioridade.</p>
        <p>Tres bons motivos para aprovar uma turma corporativa:</p>
        <ul>
          <li>reduzir improviso no uso de IA;</li>
          <li>mapear oportunidades concretas por area;</li>
          <li>voltar com criterios para priorizar automacoes, agentes e melhorias de processo.</li>
        </ul>
        <p>Se quiser, envie ao Adriano o numero de pessoas e o contexto da sua equipe para avaliarmos a melhor condicao.</p>
        <p>Leonardo Camacho</p>
      `,
      published: true,
      delay_value: 2,
      delay_unit: "days",
    },
    {
      subject: "Ultimo lembrete sobre condicao corporativa para Natal",
      preview_text: "A turma tem vagas limitadas e o lote muda em breve.",
      content: `
        <p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
        <p>Passando para lembrar do seu interesse em ingressos corporativos para o Bootcamp IA para negocios em Natal.</p>
        <p>A turma presencial tem limite de vagas e o lote individual muda em 10/07. Para equipes, a condicao depende da quantidade de participantes e disponibilidade no momento da solicitacao.</p>
        <p>Se a conversa ainda fizer sentido, fale com o Adriano e envie a quantidade estimada de pessoas. Assim ele consegue retornar com uma proposta objetiva.</p>
        <p>Leonardo Camacho</p>
      `,
      published: true,
      delay_value: 5,
      delay_unit: "days",
    },
  ];

  const results = [];

  for (const email of emails) {
    results.push(await createSequenceEmail(sequenceId, email));
  }

  return results;
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

  const found = await findSequenceByName();
  let sequence = found.sequence;
  let created = false;
  let createResult = null;
  let emailResults = [];

  if (!sequence) {
    const createdSequence = await createSequence();
    createResult = createdSequence.result;
    sequence = createdSequence.sequence;
    created = true;

    if (!createResult.ok || !sequence?.id) {
      return jsonResponse({ ok: false, found: found.result, create: createResult }, 502);
    }

    emailResults = await createCorporateEmails(sequence.id);
  }

  return jsonResponse({
    ok: true,
    created,
    sequence: {
      id: sequence?.id,
      name: sequence?.name || SEQUENCE_NAME,
    },
    emails: emailResults.map((result) => ({
      ok: result.ok,
      status: result.status,
      id: result.body?.email?.id || result.body?.sequence_email?.id || result.body?.id,
    })),
  });
}
