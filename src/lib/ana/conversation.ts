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
  need?: "students" | "teachers" | "management" | "processes" | "product";
  gradeFit?: boolean;
  studentCount?: number;
  internetReady?: boolean;
  timeline?: string;
  commercialIntent: boolean;
  meetingIntent: boolean;
  contactConsent: boolean;
  contactRevoked: boolean;
};

export type AnaNextQuestion = {
  key: "need" | "grades" | "students" | "internet" | "timeline" | "contact";
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

  const normalized = normalizeKnowledgeText(value);
  const asksQuestion = value.includes("?") || /^(como|qual|quais|quanto|quando|onde|por que|porque|quem|o que|tem|posso|podem|voces|vcs)\b/.test(normalized);
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

function extractLeadQualification(messages: AnaMessage[]): AnaLeadQualification {
  const userMessages = messages.filter((message) => message.role === "user").map(messageText).filter(Boolean);
  const joinedRaw = userMessages.join(" \n");
  const joined = normalizeKnowledgeText(joinedRaw);
  const latestRaw = userMessages.at(-1) ?? "";
  const latest = normalizeKnowledgeText(latestRaw);
  const previousAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const previousQuestion = normalizeKnowledgeText(previousAssistant ? messageText(previousAssistant) : "");

  const email = joinedRaw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
  const phone = joinedRaw.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}/)?.[0]?.replace(/\s+/g, " ");
  const name = findFirst(
    joinedRaw,
    /(?:me chamo|meu nome (?:e|é))\s+([\p{L}][\p{L}\s'-]{1,80}?)(?=\s+(?:e\s+)?meu\s+e-?mail|[,.!?\n]|$)/iu,
  );
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
  const offerInterest = /\bl\s*\.?\s*e\s*\.?\s*i\s*\.?\s*a\b|\bleia\b/.test(joined) || schoolContext
    ? "leia" as const
    : /\b(curso|formacao|capacitacao|academy)\b/.test(joined)
      ? "academy" as const
      : /\b(consultoria|diagnostico|processo)\b/.test(joined)
        ? "consulting" as const
        : /\b(desenvolvimento|produto de ia|solucao de ia)\b/.test(joined)
          ? "product-development" as const
          : undefined;
  const need = /\b(aluno|alunos|estudante|estudantes|ensinar)\b/.test(joined)
    ? "students" as const
    : /\b(professor|professores|docente|docentes)\b/.test(joined)
      ? "teachers" as const
      : /\b(gestao|gestor|gestores|direcao|diretores)\b/.test(joined)
        ? "management" as const
        : /\b(processo|processos|operacao|operacoes)\b/.test(joined)
          ? "processes" as const
          : /\b(produto|aplicativo|sistema|solucao)\b/.test(joined)
            ? "product" as const
            : undefined;

  let gradeFit: boolean | undefined;
  if (/(?:\b9\s*(?:º|o|ano)|\bnono ano|\bensino medio|\b1\s*(?:ª|a)\s*serie|\b2\s*(?:ª|a)\s*serie|\b3\s*(?:ª|a)\s*serie)(?=\s|[.,!?]|$)/.test(joined)) gradeFit = true;
  if (/(?:\beducacao infantil|\bfundamental i|\bate o 8\s*(?:º|o)|\bsomente.*8\s*(?:º|o))(?=\s|[.,!?]|$)/.test(joined)) gradeFit = false;
  if (/^(sim|temos|atende|atendemos)\b/.test(canonical(latest)) && /9.*ano|ensino medio|series/.test(previousQuestion)) gradeFit = true;

  const studentCountMatch = joined.match(/\b(\d{1,5})\s*(?:alunos|estudantes)\b/);
  const studentCount = studentCountMatch ? Number(studentCountMatch[1]) : undefined;

  let internetReady: boolean | undefined;
  if (/\b(nao temos|nao possui|sem|falta)\b.{0,24}\binternet\b|\binternet\b.{0,24}\b(instavel|ruim|fraca)\b/.test(joined)) internetReady = false;
  else if (/\b(temos|possui|com)\b.{0,24}\binternet\b|\binternet\b.{0,24}\b(estavel|boa|rapida|adequada)\b/.test(joined)) internetReady = true;
  else if (/^(sim|temos|possui)\b/.test(canonical(latest)) && /internet/.test(previousQuestion)) internetReady = true;

  const timeline = findFirst(joinedRaw, /\b(este (?:ano|semestre)|pr[oó]ximo (?:ano|semestre)|em \d{4}|imediatamente|quanto antes)\b/iu)?.toLowerCase();
  const commercialIntent = /\b(quero|queremos|gostaria|interesse|contratar|implantar|proposta|orcamento|orçamento|preco|preço|custa|investimento)\b/.test(joined);
  const meetingIntent = /\b(agendar|marcar|reuniao|reunião|falar com (?:alguem|alguém|o time|vendas)|conversar com (?:alguem|alguém|o time|vendas))\b/.test(joined);
  const explicitConsent = /\b(pode(?:m)? (?:me )?(?:ligar|chamar|contatar|contactar|mandar (?:um )?email)|autorizo (?:o )?contato|aceito (?:o )?contato)\b/.test(joined);
  const requestedConsent = /autoriza.*contato|posso registrar.*(?:contato|dados|nome|e-mail|email|whatsapp)|qual.*(?:email|e-mail|whatsapp|telefone)/.test(previousQuestion);
  const contactRevoked = /\b(nao autorizo|nao quero (?:receber )?contato|nao me (?:ligue|chame|contate)|prefiro nao (?:informar|receber contato))\b/.test(latest);
  const contactConsent = !contactRevoked && (explicitConsent || Boolean(requestedConsent && (email || phone)));

  return {
    name,
    email,
    phone,
    organization,
    role,
    schoolSector,
    offerInterest,
    need,
    gradeFit,
    studentCount,
    internetReady,
    timeline,
    commercialIntent,
    meetingIntent,
    contactConsent,
    contactRevoked,
  };
}

function qualificationScore(qualification: AnaLeadQualification) {
  const relevant = qualification.offerInterest === "leia"
    ? [qualification.role, qualification.gradeFit, qualification.studentCount, qualification.internetReady, qualification.timeline]
    : [qualification.role, qualification.need, qualification.timeline];
  return Math.round(relevant.filter((value) => value !== undefined).length / relevant.length * 100);
}

function chooseNextQuestion(qualification: AnaLeadQualification, questions: string[]): AnaNextQuestion | undefined {
  const asked = normalizeKnowledgeText(questions.join(" "));
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
  } else if (!qualification.need && !/desafio|melhorar|resolver|busca/.test(asked)) {
    return { key: "need", text: "O que você gostaria de melhorar ou resolver hoje?" };
  }
  if (qualification.commercialIntent && !qualification.timeline && !/quando|prazo|comecar|começar/.test(asked)) {
    return { key: "timeline", text: "Quando vocês gostariam de começar?" };
  }
  const qualified = qualification.offerInterest === "leia"
    ? qualification.gradeFit === true && qualification.studentCount !== undefined && qualification.internetReady === true
    : Boolean(qualification.need && qualification.role);
  if ((qualification.meetingIntent || qualified) && !qualification.contactConsent && !qualification.contactRevoked && !/autoriza.*contato|posso registrar.*dados/.test(asked)) {
    return { key: "contact", text: "Posso registrar seu nome e seu melhor e-mail ou WhatsApp para o time continuar essa conversa?" };
  }
  return undefined;
}

function recentQuestions(messages: AnaMessage[]) {
  return messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) => messageText(message).split(/(?<=[?])\s+/))
    .filter((sentence) => sentence.includes("?"))
    .slice(-3);
}

export function analyzeAnaConversation(messages: AnaMessage[], pagePath?: string): AnaConversationState {
  const userMessages = messages.filter((message) => message.role === "user").map(messageText).filter(Boolean);
  const latest = userMessages.at(-1) ?? "";
  const turnKind = classifyAnaTurn(latest);
  const userTurnCount = userMessages.length;
  const pageHint = pagePath?.toLocaleLowerCase("pt-BR").startsWith("/leia") ? "leia" : undefined;
  const qualification = extractLeadQualification(messages);
  const questions = recentQuestions(messages);
  const score = qualificationScore(qualification);
  const isLead = Boolean(qualification.offerInterest || qualification.role || qualification.email || qualification.phone);
  const qualified = qualification.offerInterest === "leia"
    ? qualification.gradeFit === true && qualification.studentCount !== undefined && qualification.internetReady === true
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
  const nextQuestion = turnKind === "greeting" || turnKind === "acknowledgement" || turnKind === "gratitude" || turnKind === "farewell" || (!isLead && turnKind === "request")
    ? undefined
    : chooseNextQuestion(qualification, questions);

  const stage: AnaConversationStage = turnKind === "farewell"
    ? "closing"
    : leadStage === "handoff"
      ? "handoff"
      : nextQuestion?.key === "contact" || qualification.meetingIntent
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
    knownFacts: inferKnownFacts(userMessages),
    recentAssistantQuestions: questions,
    userTurnCount,
    qualification,
    qualificationScore: score,
    leadStage,
    shouldPersistLead: isLead,
    nextQuestion,
  };
}

export function immediateAnaReply(state: AnaConversationState, messages: AnaMessage[], handoffPersisted = false) {
  if (state.leadStage === "handoff" && handoffPersisted) {
    return "Perfeito, seu contato ficou registrado para o time da Amplify continuar essa conversa com você.";
  }
  if (state.turnKind === "greeting") return "Oi! Tudo bem? Como posso te ajudar?";
  if (state.turnKind === "gratitude") return "Eu que agradeço! Se precisar, estou por aqui.";
  if (state.turnKind === "farewell") return "Até mais! Foi um prazer conversar com você.";
  if (state.turnKind !== "acknowledgement") return undefined;

  const mentionsLeia = messages.some((message) => /l\s*\.\s*e\s*\.\s*i\s*\.\s*a\s*\.?/i.test(messageText(message)));
  if (mentionsLeia) {
    return "Claro. Se quiser, posso explicar algum ponto do L.E.I.A. com mais calma.";
  }
  return "Claro. Se quiser continuar, estou por aqui.";
}
