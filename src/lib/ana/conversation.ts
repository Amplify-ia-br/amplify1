import { normalizeKnowledgeText } from "../okf/core.js";
import type { AnaMessage } from "./types.js";

export type AnaTurnKind = "greeting" | "repair" | "acknowledgement" | "gratitude" | "farewell" | "disclosure" | "request";
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
  // Optional conversational facts, never additional commercial requirements.
  businessAreas?: string[];
  objectives?: string[];
  priorityStatus?: "combined" | "undecided";
  deferredQuestions?: AnaNextQuestion["key"][];
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
  // Derived scope of this answer, not a persisted qualification requirement.
  answerNeedsTogether?: boolean;
  acceptedAssistantOffer?: string;
  nextQuestion?: AnaNextQuestion;
  deferredQuestion?: AnaNextQuestion["key"];
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

function isGreeting(value: string) {
  const normalized = canonical(value).replace(/\s+/g, " ");
  return /^(?:(?:oi|ola|oie|opa|e ai)(?: ana)?(?: tudo bem| tudo bom| como vai)?)$/.test(normalized)
    || /^(?:(?:oi|ola|oie|opa|e ai)(?: ana)? )?(?:bom dia|boa tarde|boa noite)(?: ana)?(?: tudo bem| tudo bom| como vai)?$/.test(normalized);
}

function isConversationalRepair(value: string) {
  const normalized = canonical(value).replace(/\s+/g, " ");
  return /^(?:mas )?entendeu o que\b/.test(normalized)
    && /\b(?:k{2,}|(?:rs){2,}|(?:ha){2,}|sou|me chamo|meu nome)\b/.test(normalized);
}

function isFrustratedExit(value: string) {
  const normalized = canonical(value).replace(/\s+/g, " ");
  if (/\bnao desisto\b/.test(normalized)) return false;
  return /^(?:(?:bah|ah|poxa|quer saber) )?(?:desisto|cansei|chega|deixa pra la|deixa quieto|esquece|nao quero mais)(?: mesmo)?$/.test(normalized);
}

export function classifyAnaTurn(value: string): AnaTurnKind {
  if (isGreeting(value)) {
    return "greeting";
  }
  if (isConversationalRepair(value)) {
    return "repair";
  }
  if (matchesOnly(value, /^(obrigado|obrigada|valeu|agradeco|muito obrigado|muito obrigada)$/)) {
    return "gratitude";
  }
  if (isFrustratedExit(value) || matchesOnly(value, /^(tchau|ate mais|ate logo|falou|encerramos|por enquanto e so)$/)) {
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
  if (incompleteUserThought || turnKind === "greeting" || turnKind === "repair" || turnKind === "acknowledgement" || turnKind === "gratitude" || turnKind === "farewell") {
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
  // A request to purchase/schedule is not acceptance of an explanation.
  if (/\b(?:contratar|proposta|agendar|marcar reuniao|nao|antes|mas|quanto|preco|custa)\b/.test(canonical(latestUserMessage))) return undefined;

  const selected = qualificationFocusFromAnswer(latestUserMessage);
  if (selected && isExplorationChoice(previousAssistantMessage)) {
    const labels: Record<AnaQualificationFocus, string> = {
      leia: "L.E.I.A. — Laboratório Escolar de Inteligência Artificial",
      consulting: "consultoria", academy: "Amplify Academy",
      "product-development": "desenvolvimento de produtos", multiple: "as duas frentes oferecidas",
    };
    return `Aprofundar ${labels[selected]}`;
  }

  const offeredExplanation = /\bposso\b[^.!?\n]{0,90}\b(?:explicar|mostrar|contar|detalhar)\b/.test(previousAssistantMessage);
  if (!offeredExplanation) return undefined;

  const acceptance = canonical(latestUserMessage).replace(/^(?:(?:ok|okay|legal|otimo|perfeito|beleza)\s+)+/, "");
  const accepted = /^(?:(?:legal|otimo|perfeito|claro|sim|beleza)[, ]+)*(?:quero sim|quero|pode sim|pode|por favor|me explica|explique|manda ver|vamos la)(?:\b|$)/.test(acceptance)
    || /^(?:sim|claro|com certeza)(?:\b|$)/.test(acceptance);
  const explicitExplanation = /^(?:(?:pode|quero|gostaria de)\s+)?(?:me |que voce me )?(?:explique|explica|explicar|mostre|mostrar|conte|contar|detalhe|detalhar)\b/.test(acceptance);
  return accepted || explicitExplanation ? previousAssistantMessage : undefined;
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
  return /(?:qual|o que).*(?:mais urgente|prioridade|priorizar|pesa mais|primeiro|trava resultado)|por (?:qual|onde).*(?:comecar|seguir)|focar primeiro|implementar o l.*e.*i.*a.*ou.*(?:operacao|gestao)|qual.*frente.*(?:aprofundar|prioritaria|prefere)/.test(value);
}

function isExplorationChoice(value: string) {
  const explanationOffered = /(?:aprofundar|detalhar|explicar|conhecer melhor)/.test(value);
  const interestChoice = /qual.*frente.*(?:faz mais sentido|interessa|quer conhecer)/.test(value);
  // A priority question following descriptions of both offers is an invitation
  // to choose a topic, unlike a standalone commercial qualification question.
  const describedAlternatives = /\bprograma\b/.test(value) && /\bconsultoria\b/.test(value)
    && isPriorityQuestion(value);
  return (explanationOffered || interestChoice || describedAlternatives)
    && /\b(?:qual|escolh\w*|prefere|por onde|ou)\b/.test(value)
    && /(?:frente|leia|l\s*\.?e\s*\.?i\s*\.?a|consultoria|academy|produto)/.test(value);
}

function hasExplicitFocusChoice(value: string) {
  return /\b(?:prefiro|priorizo|primeiro|prioridade|(?:podemos|vamos|quero) (?:comecar|seguir|focar)|vamos pel[oa])\b/.test(canonical(value));
}

function isTimelineQuestion(value: string) {
  return questionTexts(value).some(question => /\bquando\b|\bqual.*prazo\b|\bem que.*(?:mes|ano|data)\b/.test(normalizeKnowledgeText(question)));
}

function isTimelineAnswer(value: string) {
  return /\b(?:hoje|amanha|agora|imediatamente|quanto antes|dia|dias|semana|semanas|mes|meses|ano|anos|semestre|trimestre|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|segunda|terca|quarta|quinta|sexta|sabado|domingo|\d{1,2}\/\d{1,2}|20\d{2})\b/.test(canonical(value));
}

function isBusinessChallengeQuestion(value: string) {
  return questionTexts(value).some(question => /\bqual\b.*(?:problema|processo|desafio).*(?:melhorar|resolver|ia)|o que.*(?:gestao|operacao|negocio).*(?:melhorar|resolver)/.test(normalizeKnowledgeText(question)));
}

function qualificationFocusFromAnswer(value: string): AnaQualificationFocus | undefined {
  const normalized = canonical(value);
  if (value.includes("?") || /\b(?:nao|talvez|se|ou)\b/.test(normalized)) return undefined;
  if (isCombinedAnswer(normalized)) return "multiple";
  const choices: AnaQualificationFocus[] = [];
  if (/\b(?:alunos|estudantes|ensino|pedagogic\w*|l\s*e\s*i\s*a|leia)\b/.test(normalized)) choices.push("leia");
  if (/\b(?:gestao|operacao|processos?|negocio|consultoria|administrativ\w*)\b/.test(normalized)) choices.push("consulting");
  if (/\b(?:professores|docentes|equipe|capacitacao|treinamento|academy)\b/.test(normalized)) choices.push("academy");
  if (/\b(?:produto|aplicativo|sistema|solucao propria|desenvolvimento)\b/.test(normalized)) choices.push("product-development");
  return choices.length === 1 ? choices[0] : undefined;
}

function isCombinedAnswer(value: string) {
  const text = canonical(value);
  if (/\b(?:nao|apenas|somente)\b/.test(text)) return false;
  return /\b(?:as duas|os dois|ambas|ambos|as tres|os tres|as 3|os 3|duas frentes|tudo isso|todas juntas|todos juntos|igualmente prioritari[oa]s)\b/.test(text) || /^(?:todas|todos)(?: mesmo)?$/.test(text);
}

function isUnknownOrDeclined(value: string) {
  return /\b(?:nao (?:sei|sabemos)|nao tenho (?:essa )?(?:visao|visoa|clareza)|ainda nao defini|ainda nao decid|prefiro nao|nao (?:quero|posso|vou) (?:informar|responder|dizer))\b/.test(canonical(value));
}

function businessFacts(value: string) {
  const text = canonical(value);
  // Restrict evidence to what the user actually names. Assistant options never
  // populate these facts, and an explicit rejection is not an affirmative fact.
  if (/\bnao (?:quero|preciso|busco)\b/.test(text)) return { areas: [], objectives: [] };
  const areas = [
    ["atendimento", /\batendimento\b/], ["chamados", /\bchamados?\b/],
    ["cobrança", /\bcobranca\b/],
  ] as const;
  const objectives = [
    ["reduzir custos", /\b(?:reduzir|diminuir|baixar) (?:os )?custos\b/],
    ["melhorar a qualidade do atendimento", /\b(?:melhorar|aumentar|amentar|elevar) (?:a )?qualidade\b/],
  ] as const;
  return { areas: areas.filter(([, pattern]) => pattern.test(text)).map(([label]) => label), objectives: objectives.filter(([, pattern]) => pattern.test(text)).map(([label]) => label) };
}

function explicitBusinessProblem(value: string) {
  if (isUnknownOrDeclined(value) || /\bnao (?:temos|tenho)\b/.test(canonical(value))) return false;
  // A free-form problem statement can satisfy the existing field even when
  // its vocabulary is outside the recognized area labels.
  return /\b(?:nosso|nossa|meu|minha|o principal|a principal) (?:problema|gargalo|dificuldade|desafio|processo) (?:e|esta|envolve|consiste em)\s+\S.{5,}/.test(canonical(value));
}

function isIncompleteThought(value: string) {
  return /^(?:eu\s+)?(?:preciso|quero|gostaria|estou buscando|busco|a ideia e)(?:\s+(?:de|que|um|uma|algum|alguma))?$/.test(canonical(value));
}

function contextualName(value: string) {
  const candidate = value.trim().replace(/[.!?]+$/, "").trim();
  if (classifyAnaTurn(value) === "request") return undefined;
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
    businessAreas: unique([...(previous.businessAreas ?? []), ...(current.businessAreas ?? [])]),
    objectives: unique([...(previous.objectives ?? []), ...(current.objectives ?? [])]),
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
  const explicitNamedName = findFirst(
    joinedRaw,
    /(?:me cham[oa]|meu nome (?:e|é)|pode me chamar de)\s*([\p{L}][\p{L}\s'-]{1,80}?)(?=\s+e\s+(?:eu\s+)?(?:sou|tenho|quero|preciso|trabalho)\b|\s+(?:e\s+)?meu\s+e-?mail|[,.!?\n]|$)/iu,
  );
  const introducedName = findFirst(
    joinedRaw,
    /(?:^|[.!?\n]\s*)sou\s+(?:(?:o|a)\s+)?([\p{L}][\p{L}\s'-]{1,80}?)(?=[,.!?\n]|$)/iu,
  );
  const name = (explicitNamedName ? contextualName(explicitNamedName) : undefined)
    ?? (introducedName ? contextualName(introducedName) : undefined)
    ?? answers.map(({ answer, question }) => isNameQuestion(question) ? contextualName(answer) : undefined).find(Boolean)
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
  const business = businessFacts(joinedRaw);
  const describedBusinessProblem = answers.some(({ answer }) => explicitBusinessProblem(answer));
  const diagnosticRequest = answers.find(({ answer }) => /\b(?:quero|queria|gostaria|preciso|busco)\b.{0,45}\bdiagnostico\b/.test(canonical(answer)));
  const offerInterests = unique([
    ...(/\bl\s*\.?\s*e\s*\.?\s*i\s*\.?\s*a\b|\bleia\b/.test(joined) || schoolContext ? ["leia" as const] : []),
    ...(/\b(curso|formacao|capacitacao|academy)\b/.test(joined) ? ["academy" as const] : []),
    ...(/\b(consultoria|diagnostico|processo|otimizar|negocio)\b/.test(joined) || business.areas.length || describedBusinessProblem ? ["consulting" as const] : []),
    ...(/\b(desenvolvimento|produto de ia|solucao de ia|implantar solucoes)\b/.test(joined) ? ["product-development" as const] : []),
  ]);
  const offerInterest = offerInterests[0];
  const needs = unique([
    ...(/\b(aluno|alunos|estudante|estudantes|ensinar)\b/.test(joined) ? ["students" as const] : []),
    ...(/\b(professor|professores|docente|docentes)\b/.test(joined) ? ["teachers" as const] : []),
    ...(/\b(gestao|gestor|gestores|direcao|diretores)\b/.test(joined) ? ["management" as const] : []),
    ...(/\b(processo|processos|operacao|operacoes|negocio|negocios|melhorar (?:meu |o )?negocio|otimizar|otimizacao|otimizado|otimizada)\b/.test(joined) || business.areas.length || describedBusinessProblem || diagnosticRequest ? ["processes" as const] : []),
    ...(/\b(produto|aplicativo|sistema|solucao|solucoes)\b/.test(joined) ? ["product" as const] : []),
  ]);
  const need = needs[0];
  const multiOfferInterest = /\b(?:alem do l\s*\.?\s*e\s*\.?\s*i\s*\.?\s*a|fora o l\s*\.?\s*e\s*\.?\s*i\s*\.?\s*a|duas frentes|ambas as frentes|outras? (?:opcoes|frentes|solucoes|servicos)|o que mais (?:voces|vcs|a amplify) (?:tem|oferece|podem oferecer|poderiam oferecer))\b/.test(joined)
    || (needs.includes("students") && (needs.includes("management") || needs.includes("processes") || needs.includes("product")));

  let qualificationFocus: AnaQualificationFocus | undefined;
  let businessChallenge: string | undefined;
  let priorityStatus: AnaLeadQualification["priorityStatus"];
  for (const { answer, question } of answers) {
    if (/\bprioridades?\b/.test(canonical(answer)) && isUnknownOrDeclined(answer)) priorityStatus = "undecided";
    if (isCombinedAnswer(answer) && (business.areas.length > 1 || business.objectives.length > 1)) priorityStatus = "combined";
    if (isPriorityQuestion(question) || isExplorationChoice(question) || hasExplicitFocusChoice(answer)) {
      const focus = qualificationFocusFromAnswer(answer);
      // "Both" can mean two goals in ONE consulting engagement. Only actual
      // multi-offer interest uses the existing combined commercial track.
      qualificationFocus = focus === "multiple" && offerInterests.length === 1 && !multiOfferInterest
        ? offerInterests[0] : focus ?? qualificationFocus;
      if (isCombinedAnswer(answer)) priorityStatus = "combined";
      else if (isUnknownOrDeclined(answer)) priorityStatus = "undecided";
    }
    if (isBusinessChallengeQuestion(question) && canonical(answer).length >= 3 && !isUnknownOrDeclined(answer) && !isCombinedAnswer(answer) && !/^(?:sim|nao|certo|entendi|legal)$/.test(canonical(answer))) {
      businessChallenge = answer.trim().slice(0, 500);
    }
    if (businessFacts(answer).areas.length || explicitBusinessProblem(answer)) businessChallenge = answer.trim().slice(0, 500);
  }
  // Discovering opportunities is a legitimate diagnostic problem statement.
  // Store the user's words, not an invented operational priority.
  businessChallenge ??= diagnosticRequest?.answer.trim().slice(0, 500);
  if (offerInterests.length === 1 && offerInterests[0] === "consulting" && businessChallenge) qualificationFocus ??= "consulting";

  let gradeFit: boolean | undefined;
  if (/(?:\b9\s*(?:º|o|ano)|\bnono ano|\bensino medio|\b1\s*(?:ª|a)\s*serie|\b2\s*(?:ª|a)\s*serie|\b3\s*(?:ª|a)\s*serie)(?=\s|[.,!?]|$)/.test(joined)) gradeFit = true;
  if (/(?:\beducacao infantil|\bfundamental i|\bate o 8\s*(?:º|o)|\bsomente.*8\s*(?:º|o))(?=\s|[.,!?]|$)/.test(joined)) gradeFit = false;
  for (const { answer, question } of answers) {
    if (!/9.*ano|ensino medio|series|serie/.test(questionTexts(question).join(" "))) continue;
    if (isAffirmative(answer)) gradeFit = true;
    else if (isNegative(answer)) gradeFit = false;
  }

  const studentCountMatch = joined.match(/\b(\d{1,5})\s*(?:alunos|estudantes)\b/);
  let studentCount = studentCountMatch ? Number(studentCountMatch[1]) : undefined;
  for (const { answer, question } of answers) {
    if (!/quantos.*(?:alunos|estudantes)|numero.*(?:alunos|estudantes)/.test(questionTexts(question).join(" "))) continue;
    const contextualCount = canonical(answer).match(/\b(\d{1,5})\b/)?.[1];
    if (contextualCount) studentCount = Number(contextualCount);
  }

  let internetReady: boolean | undefined;
  if (/\b(nao temos|nao possui|sem|falta)\b.{0,24}\binternet\b|\binternet\b.{0,24}\b(instavel|ruim|fraca)\b/.test(joined)) internetReady = false;
  else if (/\b(temos|possui|com)\b.{0,24}\binternet\b|\binternet\b.{0,24}\b(estavel|boa|rapida|adequada)\b/.test(joined)) internetReady = true;
  for (const { answer, question } of answers) {
    if (!/internet|conexao/.test(questionTexts(question).join(" "))) continue;
    if (isAffirmative(answer)) internetReady = true;
    else if (isNegative(answer)) internetReady = false;
  }

  let timeline = findFirst(joinedRaw, /\b(este (?:ano|semestre)|pr[oó]ximo (?:ano|semestre)|em \d{4}|imediatamente|quanto antes|daqui a \d+ (?:dias|semanas|meses)|m[eê]s que vem)\b/iu)?.toLowerCase();
  for (const { answer, question } of answers) {
    if (!isTimelineQuestion(question)) continue;
    const normalizedAnswer = canonical(answer);
    if (normalizedAnswer.length >= 3 && isTimelineAnswer(answer) && !isUnknownOrDeclined(answer)) {
      timeline = answer.trim().slice(0, 200);
    }
  }
  const pricingIntent = /\b(?:preco|valor|investimento|orcamento|quanto|qto|cust(?:a|ar)|cutar)\b/.test(joined);
  const commercialIntent = pricingIntent || /\b(quero|queremos|gostaria|interesse|contratar|implantar|proposta)\b/.test(joined);
  const meetingIntent = /\b(agendar|marcar|reuniao|reunião|falar com (?:alguem|alguém|o time|vendas)|conversar com (?:alguem|alguém|o time|vendas))\b/.test(joined);
  // Choosing what to learn about is not an intent to purchase or schedule.
  const commercialAnswers = normalizeKnowledgeText(answers.filter(({ answer, question }) =>
    !acceptedAssistantOffer(answer, question) || /\b(?:contratar|proposta|agendar)\b/.test(canonical(answer)),
  ).map(({ answer }) => answer).join(" "));
  const advancementIntent = meetingIntent
    || Boolean(diagnosticRequest)
    || /\b(?:quero|queria|gostaria|preciso)\b.{0,50}\borcamento\b/.test(commercialAnswers)
    || /\b(?:quero|queremos|gostaria|podemos|como)\b.{0,40}\b(?:contratar|comecar|avancar|proposta|proximo passo|seguir)\b/.test(commercialAnswers)
    || /\b(?:quero uma proposta|podem enviar uma proposta|qual (?:e|seria) o proximo passo|o que (?:fazer|acontece) agora)\b/.test(commercialAnswers);
  // Reuse the candidate's distinction between missing facts and unavailable
  // answers, scoped to this flow. An unavailable required fact stays pending.
  const deferredQuestions = new Set(previous?.deferredQuestions ?? []);
  for (const { answer, question } of answers) {
    if (isUnknownOrDeclined(answer)) {
      if (isTimelineQuestion(question)) deferredQuestions.add("timeline");
      else if (isBusinessChallengeQuestion(question)) deferredQuestions.add("businessChallenge");
    }
  }
  if (timeline || previous?.timeline) deferredQuestions.delete("timeline");
  if (businessChallenge || previous?.businessChallenge) deferredQuestions.delete("businessChallenge");
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
    businessAreas: business.areas,
    objectives: business.objectives,
    priorityStatus,
    deferredQuestions: [...deferredQuestions],
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
  const asked = normalizeKnowledgeText(questions.flatMap(questionTexts).join(" "));
  if (qualification.contactRevoked) return undefined;
  if (qualification.deferredQuestions?.length) return undefined;
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
      text: qualification.offerInterests?.includes("leia")
        ? "Na gestão da escola, qual problema ou processo você mais gostaria de melhorar com IA?"
        : "Qual problema ou processo do negócio você gostaria de melhorar com IA?",
    };
  }
  if (!qualification.timeline) {
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

function questionTexts(text: string) {
  // Statements preceding a question are not questions already asked.
  return text.replace(/L\.\s*E\.\s*I\.\s*A\./gi, "LEIA").match(/[^.!?\n]+\?/g)?.map(value => value.trim()) ?? [];
}

function recentQuestions(messages: AnaMessage[]) {
  return messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) => messageText(message).split(/(?<=\?)/).filter(text => text.includes("?")).map(text => text.trim()))
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
  const deferredQuestion: AnaNextQuestion["key"] | undefined = isUnknownOrDeclined(latest)
    ? !qualification.timeline && isTimelineQuestion(previousAssistantText) ? "timeline"
      : !qualification.businessChallenge && isBusinessChallengeQuestion(previousAssistantText) ? "businessChallenge" : undefined
    : undefined;
  const answeredNameThisTurn = Boolean(qualification.name && isNameQuestion(previousAssistantText)
    && (contextualName(latest) || /\b(?:me cham[oa]|meu nome|sou (?:o |a )?)/i.test(latest)));
  const incompleteUserThought = isIncompleteThought(latest);
  const acceptedOffer = acceptedAssistantOffer(latest, previousAssistantText);
  const answerRequired = Boolean(acceptedOffer) || requiresKnowledgeAnswer(latest, turnKind, incompleteUserThought);
  const overviewRequested = /\bcomo\b.{0,60}\b(?:ajuda|ajudar)\b/.test(canonical(latest))
    && !/\b(?:leia|consultoria|academy|alunos|estudantes|operacao|processos|apenas|somente|so)\b/.test(canonical(latest));
  const answerNeedsTogether = answerRequired && overviewRequested
    && (!qualification.qualificationFocus || qualification.qualificationFocus === "multiple")
    && Boolean(qualification.needs?.includes("students") && qualification.needs?.includes("processes"));
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
    : turnKind === "greeting" || turnKind === "repair" || turnKind === "acknowledgement" || turnKind === "gratitude" || turnKind === "farewell"
    ? undefined
    : chooseNextQuestion(qualification, questions, incompleteUserThought, userTurnCount);
  const nextQuestion = acceptedOffer || deferredQuestion
    ? undefined
    : answerRequired
    && suggestedQuestion?.key !== "name"
    && !qualification.advancementIntent
    && !qualification.meetingIntent
    ? undefined
    : suggestedQuestion;

  const stage: AnaConversationStage = turnKind === "farewell"
    ? "closing"
    : turnKind === "repair"
      ? "opening"
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
      ...(qualification.name ? [`Nome informado: ${qualification.name}.`] : []),
      ...(qualification.businessAreas?.length ? [`Áreas informadas: ${qualification.businessAreas.join(", ")}.`] : []),
      ...(qualification.objectives?.length ? [`Objetivos informados: ${qualification.objectives.join("; ")}.`] : []),
      ...(qualification.priorityStatus === "combined" ? ["A pessoa quer tratar os objetivos juntos, sem desempate."] : []),
      ...(qualification.priorityStatus === "undecided" ? ["A pessoa ainda não sabe priorizar. No diagnóstico, essa descoberta faz parte do objetivo."] : []),
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
    answerNeedsTogether,
    acceptedAssistantOffer: acceptedOffer,
    nextQuestion,
    deferredQuestion,
  };
}

export function immediateAnaReply(state: AnaConversationState, messages: AnaMessage[], handoffPersisted = false) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const latestUserText = latestUserMessage ? messageText(latestUserMessage) : "";
  if (state.leadStage === "handoff") {
    return handoffPersisted
      ? "Perfeito, seu contato ficou registrado para o time da Amplify continuar essa conversa com você."
      : undefined;
  }
  if (state.turnKind === "greeting") {
    const periodGreeting = /\bbom dia\b/i.test(latestUserText)
      ? "Bom dia"
      : /\bboa tarde\b/i.test(latestUserText)
        ? "Boa tarde"
        : /\bboa noite\b/i.test(latestUserText)
          ? "Boa noite"
          : "Oi";
    return state.qualification.name
      ? `${periodGreeting}, ${state.qualification.name.split(/\s+/)[0]}! Como posso te ajudar?`
      : `${periodGreeting}! Eu sou a Ana. Qual é o seu nome?`;
  }
  if (state.turnKind === "gratitude") return "Eu que agradeço! Se precisar, estou por aqui.";
  if (state.turnKind === "farewell") {
    return isFrustratedExit(latestUserText)
      ? "Poxa, entendo. Desculpe por não ter conduzido bem a conversa. Se quiser tentar novamente em outro momento, estarei por aqui."
      : "Até mais! Foi um prazer conversar com você.";
  }
  if (state.turnKind === "repair") {
    const firstName = state.qualification.name?.split(/\s+/)[0];
    const recentUserText = messages
      .filter((message) => message.role === "user")
      .map(messageText)
      .join(" ");
    const salutation = /\bbom dia\b/i.test(recentUserText)
      ? "Bom dia"
      : /\bboa tarde\b/i.test(recentUserText)
        ? "Boa tarde"
        : /\bboa noite\b/i.test(recentUserText)
          ? "Boa noite"
          : "Oi";
    return firstName
      ? `Hahaha, justo. ${salutation}, ${firstName}! Prazer. Como posso te ajudar?`
      : `Você tem razão, eu me expressei mal. ${salutation}! Como posso te ajudar?`;
  }
  // A name supplied alongside a question must not swallow that question.
  if (state.answerRequired) return undefined;
  if (state.deferredQuestion) return "Tudo bem. Podemos retomar essa informação quando você souber. O que você já contou fica como contexto para continuarmos.";
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
      priority: "Entendi.",
      businessChallenge: "Entendi.",
      timeline: "Entendi.",
      contactConsent: "Pelo que você contou, vale a pena continuar essa conversa.",
      contact: "Ótimo.",
    };
    const progress = state.qualification.priorityStatus === "combined"
      ? "Entendi. Vamos considerar os objetivos juntos."
      : state.qualification.priorityStatus === "undecided"
        ? "Tudo bem. Vou manter a definição de prioridades como parte do diagnóstico."
        : transitions[state.nextQuestion.key];
    return `${progress} ${state.nextQuestion.text}`;
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
