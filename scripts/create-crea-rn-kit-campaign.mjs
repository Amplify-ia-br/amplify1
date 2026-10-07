#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

const KIT_API_BASE_URL = "https://api.kit.com/v4";
const APPLY = process.argv.includes("--apply");
const VERIFY_ONLY = process.argv.includes("--verify");

function loadLocalEnv() {
  if (!existsSync(".env")) return;

  const lines = readFileSync(".env", "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadLocalEnv();

const TAGS = [
  "bootcamp:crea-rn-25-07-26",
  "bootcamp:crea-rn-25-07-26:programa_solicitado",
  "bootcamp:crea-rn-25-07-26:checkout_iniciado",
  "bootcamp:crea-rn-25-07-26:corporativo",
  "bootcamp:crea-rn-25-07-26:patrocinio",
  "bootcamp:crea-rn-25-07-26:pedido_aprovado",
  "bootcamp:crea-rn-25-07-26:participante_confirmado",
  "bootcamp:crea-rn-25-07-26:compareceu",
  "bootcamp:crea-rn-25-07-26:nao_compareceu",
  "bootcamp:programa_solicitado",
  "bootcamp:checkout_iniciado",
  "bootcamp:corporativo",
  "bootcamp:patrocinio",
  "bootcamp:pedido_aprovado",
  "bootcamp:participante_confirmado",
  "bootcamp:compareceu",
  "bootcamp:nao_compareceu",
];

const SEQUENCES = [
  {
    key: "interest",
    name: "CREA-RN Boot Camp - Programacao solicitada",
    env: "KIT_BOOTCAMP_CREA_RN_INTEREST_SEQUENCE_ID",
    tag: "bootcamp:crea-rn-25-07-26:programa_solicitado",
    emails: [
      {
        delay_value: 0,
        delay_unit: "hours",
        subject: "Programacao do Boot Camp IA para Engenharia",
        preview_text: "O que voce vai praticar no CREA-RN em 25 de julho.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Voce pediu a programacao do Boot Camp IA para os Desafios de Engenharia, no CREA-RN, em 25 de julho.</p>
<p>A proposta e simples: sair do discurso generico sobre inteligencia artificial e trabalhar aplicacoes que ajudam profissionais tecnicos a produzir documentos melhores, organizar decisoes, reduzir retrabalho e estruturar rotinas com mais metodo.</p>
<p>Durante o dia, vamos olhar para usos de IA em engenharia, agronomia, geociencias, empresas tecnicas e gestao profissional. A ideia nao e substituir criterio tecnico. E dar repertorio para usar IA com responsabilidade, ganho de produtividade e clareza operacional.</p>
<p><a href="https://amplify.ia.br/agenda/crea-rn-25-07-26">Ver detalhes e garantir minha vaga</a></p>`,
      },
      {
        delay_value: 1,
        delay_unit: "days",
        subject: "O que um engenheiro deve levar para o Boot Camp",
        preview_text: "Traga problemas reais. A IA entra como metodo, nao como moda.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>O melhor jeito de aproveitar o Boot Camp e chegar com problemas reais: relatorios, propostas, rotinas de analise, acompanhamento de obras, fiscalizacao, atendimento a clientes, planejamento ou tomada de decisao.</p>
<p>Vamos trabalhar a IA como apoio para raciocinio, organizacao e execucao. Isso significa transformar demandas abertas em prompts melhores, revisar saidas com criterio e criar fluxos que possam ser usados no trabalho depois do evento.</p>
<p>Se voce atua em area tecnica, esse e um dia para ganhar linguagem, metodo e pratica guiada.</p>
<p><a href="https://amplify.ia.br/agenda/crea-rn-25-07-26">Ver a pagina do evento</a></p>`,
      },
      {
        delay_value: 2,
        delay_unit: "days",
        subject: "Vale participar mesmo sem ser especialista em IA?",
        preview_text: "Sim. O evento foi desenhado para profissionais tecnicos.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Voce nao precisa ser especialista em IA para participar. O Boot Camp foi pensado para profissionais que precisam aplicar tecnologia com responsabilidade em problemas concretos.</p>
<p>O foco esta em metodo: como formular melhor, avaliar respostas, criar rotinas, documentar decisoes e identificar usos que fazem sentido para a realidade tecnica.</p>
<p>Se voce quer usar IA sem improviso, essa e a proposta.</p>
<p><a href="https://www.sympla.com.br/evento/bootcamp-ia-para-engenharia-crea-rn/3468714">Garantir minha vaga pelo Sympla</a></p>`,
      },
    ],
  },
  {
    key: "checkout_abandoned",
    name: "CREA-RN Boot Camp - Checkout iniciado",
    env: "KIT_BOOTCAMP_CREA_RN_CHECKOUT_ABANDONED_SEQUENCE_ID",
    tag: "bootcamp:crea-rn-25-07-26:checkout_iniciado",
    emails: [
      {
        delay_value: 2,
        delay_unit: "hours",
        subject: "Sua vaga no Boot Camp IA ainda pode ser confirmada",
        preview_text: "A inscricao e concluida com seguranca pelo Sympla.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Vi que voce abriu a inscricao do Boot Camp IA para os Desafios de Engenharia.</p>
<p>A confirmacao acontece pelo Sympla. Depois da compra, a comunicacao de preparacao e os proximos passos seguem por email.</p>
<p>O evento acontece em 25 de julho, das 09h as 18h, no CREA-RN.</p>
<p><a href="https://www.sympla.com.br/evento/bootcamp-ia-para-engenharia-crea-rn/3468714">Concluir inscricao</a></p>`,
      },
      {
        delay_value: 1,
        delay_unit: "days",
        subject: "Um dia de IA aplicada a rotina tecnica",
        preview_text: "Menos improviso. Mais metodo para aplicar IA no trabalho.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Se a sua duvida e se o Boot Camp entrega algo aplicavel, esse e o ponto central do encontro: praticar usos de IA em tarefas reais, com foco em engenharia, agronomia, gestao tecnica e produtividade profissional.</p>
<p>O objetivo e que voce saia com criterio para decidir onde usar IA, como estruturar prompts melhores e como transformar ferramentas em rotina de trabalho.</p>
<p><a href="https://www.sympla.com.br/evento/bootcamp-ia-para-engenharia-crea-rn/3468714">Garantir minha vaga</a></p>`,
      },
    ],
  },
  {
    key: "corporate",
    name: "CREA-RN Boot Camp - Plano corporativo",
    env: "KIT_BOOTCAMP_CREA_RN_CORPORATE_SEQUENCE_ID",
    tag: "bootcamp:crea-rn-25-07-26:corporativo",
    emails: [
      {
        delay_value: 0,
        delay_unit: "hours",
        subject: "Recebemos seu interesse em plano corporativo",
        preview_text: "Adriano vai conduzir a conversa sobre equipe e condicao.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Recebemos seu interesse em levar uma equipe para o Boot Camp IA para os Desafios de Engenharia.</p>
<p>O plano corporativo faz sentido quando a empresa quer criar linguagem comum, priorizar casos de uso e acelerar a aplicacao de IA em rotinas tecnicas com mais de uma pessoa da equipe.</p>
<p>O Adriano vai conduzir a conversa sobre quantidade de participantes, condicao e proximos passos.</p>`,
      },
      {
        delay_value: 1,
        delay_unit: "days",
        subject: "Como sua equipe pode aproveitar melhor o Boot Camp",
        preview_text: "Chegar com processos reais aumenta muito o retorno.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Para equipes tecnicas, o maior ganho do Boot Camp aparece quando as pessoas chegam com exemplos do trabalho: relatorios, propostas, fiscalizacao, documentos, atendimento, analises e rotinas de acompanhamento.</p>
<p>Assim, o dia vira uma base comum para discutir IA com criterio e transformar aprendizado em aplicacao interna.</p>
<p>Se quiser, responda este email com a quantidade aproximada de pessoas e o tipo de empresa. Isso ajuda a conversa com Adriano.</p>`,
      },
      {
        delay_value: 2,
        delay_unit: "days",
        subject: "Plano corporativo: sugestao de proximo passo",
        preview_text: "Fechar a quantidade cedo ajuda a organizar a participacao.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Se a ideia e levar uma equipe, o melhor proximo passo e definir uma quantidade aproximada de participantes e alinhar se o objetivo principal e produtividade, capacitacao, inovacao, gestao tecnica ou desenvolvimento comercial.</p>
<p>Com isso, Adriano consegue orientar a melhor condicao e o caminho de inscricao.</p>
<p><a href="https://wa.me/5511950350002?text=Ol%C3%A1%20Adriano%2C%20gostaria%20de%20falar%20sobre%20patroc%C3%ADnio%20ou%20plano%20corporativo%20para%20o%20Boot%20Camp%20IA%20para%20os%20Desafios%20de%20Engenharia%20em%20parceria%20com%20o%20CREA-RN.">Falar com Adriano</a></p>`,
      },
    ],
  },
  {
    key: "sponsor",
    name: "CREA-RN Boot Camp - Patrocinio",
    env: "KIT_BOOTCAMP_CREA_RN_SPONSOR_SEQUENCE_ID",
    tag: "bootcamp:crea-rn-25-07-26:patrocinio",
    emails: [
      {
        delay_value: 0,
        delay_unit: "hours",
        subject: "Recebemos seu interesse em patrocinio",
        preview_text: "O evento conecta sua marca a inovacao aplicada ao setor tecnico.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Recebemos seu interesse em conversar sobre patrocinio do Boot Camp IA para os Desafios de Engenharia.</p>
<p>A oportunidade e associar sua marca a uma agenda pratica de inovacao para engenheiros, empresas tecnicas e liderancas profissionais do Rio Grande do Norte.</p>
<p>Adriano vai conduzir a conversa sobre formatos, contrapartidas e condicoes.</p>`,
      },
      {
        delay_value: 1,
        delay_unit: "days",
        subject: "Por que patrocinar uma formacao pratica em IA",
        preview_text: "A conversa nao e sobre tecnologia abstrata, e sobre produtividade tecnica.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>O diferencial do Boot Camp e o publico: profissionais tecnicos buscando aplicar IA com responsabilidade em rotinas reais de trabalho.</p>
<p>Para uma marca parceira, isso cria uma associacao com produtividade, capacitacao, inovacao e desenvolvimento profissional no RN.</p>
<p>Se fizer sentido, responda este email com o tipo de parceria que voce imagina ou fale diretamente com Adriano.</p>`,
      },
    ],
  },
  {
    key: "confirmed",
    name: "CREA-RN Boot Camp - Participante confirmado",
    env: "KIT_BOOTCAMP_CREA_RN_CONFIRMED_SEQUENCE_ID",
    tag: "bootcamp:crea-rn-25-07-26:participante_confirmado",
    emails: [
      {
        delay_value: 0,
        delay_unit: "hours",
        subject: "Inscricao confirmada: Boot Camp IA no CREA-RN",
        preview_text: "Veja como se preparar para aproveitar melhor o dia.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Sua inscricao no Boot Camp IA para os Desafios de Engenharia foi confirmada.</p>
<p>O evento sera em 25 de julho, das 09h as 18h, no CREA-RN, em Natal.</p>
<p>Para aproveitar melhor, traga uma ou duas rotinas reais que voce gostaria de melhorar com IA: relatorio, proposta, planejamento, acompanhamento, diagnostico, analise ou documentacao.</p>`,
      },
      {
        delay_value: 3,
        delay_unit: "days",
        subject: "Antes do Boot Camp: escolha um problema tecnico real",
        preview_text: "Isso vai deixar o dia muito mais produtivo.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Antes do Boot Camp, separe um problema tecnico real do seu trabalho. Pode ser uma rotina repetitiva, um documento dificil, uma decisao que exige criterio ou um processo que hoje depende demais de improviso.</p>
<p>Quanto mais concreto for o problema, melhor sera a pratica.</p>`,
      },
      {
        delay_value: 1,
        delay_unit: "days",
        subject: "Amanha e o Boot Camp IA no CREA-RN",
        preview_text: "Horario, local e preparacao final.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Amanha nos encontramos no CREA-RN para o Boot Camp IA para os Desafios de Engenharia.</p>
<p>Horario: 09h as 18h. Local: CREA-RN, R. da Saudade - Lagoa Nova, Natal - RN.</p>
<p>Leve notebook, carregador e exemplos reais do seu trabalho. A pratica fica muito melhor quando parte de problemas concretos.</p>`,
      },
    ],
  },
  {
    key: "attended",
    name: "CREA-RN Boot Camp - Pos-evento compareceu",
    env: "KIT_BOOTCAMP_CREA_RN_ATTENDED_SEQUENCE_ID",
    tag: "bootcamp:crea-rn-25-07-26:compareceu",
    emails: [
      {
        delay_value: 1,
        delay_unit: "days",
        subject: "Proximos passos depois do Boot Camp",
        preview_text: "Transforme a pratica de ontem em rotina de trabalho.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Obrigado por participar do Boot Camp IA para os Desafios de Engenharia.</p>
<p>O principal agora e escolher uma rotina para aplicar primeiro. Nao tente automatizar tudo de uma vez. Comece por uma tarefa com alto volume, retrabalho ou impacto claro.</p>
<p>Depois, refine o prompt, crie criterio de revisao e documente o fluxo.</p>`,
      },
      {
        delay_value: 3,
        delay_unit: "days",
        subject: "Como levar IA para a equipe sem virar improviso",
        preview_text: "O valor aparece quando a pratica vira metodo compartilhado.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Se o Boot Camp abriu possibilidades para sua equipe, o proximo passo e transformar aprendizado individual em metodo compartilhado.</p>
<p>Isso significa definir casos prioritarios, criar padroes de uso, alinhar riscos e medir ganho real de produtividade.</p>
<p>Quando quiser discutir uma trilha para sua empresa, responda este email.</p>`,
      },
    ],
  },
  {
    key: "missed",
    name: "CREA-RN Boot Camp - Pos-evento nao compareceu",
    env: "KIT_BOOTCAMP_CREA_RN_MISSED_SEQUENCE_ID",
    tag: "bootcamp:crea-rn-25-07-26:nao_compareceu",
    emails: [
      {
        delay_value: 1,
        delay_unit: "days",
        subject: "Sentimos sua falta no Boot Camp",
        preview_text: "Podemos te avisar sobre uma proxima turma ou alternativa.",
        content: `<p>Oi, {{ subscriber.first_name | default: "tudo bem" }}.</p>
<p>Sentimos sua falta no Boot Camp IA para os Desafios de Engenharia.</p>
<p>Se voce ainda tem interesse em uma formacao pratica de IA para rotinas tecnicas, responda este email. Podemos te avisar sobre proximas turmas ou alternativas para empresas.</p>`,
      },
    ],
  },
];

const BROADCASTS = [
  {
    key: "d7_interest",
    description: "CREA-RN D-7 - Ultima semana para interessados",
    tag: "bootcamp:crea-rn-25-07-26:programa_solicitado",
    subject: "Ultima semana para decidir sobre o Boot Camp IA no CREA-RN",
    preview_text: "Um dia de IA aplicada a problemas tecnicos reais.",
    content: `<p>O Boot Camp IA para os Desafios de Engenharia acontece em 25 de julho, no CREA-RN.</p><p>Se voce quer aplicar IA com metodo em relatorios, propostas, rotinas tecnicas e decisoes profissionais, este e o momento de garantir sua vaga.</p><p><a href="https://www.sympla.com.br/evento/bootcamp-ia-para-engenharia-crea-rn/3468714">Garantir minha vaga</a></p>`,
  },
  {
    key: "d3_checkout",
    description: "CREA-RN D-3 - Checkout iniciado",
    tag: "bootcamp:crea-rn-25-07-26:checkout_iniciado",
    subject: "Sua inscricao no Boot Camp IA ainda nao foi concluida",
    preview_text: "Confirme sua vaga pelo Sympla.",
    content: `<p>Voce abriu a inscricao do Boot Camp IA para os Desafios de Engenharia, mas ainda pode faltar a confirmacao no Sympla.</p><p>O evento e presencial, em 25 de julho, das 09h as 18h, no CREA-RN.</p><p><a href="https://www.sympla.com.br/evento/bootcamp-ia-para-engenharia-crea-rn/3468714">Concluir inscricao</a></p>`,
  },
  {
    key: "d2_corporate",
    description: "CREA-RN D-2 - Plano corporativo",
    tag: "bootcamp:crea-rn-25-07-26:corporativo",
    subject: "Ainda da tempo de alinhar a participacao da sua equipe",
    preview_text: "Plano corporativo para empresas tecnicas e escritorios.",
    content: `<p>Se sua empresa quer levar uma equipe para o Boot Camp IA no CREA-RN, ainda podemos alinhar quantidade, condicao e proximos passos.</p><p>O foco e criar linguagem comum e casos de uso aplicaveis no trabalho tecnico.</p>`,
  },
  {
    key: "d1_confirmed",
    description: "CREA-RN D-1 - Logistica participantes",
    tag: "bootcamp:crea-rn-25-07-26:participante_confirmado",
    subject: "Amanha e o Boot Camp IA no CREA-RN",
    preview_text: "Local, horario e preparacao final.",
    content: `<p>Amanha nos encontramos no CREA-RN para o Boot Camp IA para os Desafios de Engenharia.</p><p>Horario: 09h as 18h. Local: CREA-RN, R. da Saudade - Lagoa Nova, Natal - RN.</p><p>Leve notebook, carregador e exemplos reais do seu trabalho.</p>`,
  },
  {
    key: "post_attended",
    description: "CREA-RN Pos-evento - Compareceu",
    tag: "bootcamp:crea-rn-25-07-26:compareceu",
    subject: "Obrigado por participar do Boot Camp IA",
    preview_text: "Agora e transformar pratica em rotina.",
    content: `<p>Obrigado por participar do Boot Camp IA para os Desafios de Engenharia.</p><p>Escolha uma rotina tecnica para aplicar primeiro, documente o fluxo e acompanhe o ganho real.</p>`,
  },
  {
    key: "post_missed",
    description: "CREA-RN Pos-evento - Nao compareceu",
    tag: "bootcamp:crea-rn-25-07-26:nao_compareceu",
    subject: "Sentimos sua falta no Boot Camp IA",
    preview_text: "Podemos avisar sobre uma proxima turma.",
    content: `<p>Sentimos sua falta no Boot Camp IA para os Desafios de Engenharia.</p><p>Se ainda fizer sentido, responda este email para avisarmos sobre proximas turmas ou alternativas para empresas.</p>`,
  },
];

function getApiKey() {
  return String(process.env.KIT_API_KEY || "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

async function kitRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${KIT_API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Kit-Api-Key": getApiKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload;
}

function extractTagId(payload) {
  return payload?.tag?.id || payload?.id || payload?.data?.id;
}

function extractSequenceId(payload) {
  return payload?.sequence?.id || payload?.id || payload?.data?.id;
}

function extractEmailId(payload) {
  return payload?.email?.id || payload?.sequence_email?.id || payload?.id || payload?.data?.id;
}

function extractBroadcastId(payload) {
  return payload?.broadcast?.id || payload?.id || payload?.data?.id;
}

async function ensureTag(name) {
  const payload = await kitRequest("/tags", {
    method: "POST",
    body: { name },
  });
  return { name, id: extractTagId(payload) };
}

async function createSequence(sequence) {
  const payload = await kitRequest("/sequences", {
    method: "POST",
    body: {
      name: sequence.name,
      active: false,
      repeat: false,
      hold: true,
      send_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      send_hour: 9,
      time_zone: "America/Sao_Paulo",
    },
  });
  const sequenceId = extractSequenceId(payload);
  const emails = [];

  for (const [index, email] of sequence.emails.entries()) {
    const emailPayload = await kitRequest(`/sequences/${sequenceId}/emails`, {
      method: "POST",
      body: {
        ...email,
        position: index,
        published: false,
      },
    });
    emails.push({
      subject: email.subject,
      id: extractEmailId(emailPayload),
    });
  }

  return { key: sequence.key, name: sequence.name, env: sequence.env, id: sequenceId, emails };
}

async function createBroadcast(broadcast, tagIds) {
  const tagId = tagIds.get(broadcast.tag);
  const payload = await kitRequest("/broadcasts", {
    method: "POST",
    body: {
      subject: broadcast.subject,
      preview_text: broadcast.preview_text,
      description: broadcast.description,
      content: broadcast.content,
      public: false,
      published_at: new Date().toISOString(),
      send_at: null,
      subscriber_filter: [{ all: [{ type: "tag", ids: [tagId] }] }],
    },
  });

  return {
    key: broadcast.key,
    description: broadcast.description,
    tag: broadcast.tag,
    id: extractBroadcastId(payload),
  };
}

function printPlan() {
  const summary = {
    mode: APPLY ? "apply" : VERIFY_ONLY ? "verify" : "dry-run",
    tags: TAGS.length,
    tagBasedSegmentations: 9,
    sequences: SEQUENCES.length,
    sequenceEmails: SEQUENCES.reduce((sum, sequence) => sum + sequence.emails.length, 0),
    broadcastDrafts: BROADCASTS.length,
    requiredEnvVars: SEQUENCES.map((sequence) => sequence.env),
  };

  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  printPlan();

  if (!APPLY && !VERIFY_ONLY) return;
  if (!getApiKey()) {
    throw new Error("KIT_API_KEY ausente. Exporte KIT_API_KEY antes de rodar com --apply ou --verify.");
  }

  if (VERIFY_ONLY) {
    const [tags, sequences] = await Promise.all([
      kitRequest("/tags"),
      kitRequest("/sequences"),
    ]);
    console.log(JSON.stringify({
      ok: true,
      tagsEndpoint: Boolean(tags),
      sequencesEndpoint: Boolean(sequences),
    }, null, 2));
    return;
  }

  const tagResults = [];
  const tagIds = new Map();

  for (const tag of TAGS) {
    const result = await ensureTag(tag);
    tagResults.push(result);
    tagIds.set(tag, result.id);
  }

  const sequenceResults = [];
  for (const sequence of SEQUENCES) {
    sequenceResults.push(await createSequence(sequence));
  }

  const broadcastResults = [];
  for (const broadcast of BROADCASTS) {
    broadcastResults.push(await createBroadcast(broadcast, tagIds));
  }

  console.log(JSON.stringify({
    ok: true,
    tags: tagResults,
    sequences: sequenceResults,
    broadcasts: broadcastResults,
    envVars: Object.fromEntries(sequenceResults.map((sequence) => [sequence.env, String(sequence.id)])),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
