import { normalizeKnowledgeText } from "../okf/core.js";
import type { AnaMessage } from "./types.js";

export type AnaTurnKind = "greeting" | "acknowledgement" | "gratitude" | "farewell" | "disclosure" | "request";
export type AnaConversationStage = "opening" | "discovery" | "solution" | "qualification" | "contact" | "handoff" | "closing";
export type AnaLeadStage = "engaged" | "qualifying" | "qualified" | "meeting_requested" | "handoff" | "nurture";
export type AnaOfferInterest = "leia" | "academy" | "consulting" | "product-development";
export type AnaQualificationFocus = AnaOfferInterest | "multiple";

export type AnaLeadQualification = {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  role?: string;
  schoolSector?: "private" | "public";
  offerInterest?: AnaOfferInterest;
  offerInterests?: AnaOfferInterest[];
  qualificationFocus?: AnaQualificationFocus;
  multiOfferInterest?: boolean;
  need?: "students" | "teachers" | "management" | "processes" | "product";
  needs?: Array<"students" | "teachers" | "management" | "processes" | "product">;
  gradeFit?: boolean;
  studentCount?: number;
  internetReady?: boolean;
  businessChallenge?: string;
  timeline?: string;
  commercialIntent: boolean;
  pricingIntent: boolean;
  meetingIntent: boolean;
  advancementIntent: boolean;
  contactConsent: boolean;
  contactRevoked: boolean;
};

export type AnaNextQuestion = {
  key: "name" | "need" | "priority" | "grades" | "students" | "internet" | "businessChallenge" | "timeline" | "contactConsent" | "contact";
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
  answerRequired: boolean;
  acceptedAssistantOffer?: string;
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
    || /\b(?:quero|queria|gostaria|preciso) (?:saber|entender|ver|conhecer)\b/.test(normalized)
    || /\b(?:quero|queria|gostaria|preciso)(?: de)? (?:um|uma)?\s*(?:diagnostico|proposta|orcamento)\b/.test(normalized)
    || /^(?:me )?(?:explique|mostre|revele|exiba|conte|fale)\b/.test(normalized)
    || /^(como|qual|quais|quanto|quando|onde|por que|porque|quem|o que|tem|posso|podem|voces|vcs)\b/.test(normalized);
  return asksQuestion ? "request" : "disclosure";
}

function requiresKnowledgeAnswer(value: string, turnKind: AnaTurnKind, incompleteUserThought: boolean) {
  if (incompleteUserThought || turnKind === "greeting" || turnKind === "acknowledgement" || turnKind === "gratitude" || turnKind === "farewell") {
    return false;
  }
  if (turnKind === "request") return true;

  const normalized = normalizeKnowledgeText(value);
  const describesNeed = /\b(?:ensinar|formar|capacitar|implantar|implementar|aplicar|melhorar|otimizar|automatizar|resolver|transformar)\b.{0,80}\b(?:ia|inteligencia artificial|alunos|estudantes|professores|escola|negocio|operacao|processos?|produto|solucao|solucoes)\b/.test(normalized)
    || /\b(?:ia|inteligencia artificial|alunos|estudantes|professores|escola|negocio|operacao|processos?|produto|solucao|solucoes)\b.{0,80}\b(?:ensinar|formar|capacitar|implantar|implementar|aplicar|melhorar|otimizar|automatizar|resolver|transformar)\b/.test(normalized);
  const asksForOptions = /\b(?:opcao|opcoes|alternativa|alternativas|solucao|solucoes|produto|produtos|servico|servicos|ajuda|ajudar)\b/.test(normalized)
    && /\b(?:quero|queria|preciso|gostaria|busco|procurando|frente|frentes|como|quais)\b/.test(normalized);
  return describesNeed || asksForOptions;
}

function acceptedAssistantOffer(latestUserMessage: string, previousAssistantMessage: string) {
  if (!previousAssistantMessage) return undefined;

  const offeredExplanation = /(?:se (?:voce )?quiser[, ]+)?(?:eu )?posso (?:te )?(?:explicar|mostrar|contar|detalhar)\b/.test(previousAssistantMessage);
  if (!offeredExplanation) return undefined;

  const acceptance = canonical(latestUserMessage);
  const accepted = /^(?:(?:legal|otimo|perfeito|claro|sim|beleza)[, ]+)*(?:quero sim|quero|pode sim|pode|por favor|me explica|explique|manda ver|vamos la)(?:\b|$)/.test(acceptance)
    || /^(?:sim|claro|com certeza)(?:\b|$)/.test(acceptance);

  return accepted ? previousAssistantMessage : undefined;
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
  return /^(?:sim|s|uhum|aham|isso|isso mesmo|exato|correto|claro|com certeza|pode sim|podem sim|tem sim|temos sim|atende sim|atendemos sim)(?:\b|$)/.test(canonical(value));
}

function isNegative(value: string) {
  return /^(?:nao|n|ainda nao|nao temos|nao possui|sem)(?:\b|$)/.test(canonical(value));
}

function isContactConsentQuestion(value: string) {
  return /(?:quer|gostaria).*(?:time|alguem).*(?:entr(?:ar|e) em contato|falar com voce)|posso.*(?:pedir|solicitar).*(?:contato|falar com voce)/.test(value);
}

function isContactDetailQuestion(value: string) {
  return /qual.*(?:email|e-mail|whatsapp|telefone)|melhor.*(?:email|e-mail|whatsapp|telefone)/.test(value);
}

function hasExplicitContactConsent(value: string) {
  const normalized = canonical(value);
  return /\b(?:autorizo|aceito) (?:o )?contato\b/.test(normalized)
    || /\bpode(?:m)? (?:me )?(?:ligar|contatar|contactar)\b/.test(normalized)
    || /\bpode(?:m)? (?:entrar em contato|falar comigo)\b/.test(normalized)
    || /\bpode(?:m)? (?:me )?(?:mandar|enviar) (?:um )?e-?mail\b/.test(normalized)
    || /\bpode(?:m)? (?:me )?chamar (?:no|pelo) whatsapp\b/.test(normalized)
    || /\b(?:me ligue|me contate|entre em contato comigo)\b/.test(normalized);
}

function hasExplicitContactRevocation(value: string) {
  const normalized = canonical(value);
  const conservativeRevocation = /\b(?:nao|prefiro|pare|parem|retiro|retiramos|revogo|revogamos|cancelo|cancelamos)\b.{0,80}\b(?:autorizacao|contato|contatar|contactar|ligar|chamar|mensagem|mensagens|e-?mail|whatsapp|telefone|falar comigo)\b/.test(normalized);
  return conservativeRevocation
    || /\bnao autorizo (?:o )?contato\b/.test(normalized)
    || /\bnao quero (?:receber )?contato\b/.test(normalized)
    || /\bnao (?:quero|gostaria) que (?:entrem em contato|falem) comigo\b/.test(normalized)
    || /\bnao (?:entre|entrem) em contato comigo\b/.test(normalized)
    || /\bnao me (?:ligue|liguem|chame|chamem|contate|contatem|contacte|contactem)\b/.test(normalized)
    || /\bnao me (?:mande|mandem|envie|enviem) (?:e-?mail|mensagem|whatsapp)\b/.test(normalized)
    || /\bparem? de me (?:ligar|chamar|contatar|contactar|mandar (?:e-?mail|mensagem))\b/.test(normalized)
    || /\bprefiro nao (?:informar|receber contato|ser contatad[oa])\b/.test(normalized);
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

function isPriorityQuestion(value: string) {
  return /(?:qual|o que).*(?:mais urgente|prioridade)|por (?:qual|onde).*(?:comecar|seguir)|implementar o l.*e.*i.*a.*ou.*(?:operacao|gestao)/.test(value);
}

function isBusinessChallengeQuestion(value: string) {
  return /qual.*(?:problema|processo|desafio).*(?:melhorar|resolver|ia)|o que.*(?:gestao|operacao|negocio).*(?:melhorar|resolver)/.test(value);
}

function qualificationFocusFromAnswer(value: string): AnaQualificationFocus | undefined {
  const normalized = canonical(value);
  if (/\b(?:as duas|os dois|ambas|ambos|duas frentes|as duas frentes|tudo isso)\b/.test(normalized)) return "multiple";
  if (/\b(?:alunos|estudantes|ensino|pedagogic|l\s*e\s*i\s*a|leia)\b/.test(normalized)) return "leia";
  if (/\b(?:gestao|operacao|processos?|negocio|consultoria|administrativ)\b/.test(normalized)) return "consulting";
  if (/\b(?:professores|docentes|equipe|capacitacao|treinamento|academy)\b/.test(normalized)) return "academy";
  if (/\b(?:produto|aplicativo|sistema|solucao propria|desenvolvimento)\b/.test(normalized)) return "product-development";
  return undefined;
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
    multiOfferInterest: Boolean(previous.multiOfferInterest || current.multiOfferInterest),
    commercialIntent: Boolean(previous.commercialIntent || current.commercialIntent),
    pricingIntent: Boolean(previous.pricingIntent || current.pricingIntent),
    meetingIntent: Boolean(previous.meetingIntent || current.meetingIntent),
    advancementIntent: Boolean(previous.advancementIntent || current.advancementIntent),
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
    ...(/\b(processo|processos|operacao|operacoes|negocio|negocios|melhorar (?:meu |o )?negocio|otimizar|otimizacao|otimizado|otimizada)\b/.test(joined) ? ["processes" as const] : []),
    ...(/\b(produto|aplicativo|sistema|solucao|solucoes)\b/.test(joined) ? ["product" as const] : []),
  ]);
  const need = needs[0];
  const multiOfferInterest = /\b(?:alem do l\s*\.?\s*e\s*\.?\s*i\s*\.?\s*a|fora o l\s*\.?\s*e\s*\.?\s*i\s*\.?\s*a|duas frentes|ambas as frentes|outras? (?:opcoes|frentes|solucoes|servicos)|o que mais (?:voces|vcs|a amplify) (?:tem|oferece|podem oferecer|poderiam oferecer))\b/.test(joined)
    || (needs.includes("students") && (needs.includes("management") || needs.includes("processes") || needs.includes("product")));

  let qualificationFocus: AnaQualificationFocus | undefined;
  let businessChallenge: string | undefined;
  for (const { answer, question } of answers) {
    if (isPriorityQuestion(question)) qualificationFocus = qualificationFocusFromAnswer(answer) ?? qualificationFocus;
    if (isBusinessChallengeQuestion(question) && canonical(answer).length >= 3 && !/^(?:sim|nao|certo|entendi|legal)$/.test(canonical(answer))) {
      businessChallenge = answer.trim().slice(0, 500);
    }
  }

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

  let timeline = findFirst(joinedRaw, /\b(este (?:ano|semestre)|pr[oó]ximo (?:ano|semestre)|em \d{4}|imediatamente|quanto antes|daqui a \d+ (?:dias|semanas|meses)|m[eê]s que vem)\b/iu)?.toLowerCase();
  for (const { answer, question } of answers) {
    if (!/quando|prazo|comecar|começar/.test(question)) continue;
    const normalizedAnswer = canonical(answer);
    if (normalizedAnswer.length >= 3 && !/^(?:nao sei|ainda nao sei|vamos ver)$/.test(normalizedAnswer)) {
      timeline = answer.trim().slice(0, 200);
    }
  }
  const pricingIntent = /\b(?:preco|valor|investimento|orcamento|quanto|qto|cust(?:a|ar)|cutar)\b/.test(joined);
  const commercialIntent = pricingIntent || /\b(quero|queremos|gostaria|interesse|contratar|implantar|proposta)\b/.test(joined);
  const meetingIntent = /\b(agendar|marcar|reuniao|reunião|falar com (?:alguem|alguém|o time|vendas)|conversar com (?:alguem|alguém|o time|vendas))\b/.test(joined);
  const advancementIntent = meetingIntent
    || /\b(?:quero|queremos|gostaria|podemos|como)\b.{0,40}\b(?:contratar|comecar|começar|avancar|avançar|proposta|proximo passo|próximo passo|seguir)\b/.test(joined)
    || /\b(?:quero uma proposta|podem enviar uma proposta|qual (?:e|seria) o proximo passo|qual (?:é|seria) o próximo passo|o que (?:fazer|acontece) agora)\b/.test(joined);
  let contactConsent = false;
  let contactRevoked = false;
  for (const { answer, question } of answers) {
    if (hasExplicitContactRevocation(answer)) {
      contactConsent = false;
      contactRevoked = true;
      continue;
    }
    if (hasExplicitContactConsent(answer)) {
      contactConsent = true;
      contactRevoked = false;
    }
    if (isContactConsentQuestion(question)) {
      if (isNegative(answer)) {
        contactConsent = false;
        contactRevoked = true;
      } else if (isAffirmative(answer)) {
        contactConsent = true;
        contactRevoked = false;
      }
    }
    const hasContactDetail = answer.includes("@") || answer.replace(/\D/g, "").length >= 8;
    if (isContactDetailQuestion(question) && hasContactDetail) {
      contactConsent = true;
      contactRevoked = false;
    }
  }

  return mergeAnaLeadQualification(previous, {
    name,
    email,
    phone,
    organization,
    role,
    schoolSector,
    offerInterest,
    offerInterests,
    qualificationFocus,
    multiOfferInterest,
    need,
    needs,
    gradeFit,
    studentCount,
    internetReady,
    businessChallenge,
    timeline,
    commercialIntent,
    pricingIntent,
    meetingIntent,
    advancementIntent,
    contactConsent,
    contactRevoked,
  });
}

function qualificationTrack(qualification: AnaLeadQualification): AnaQualificationFocus | undefined {
  if (qualification.qualificationFocus === "multiple" && qualification.gradeFit === false) return "consulting";
  if (qualification.qualificationFocus) return qualification.qualificationFocus;
  if (qualification.multiOfferInterest || (qualification.offerInterests?.length ?? 0) > 1) return "multiple";
  return qualification.offerInterest;
}

function qualificationFields(qualification: AnaLeadQualification) {
  const track = qualificationTrack(qualification);
  if (track === "leia") {
    return [qualification.need, qualification.gradeFit, qualification.studentCount, qualification.internetReady, qualification.timeline];
  }
  if (track === "consulting" || track === "product-development") {
    return [qualification.need, qualification.businessChallenge, qualification.timeline];
  }
  if (track === "academy") {
    return [qualification.need, qualification.timeline];
  }
  if (track === "multiple") {
    return [qualification.need, qualification.qualificationFocus === "multiple" ? qualification.gradeFit : undefined, qualification.studentCount, qualification.internetReady, qualification.businessChallenge, qualification.timeline];
  }
  return [qualification.need, qualification.timeline];
}

function isQualificationComplete(qualification: AnaLeadQualification) {
  const track = qualificationTrack(qualification);
  if (track === "leia") {
    return Boolean(qualification.need)
      && qualification.gradeFit === true
      && qualification.studentCount !== undefined
      && qualification.internetReady === true
      && Boolean(qualification.timeline);
  }
  if (track === "consulting" || track === "product-development") {
    return Boolean(qualification.need && qualification.businessChallenge && qualification.timeline);
  }
  if (track === "academy") return Boolean(qualification.need && qualification.timeline);
  if (track === "multiple" && qualification.qualificationFocus === "multiple") {
    return Boolean(
      qualification.need
      && qualification.gradeFit === true
      && qualification.studentCount !== undefined
      && qualification.internetReady === true
      && qualification.businessChallenge
      && qualification.timeline,
    );
  }
  return false;
}

function qualificationScore(qualification: AnaLeadQualification) {
  const relevant = qualificationFields(qualification);
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
  if (!qualification.need && !/necessidade|objetivo|desafio|melhorar|resolver|busca/.test(asked)) {
    return qualification.offerInterest === "leia"
      ? { key: "need", text: "Qual é a principal necessidade da escola com IA hoje?" }
      : { key: "need", text: "O que você gostaria de melhorar ou resolver hoje?" };
  }
  if (!qualification.advancementIntent && !qualification.meetingIntent) return undefined;

  const hasMultipleInterests = Boolean(
    qualification.multiOfferInterest
    || (qualification.offerInterests?.length ?? 0) > 1,
  );
  if (hasMultipleInterests && !qualification.qualificationFocus && !/qual.*(?:frente|prioridade).*(?:urgente|prioritaria|comecar)|por qual.*(?:frente|delas).*(?:comecar|seguir)/.test(asked)) {
    return {
      key: "priority",
      text: "Como você está olhando tanto para os alunos quanto para a gestão da escola, qual dessas duas frentes é mais urgente agora: implementar o L.E.I.A. ou aplicar IA na operação da escola?",
    };
  }

  const track = qualificationTrack(qualification);
  if (track === "leia" && qualification.gradeFit === false) return undefined;
  if (track === "leia" || track === "multiple") {
    if (qualification.gradeFit === undefined && !/9.*ano|ensino medio|series/.test(asked)) {
      return { key: "grades", text: "Sua escola atende turmas do 9º ano do Ensino Fundamental à 3ª série do Ensino Médio?" };
    }
    if (qualification.gradeFit === false && track === "leia") return undefined;
    if (qualification.studentCount === undefined && !/quantos.*(?:alunos|estudantes)|numero.*(?:alunos|estudantes)/.test(asked)) {
      return { key: "students", text: "Quantos estudantes vocês imaginam atender?" };
    }
    if (qualification.internetReady === undefined && !/internet/.test(asked)) {
      return { key: "internet", text: "A escola tem conexão estável à internet para as turmas?" };
    }
  }
  if ((track === "consulting" || track === "product-development" || track === "multiple") && !qualification.businessChallenge && !/qual.*(?:problema|processo|desafio)|o que.*(?:gestao|operacao|negocio).*(?:melhorar|resolver)/.test(asked)) {
    return {
      key: "businessChallenge",
      text: "Na gestão da escola, qual problema ou processo você mais gostaria de melhorar com IA?",
    };
  }
  if (!qualification.timeline && !/quando|prazo|comecar|começar/.test(asked)) {
    return { key: "timeline", text: "Quando vocês gostariam de começar?" };
  }
  if (!isQualificationComplete(qualification)) return undefined;
  if (qualification.contactConsent && !qualification.name) {
    return { key: "name", text: "Qual é o seu nome?" };
  }
  if (qualification.contactConsent && !qualification.email && !qualification.phone && !/qual.*(?:email|e-mail|whatsapp|telefone)|melhor.*(?:email|e-mail|whatsapp|telefone)/.test(asked)) {
    return { key: "contact", text: "Qual é o melhor e-mail ou WhatsApp para falar com você?" };
  }
  if (!qualification.contactConsent && !qualification.contactRevoked && !/entrar em contato|falar com voce/.test(asked)) {
    return { key: "contactConsent", text: "Quer que eu peça para alguém do nosso time entrar em contato com você?" };
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
  const acceptedOffer = acceptedAssistantOffer(latest, previousAssistantText);
  const answerRequired = Boolean(acceptedOffer) || requiresKnowledgeAnswer(latest, turnKind, incompleteUserThought);
  const shouldExpandLeia = !messages.some((message) => (
    message.role === "assistant"
    && /laboratorio escolar de inteligencia artificial/.test(normalizeKnowledgeText(messageText(message)))
  ));
  const score = qualificationScore(qualification);
  const hasLeadContext = Boolean(qualification.offerInterest || qualification.role || qualification.email || qualification.phone || qualification.need || qualification.commercialIntent || qualification.meetingIntent);
  const isLead = Boolean(qualification.name || hasLeadContext);
  const qualified = isQualificationComplete(qualification);
  const hasContact = Boolean(qualification.email || qualification.phone);
  const leadStage: AnaLeadStage = qualification.gradeFit === false && qualificationTrack(qualification) === "leia"
    ? "nurture"
    : qualification.contactConsent && hasContact && qualified
    ? "handoff"
    : qualification.meetingIntent && qualified
      ? "meeting_requested"
      : qualified
        ? "qualified"
        : hasLeadContext && (userTurnCount > 1 || qualification.meetingIntent || qualification.advancementIntent)
          ? "qualifying"
          : "engaged";
  const suggestedQuestion = leadStage === "handoff" || leadStage === "nurture"
    ? undefined
    : answeredNameThisTurn && !hasLeadContext
    ? undefined
    : turnKind === "greeting" || turnKind === "acknowledgement" || turnKind === "gratitude" || turnKind === "farewell"
    ? undefined
    : chooseNextQuestion(qualification, questions, incompleteUserThought, userTurnCount);
  const nextQuestion = acceptedOffer
    ? undefined
    : answerRequired
    && suggestedQuestion?.key !== "name"
    && !qualification.advancementIntent
    && !qualification.meetingIntent
    ? undefined
    : suggestedQuestion;

  const stage: AnaConversationStage = turnKind === "farewell"
    ? "closing"
    : leadStage === "handoff"
      ? "handoff"
      : nextQuestion?.key === "contactConsent" || nextQuestion?.key === "contact"
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
    shouldRetrieveKnowledge: answerRequired,
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
      ...(qualification.qualificationFocus ? [`A frente prioritária informada é ${qualification.qualificationFocus}.`] : []),
      ...(qualification.businessChallenge ? [`Desafio operacional informado: ${qualification.businessChallenge}`] : []),
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
    answerRequired,
    acceptedAssistantOffer: acceptedOffer,
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
  if (state.answerRequired) return undefined;
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
      priority: "Entendi.",
      businessChallenge: "Entendi.",
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
