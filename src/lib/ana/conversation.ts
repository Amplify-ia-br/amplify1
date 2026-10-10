import { normalizeKnowledgeText } from "../okf/core.js";
import type { AnaMessage } from "./types.js";

export type AnaTurnKind = "greeting" | "acknowledgement" | "gratitude" | "farewell" | "disclosure" | "request";
export type AnaConversationStage = "opening" | "discovery" | "solution" | "qualification" | "contact" | "handoff" | "closing";
export type AnaLeadStage = "engaged" | "qualifying" | "qualified" | "meeting_requested" | "handoff" | "nurture";

export type AnaLeadQualification = {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  role?: string;
  schoolSector?: "private" | "public";
  offerInterest?: "leia" | "academy" | "consulting" | "product-development";
  offerInterests?: Array<"leia" | "academy" | "consulting" | "product-development">;
  need?: "students" | "teachers" | "management" | "processes" | "product";
  needs?: Array<"students" | "teachers" | "management" | "processes" | "product">;
  gradeFit?: boolean;
  studentCount?: number;
  internetReady?: boolean;
  timeline?: string;
  commercialIntent: boolean;
  pricingIntent: boolean;
  meetingIntent: boolean;
  contactConsent: boolean;
  contactRevoked: boolean;
};

export type AnaNextQuestion = {
  key: "name" | "need" | "grades" | "students" | "internet" | "timeline" | "contactConsent" | "contact";
  text: string;
};

export type AnaConversationState = {
  turnKind: AnaTurnKind;
  stage: AnaConversationStage;
  shouldRetrieveKnowledge: boolean;
  shouldAskQuestion: boolean;
  pageHint?: "leia";
  knownFacts: string[];
  recentAssistantQuestions: string[];
  userTurnCount: number;
  qualification: AnaLeadQualification;
  qualificationScore: number;
  leadStage: AnaLeadStage;
  shouldPersistLead: boolean;
  shouldExpandLeia: boolean;
  answeredNameThisTurn: boolean;
  incompleteUserThought: boolean;
  nextQuestion?: AnaNextQuestion;
};

function messageText(message: AnaMessage) {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

function canonical(value: string) {
  return normalizeKnowledgeText(value).replace(/[!?.,;:()[\]{}"']/g, "").trim();
}

function matchesOnly(value: string, alternatives: RegExp) {
  return alternatives.test(canonical(value));
}

export function classifyAnaTurn(value: string): AnaTurnKind {
  if (matchesOnly(value, /^(oi|ola|oie|bom dia|boa tarde|boa noite)( tudo bem| tudo bom| como vai)?$/)) {
    return "greeting";
  }
  if (matchesOnly(value, /^(obrigado|obrigada|valeu|agradeco|muito obrigado|muito obrigada)$/)) {
    return "gratitude";
  }
  if (matchesOnly(value, /^(tchau|ate mais|ate logo|falou|encerramos|por enquanto e so)$/)) {
    return "farewell";
  }
  if (matchesOnly(value, /^(ok|okay|certo|entendi|compreendi|beleza|ta bom|tudo bem|perfeito|legal|faz sentido|ah sim)$/)) {
    return "acknowledgement";
  }
  if (matchesOnly(value, /^(sim|uhum|aham|isso|isso mesmo|exato|correto|claro|com certeza|tem sim|temos sim|atende sim|atendemos sim)$/)) {
    return "disclosure";
  }

  const normalized = normalizeKnowledgeText(value);
  const pricingIntent = /\b(?:preco|valor|investimento|orcamento|quanto|qto|cust(?:a|ar)|cutar)\b/.test(normalized);
  const asksQuestion = value.includes("?")
    || pricingIntent
    || /\b(?:queria|gostaria) (?:saber|entender)\b/.test(normalized)
    || /^(como|qual|quais|quanto|quando|onde|por que|porque|quem|o que|tem|posso|podem|voces|vcs)\b/.test(normalized);
  return asksQuestion ? "request" : "disclosure";
}

function inferKnownFacts(userMessages: string[]) {
  const joined = normalizeKnowledgeText(userMessages.join(" "));
  const facts: string[] = [];
  if (/\b(dono|dona|proprietario|proprietaria)\b.*\bescola\b/.test(joined)) facts.push("A pessoa é proprietária de uma escola.");
  else if (/\b(diretor|diretora|gestor|gestora|coordenador|coordenadora|professor|professora)\b.*\bescola\b/.test(joined)) facts.push("A pessoa atua profissionalmente em uma escola.");
  else if (/\bescola\b/.test(joined)) facts.push("A conversa envolve uma escola.");
  if (/\bescola particular\b/.test(joined)) facts.push("A escola é particular.");
  if (/\b(aluno|alunos|estudante|estudantes)\b/.test(joined)) facts.push("O interesse mencionado envolve estudantes.");
  if (/\b(professor|professores|docente|docentes)\b/.test(joined)) facts.push("O interesse mencionado envolve professores.");
  if (/\binternet (estavel|boa|rapida)\b/.test(joined)) facts.push("A pessoa informou que a escola possui internet adequada.");
  return facts;
}

function findFirst(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1]?.trim();
}

function previousAssistantText(messages: AnaMessage[], userIndex: number) {
  for (let index = userIndex - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") return normalizeKnowledgeText(messageText(messages[index]));
  }
  return "";
}

function isAffirmative(value: string) {
  return /^(?:sim|s|uhum|aham|isso|isso mesmo|exato|correto|claro|com certeza|tem sim|temos sim|atende sim|atendemos sim)(?:\b|$)/.test(canonical(value));
}

function isNegative(value: string) {
  return /^(?:nao|n|ainda nao|nao temos|nao possui|sem)(?:\b|$)/.test(canonical(value));
}

function contextualAnswers(messages: AnaMessage[]) {
  return messages.flatMap((message, index) => {
    if (message.role !== "user") return [];
    return [{ answer: messageText(message), question: previousAssistantText(messages, index) }];
  });
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function isNameQuestion(value: string) {
  return /qual (?:e )?(?:o )?seu nome|como voce se chama|como posso te chamar/.test(value);
}

function isIncompleteThought(value: string) {
  return /^(?:eu\s+)?(?:preciso|quero|gostaria|estou buscando|busco|a ideia e)(?:\s+(?:de|que|um|uma|algum|alguma))?$/.test(canonical(value));
}

function contextualName(value: string) {
  const candidate = value.trim().replace(/[.!?]+$/, "").trim();
  if (!/^[\p{L}][\p{L}'-]+(?:\s+[\p{L}][\p{L}'-]+){0,4}$/u.test(candidate)) return undefined;
  if (/\b(sim|nao|não|claro|certo|entendi|obrigado|obrigada|prefiro|dizer|informar|dono|dona|proprietario|proprietária|diretor|diretora|escola)\b/i.test(candidate)) return undefined;
  return candidate;
}

export function mergeAnaLeadQualification(
  previous: Partial<AnaLeadQualification> | undefined,
  current: AnaLeadQualification,
): AnaLeadQualification {
  if (!previous) return current;

  const contactRevoked = current.contactConsent
    ? false
    : current.contactRevoked || Boolean(previous.contactRevoked);
  const contactConsent = contactRevoked
    ? false
    : current.contactConsent || Boolean(previous.contactConsent);

  return {
    ...previous,
    ...Object.fromEntries(Object.entries(current).filter(([, value]) => value !== undefined)),
    offerInterests: unique([...(previous.offerInterests ?? []), ...(current.offerInterests ?? [])]),
    needs: unique([...(previous.needs ?? []), ...(current.needs ?? [])]),
    commercialIntent: Boolean(previous.commercialIntent || current.commercialIntent),
    pricingIntent: Boolean(previous.pricingIntent || current.pricingIntent),
    meetingIntent: Boolean(previous.meetingIntent || current.meetingIntent),
    contactConsent,
    contactRevoked,
  };
}

function extractLeadQualification(
  messages: AnaMessage[],
  previous?: Partial<AnaLeadQualification>,
): AnaLeadQualification {
  const userMessages = messages.filter((message) => message.role === "user").map(messageText).filter(Boolean);
  const joinedRaw = userMessages.join(" \n");
  const joined = normalizeKnowledgeText(joinedRaw);
  const latestRaw = userMessages.at(-1) ?? "";
  const latest = normalizeKnowledgeText(latestRaw);
  const previousAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const previousQuestion = normalizeKnowledgeText(previousAssistant ? messageText(previousAssistant) : "");
  const answers = contextualAnswers(messages);

  const email = joinedRaw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
  const phone = joinedRaw.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}/)?.[0]?.replace(/\s+/g, " ");
  const explicitName = findFirst(
    joinedRaw,
    /(?:me chamo|meu nome (?:e|é)|pode me chamar de|sou (?:o|a)\s+)\s*([\p{L}][\p{L}\s'-]{1,80}?)(?=\s+(?:e\s+)?meu\s+e-?mail|[,.!?\n]|$)/iu,
  );
  const name = (explicitName ? contextualName(explicitName) : undefined)
    ?? (isNameQuestion(previousQuestion) ? contextualName(latestRaw) : undefined);
  const organization = findFirst(joinedRaw, /(?:minha escola (?:se chama|e|é)|escola chamada)\s+([^,.!?\n]{2,120})/iu);

  const role = /\b(dono|dona|proprietario|proprietaria)\b.*\bescola\b/.test(joined)
    ? "proprietário(a)"
    : /\b(diretor|diretora)\b/.test(joined)
      ? "diretor(a)"
      : /\b(coordenador|coordenadora)\b/.test(joined)
        ? "coordenador(a)"
        : /\b(professor|professora)\b/.test(joined)
          ? "professor(a)"
          : undefined;
  const schoolSector = /\b(particular|privada)\b/.test(joined)
    ? "private" as const
    : /\b(publica|municipal|estadual|federal)\b/.test(joined)
      ? "public" as const
      : undefined;

  const schoolContext = /\b(escola|colegio|ensino|aluno|estudante)\b/.test(joined);
  const offerInterests = unique([
    ...(/\bl\s*\.?\s*e\s*\.?\s*i\s*\.?\s*a\b|\bleia\b/.test(joined) || schoolContext ? ["leia" as const] : []),
    ...(/\b(curso|formacao|capacitacao|academy)\b/.test(joined) ? ["academy" as const] : []),
    ...(/\b(consultoria|diagnostico|processo|otimizar|negocio)\b/.test(joined) ? ["consulting" as const] : []),
    ...(/\b(desenvolvimento|produto de ia|solucao de ia|implantar solucoes)\b/.test(joined) ? ["product-development" as const] : []),
  ]);
  const offerInterest = offerInterests[0];
  const needs = unique([
    ...(/\b(aluno|alunos|estudante|estudantes|ensinar)\b/.test(joined) ? ["students" as const] : []),
    ...(/\b(professor|professores|docente|docentes)\b/.test(joined) ? ["teachers" as const] : []),
    ...(/\b(gestao|gestor|gestores|direcao|diretores)\b/.test(joined) ? ["management" as const] : []),
    ...(/\b(processo|processos|operacao|operacoes|otimizar|otimizacao|otimizado|otimizada)\b/.test(joined) ? ["processes" as const] : []),
    ...(/\b(produto|aplicativo|sistema|solucao|solucoes)\b/.test(joined) ? ["product" as const] : []),
  ]);
  const need = needs[0];

  let gradeFit: boolean | undefined;
  if (/(?:\b9\s*(?:º|o|ano)|\bnono ano|\bensino medio|\b1\s*(?:ª|a)\s*serie|\b2\s*(?:ª|a)\s*serie|\b3\s*(?:ª|a)\s*serie)(?=\s|[.,!?]|$)/.test(joined)) gradeFit = true;
  if (/(?:\beducacao infantil|\bfundamental i|\bate o 8\s*(?:º|o)|\bsomente.*8\s*(?:º|o))(?=\s|[.,!?]|$)/.test(joined)) gradeFit = false;
  for (const { answer, question } of answers) {
    if (!/9.*ano|ensino medio|series|serie/.test(question)) continue;
    if (isAffirmative(answer)) gradeFit = true;
    else if (isNegative(answer)) gradeFit = false;
  }

  const studentCountMatch = joined.match(/\b(\d{1,5})\s*(?:alunos|estudantes)\b/);
  let studentCount = studentCountMatch ? Number(studentCountMatch[1]) : undefined;
  for (const { answer, question } of answers) {
    if (!/quantos.*(?:alunos|estudantes)|numero.*(?:alunos|estudantes)/.test(question)) continue;
    const contextualCount = canonical(answer).match(/\b(\d{1,5})\b/)?.[1];
    if (contextualCount) studentCount = Number(contextualCount);
  }

  let internetReady: boolean | undefined;
  if (/\b(nao temos|nao possui|sem|falta)\b.{0,24}\binternet\b|\binternet\b.{0,24}\b(instavel|ruim|fraca)\b/.test(joined)) internetReady = false;
  else if (/\b(temos|possui|com)\b.{0,24}\binternet\b|\binternet\b.{0,24}\b(estavel|boa|rapida|adequada)\b/.test(joined)) internetReady = true;
  for (const { answer, question } of answers) {
    if (!/internet|conexao/.test(question)) continue;
    if (isAffirmative(answer)) internetReady = true;
    else if (isNegative(answer)) internetReady = false;
  }

  const timeline = findFirst(joinedRaw, /\b(este (?:ano|semestre)|pr[oó]ximo (?:ano|semestre)|em \d{4}|imediatamente|quanto antes)\b/iu)?.toLowerCase();
  const pricingIntent = /\b(?:preco|valor|investimento|orcamento|quanto|qto|cust(?:a|ar)|cutar)\b/.test(joined);
  const commercialIntent = pricingIntent || /\b(quero|queremos|gostaria|interesse|contratar|implantar|proposta)\b/.test(joined);
  const meetingIntent = /\b(agendar|marcar|reuniao|reunião|falar com (?:alguem|alguém|o time|vendas)|conversar com (?:alguem|alguém|o time|vendas))\b/.test(joined);
  const explicitConsent = /\b(pode(?:m)? (?:me )?(?:ligar|chamar|contatar|contactar|mandar (?:um )?email)|autorizo (?:o )?contato|aceito (?:o )?contato)\b/.test(joined);
  const consentQuestion = /(?:quer|gostaria).*(?:time|alguem).*(?:entrar em contato|falar com voce)|posso.*(?:pedir|solicitar).*(?:contato|falar com voce)/.test(previousQuestion);
  const requestedContact = /qual.*(?:email|e-mail|whatsapp|telefone)|melhor.*(?:email|e-mail|whatsapp|telefone)/.test(previousQuestion);
  const contactRevoked = /\b(nao autorizo|nao quero (?:receber )?contato|nao me (?:ligue|chame|contate)|prefiro nao (?:informar|receber contato))\b/.test(latest);
  const contactConsent = !contactRevoked && (
    explicitConsent
    || Boolean(consentQuestion && isAffirmative(latestRaw))
    || Boolean(requestedContact && (email || phone))
  );

  return mergeAnaLeadQualification(previous, {
    name,
    email,
    phone,
    organization,
    role,
    schoolSector,
    offerInterest,
    offerInterests,
    need,
    needs,
    gradeFit,
    studentCount,
    internetReady,
    timeline,
    commercialIntent,
    pricingIntent,
    meetingIntent,
    contactConsent,
    contactRevoked,
  });
}

function qualificationScore(qualification: AnaLeadQualification) {
  const relevant = qualification.offerInterest === "leia"
    ? [qualification.role, qualification.gradeFit, qualification.studentCount, qualification.internetReady, qualification.need, qualification.timeline]
    : [qualification.role, qualification.need, qualification.timeline];
  return Math.round(relevant.filter((value) => value !== undefined).length / relevant.length * 100);
}

function chooseNextQuestion(
  qualification: AnaLeadQualification,
  questions: string[],
  incompleteUserThought: boolean,
  userTurnCount: number,
): AnaNextQuestion | undefined {
  const asked = normalizeKnowledgeText(questions.join(" "));
  if (incompleteUserThought) {
    return { key: "need", text: "Pode me contar melhor o que você precisa?" };
  }
  if (
    userTurnCount <= 2
    && !qualification.name
    && qualification.gradeFit !== false
    && !qualification.contactRevoked
    && !/qual (?:e )?(?:o )?seu nome|como voce se chama|como posso te chamar/.test(asked)
  ) {
    return { key: "name", text: "Qual é o seu nome?" };
  }
  if (qualification.offerInterest === "leia") {
    if (qualification.gradeFit === undefined && !/9.*ano|ensino medio|series/.test(asked)) {
      return { key: "grades", text: "Sua escola atende turmas do 9º ano do Ensino Fundamental à 3ª série do Ensino Médio?" };
    }
    if (qualification.gradeFit === false) return undefined;
    if (qualification.studentCount === undefined && !/quantos.*(?:alunos|estudantes)|numero.*(?:alunos|estudantes)/.test(asked)) {
      return { key: "students", text: "Quantos estudantes vocês imaginam atender?" };
    }
    if (qualification.internetReady === undefined && !/internet/.test(asked)) {
      return { key: "internet", text: "A escola tem conexão estável à internet para as turmas?" };
    }
    if (!qualification.need && !/necessidade|objetivo|ensinar|melhorar|resolver/.test(asked)) {
      return { key: "need", text: "Qual é a principal necessidade da escola com IA hoje?" };
    }
  } else if (!qualification.need && !/desafio|melhorar|resolver|busca/.test(asked)) {
    return { key: "need", text: "O que você gostaria de melhorar ou resolver hoje?" };
  }
  if (qualification.commercialIntent && !qualification.timeline && !/quando|prazo|comecar|começar/.test(asked)) {
    return { key: "timeline", text: "Quando vocês gostariam de começar?" };
  }
  const qualified = qualification.offerInterest === "leia"
    ? qualification.gradeFit === true && qualification.studentCount !== undefined && qualification.internetReady === true && Boolean(qualification.need)
    : Boolean(qualification.need && qualification.role);
  if ((qualification.meetingIntent || qualified) && !qualification.contactConsent && !qualification.contactRevoked && !/entrar em contato|falar com voce/.test(asked)) {
    return { key: "contactConsent", text: "Quer que eu peça para alguém do nosso time entrar em contato com você?" };
  }
  if (qualification.contactConsent && !qualification.name) {
    return { key: "name", text: "Qual é o seu nome?" };
  }
  if (qualification.contactConsent && !qualification.email && !qualification.phone && !/qual.*(?:email|e-mail|whatsapp|telefone)|melhor.*(?:email|e-mail|whatsapp|telefone)/.test(asked)) {
    return { key: "contact", text: "Qual é o melhor e-mail ou WhatsApp para falar com você?" };
  }
  return undefined;
}

function recentQuestions(messages: AnaMessage[]) {
  return messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) => messageText(message).split(/(?<=[?])\s+/))
    .filter((sentence) => sentence.includes("?"))
    .slice(-12);
}

export function analyzeAnaConversation(
  messages: AnaMessage[],
  pagePath?: string,
  previousQualification?: Partial<AnaLeadQualification>,
): AnaConversationState {
  const userMessages = messages.filter((message) => message.role === "user").map(messageText).filter(Boolean);
  const latest = userMessages.at(-1) ?? "";
  const turnKind = classifyAnaTurn(latest);
  const userTurnCount = userMessages.length;
  const pageHint = pagePath?.toLocaleLowerCase("pt-BR").startsWith("/leia") ? "leia" : undefined;
  const qualification = extractLeadQualification(messages, previousQualification);
  const questions = recentQuestions(messages);
  const previousAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const previousAssistantText = previousAssistant ? normalizeKnowledgeText(messageText(previousAssistant)) : "";
  const answeredNameThisTurn = Boolean(qualification.name && isNameQuestion(previousAssistantText));
  const incompleteUserThought = isIncompleteThought(latest);
  const shouldExpandLeia = !messages.some((message) => (
    message.role === "assistant"
    && /laboratorio escolar de inteligencia artificial/.test(normalizeKnowledgeText(messageText(message)))
  ));
  const score = qualificationScore(qualification);
  const hasLeadContext = Boolean(qualification.offerInterest || qualification.role || qualification.email || qualification.phone || qualification.need);
  const isLead = Boolean(qualification.name || hasLeadContext);
  const qualified = qualification.offerInterest === "leia"
    ? qualification.gradeFit === true && qualification.studentCount !== undefined && qualification.internetReady === true && Boolean(qualification.need)
    : score >= 65;
  const hasContact = Boolean(qualification.email || qualification.phone);
  const leadStage: AnaLeadStage = qualification.gradeFit === false
    ? "nurture"
    : qualification.contactConsent && hasContact
    ? "handoff"
    : qualification.meetingIntent
      ? "meeting_requested"
      : qualified
        ? "qualified"
        : isLead && userTurnCount > 1
          ? "qualifying"
          : "engaged";
  const nextQuestion = answeredNameThisTurn && !hasLeadContext
    ? undefined
    : turnKind === "greeting" || turnKind === "acknowledgement" || turnKind === "gratitude" || turnKind === "farewell"
    ? undefined
    : chooseNextQuestion(qualification, questions, incompleteUserThought, userTurnCount);

  const stage: AnaConversationStage = turnKind === "farewell"
    ? "closing"
    : leadStage === "handoff"
      ? "handoff"
      : nextQuestion?.key === "contactConsent" || nextQuestion?.key === "contact" || qualification.meetingIntent
        ? "contact"
    : userTurnCount === 1 && turnKind === "greeting"
      ? "opening"
      : isLead && (userTurnCount > 1 || turnKind === "disclosure")
        ? "qualification"
      : turnKind === "request"
        ? "solution"
        : "discovery";

  return {
    turnKind,
    stage,
    shouldRetrieveKnowledge: turnKind === "request",
    shouldAskQuestion: Boolean(nextQuestion),
    pageHint,
    knownFacts: unique([
      ...inferKnownFacts(userMessages),
      ...(qualification.gradeFit === true ? ["A escola atende à faixa de séries do L.E.I.A."] : []),
      ...(qualification.gradeFit === false ? ["A escola não atende à faixa de séries do L.E.I.A."] : []),
      ...(qualification.studentCount !== undefined ? [`A pessoa informou ${qualification.studentCount} estudantes.`] : []),
      ...(qualification.internetReady === true ? ["A escola possui conexão estável à internet."] : []),
      ...(qualification.internetReady === false ? ["A escola não possui conexão adequada à internet."] : []),
      ...(qualification.needs?.includes("students") ? ["A necessidade inclui ensinar IA aos estudantes."] : []),
      ...(qualification.needs?.includes("processes") || qualification.needs?.includes("product")
        ? ["A necessidade também inclui aplicar IA na operação da escola."]
        : []),
    ]),
    recentAssistantQuestions: questions,
    userTurnCount,
    qualification,
    qualificationScore: score,
    leadStage,
    shouldPersistLead: isLead,
    shouldExpandLeia,
    answeredNameThisTurn,
    incompleteUserThought,
    nextQuestion,
  };
}

export function immediateAnaReply(state: AnaConversationState, messages: AnaMessage[], handoffPersisted = false) {
  if (state.leadStage === "handoff") {
    return handoffPersisted
      ? "Perfeito, seu contato ficou registrado para o time da Amplify continuar essa conversa com você."
      : undefined;
  }
  if (state.turnKind === "greeting") {
    return state.qualification.name
      ? `Oi, ${state.qualification.name.split(/\s+/)[0]}! Tudo bem? Como posso te ajudar?`
      : "Oi! Tudo bem? Eu sou a Ana. Qual é o seu nome?";
  }
  if (state.turnKind === "gratitude") return "Eu que agradeço! Se precisar, estou por aqui.";
  if (state.turnKind === "farewell") return "Até mais! Foi um prazer conversar com você.";
  if (state.answeredNameThisTurn) {
    const firstName = state.qualification.name?.split(/\s+/)[0];
    if (!state.nextQuestion) return `Prazer, ${firstName}. Como posso te ajudar?`;
    return `Prazer, ${firstName}. ${state.nextQuestion.text}`;
  }
  if (state.incompleteUserThought) {
    const firstName = state.qualification.name?.split(/\s+/)[0];
    return firstName
      ? `Claro, ${firstName}. Pode me contar melhor o que você precisa?`
      : "Claro. Pode me contar melhor o que você precisa?";
  }
  if (state.turnKind === "disclosure" && state.nextQuestion) {
    if (state.nextQuestion.key === "name") return "Entendi. Qual é o seu nome?";
    const transitions: Record<AnaNextQuestion["key"], string> = {
      name: "Entendi.",
      grades: "Entendi.",
      students: "Certo.",
      internet: state.qualification.studentCount
        ? `Certo, ${state.qualification.studentCount} estudantes.`
        : "Certo.",
      need: "Isso ajuda.",
      timeline: "Entendi.",
      contactConsent: "Pelo que você contou, vale a pena continuar essa conversa.",
      contact: "Ótimo.",
    };
    return `${transitions[state.nextQuestion.key]} ${state.nextQuestion.text}`;
  }
  if (state.turnKind !== "acknowledgement") return undefined;

  const mentionsLeia = messages.some((message) => /l\s*\.\s*e\s*\.\s*i\s*\.\s*a\s*\.?/i.test(messageText(message)));
  if (mentionsLeia) {
    const productName = state.shouldExpandLeia
      ? "L.E.I.A. — Laboratório Escolar de Inteligência Artificial"
      : "L.E.I.A.";
    return `Claro. Se quiser, posso explicar algum ponto do ${productName} com mais calma.`;
  }
  return "Claro. Se quiser continuar, estou por aqui.";
}
