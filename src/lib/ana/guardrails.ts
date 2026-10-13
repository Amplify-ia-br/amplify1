import type { AnaConversationState } from "./conversation.js";
import type { AnaRetrievalTrace } from "./retrieval.js";
import { formatAnaAssistantText } from "./text.js";
import { normalizeKnowledgeText } from "../okf/core.js";

export type AnaAnswerIssue =
  | "empty"
  | "too_long"
  | "non_latin_script"
  | "hidden_unicode"
  | "internal_term"
  | "multiple_questions"
  | "markdown"
  | "visible_source"
  | "unexpected_price"
  | "ungrounded_price"
  | "contact_after_refusal"
  | "premature_contact_request"
  | "qualification_instead_of_explanation"
  | "unnecessary_priority"
  | "missing_leia_expansion";

export type AnaAnswerValidation = {
  valid: boolean;
  text: string;
  issues: AnaAnswerIssue[];
};

const HIDDEN_UNICODE = /[\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/u;
const INTERNAL_TERMS = /\b(?:MCP|OKF)\b/iu;
const MARKDOWN = /(?:^|\n)\s{0,3}(?:#{1,6}\s|```|>\s)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/u;
const VISIBLE_SOURCE = /(?:^|\n)\s*fontes?\s*:/iu;
const CONTACT_REQUEST = /(?:(?:qual|informe|envie|mande|compartilhe|passe|forne[cç]a|digite|deixe|me passe|pode me passar|preciso(?: do)?|necessito(?: do)?).{0,50}(?:e-?mail|whatsapp|telefone|celular|contato)|(?:qual|diga|me diga|informe).{0,50}(?:forma|jeito|canal).{0,30}(?:falar|contato)|(?:como posso|como podemos).{0,40}(?:falar|contatar|contactar).{0,20}(?:com )?voc[eê]|(?:seu|o seu)\s+(?:e-?mail|whatsapp|telefone|celular)(?:\s*,?\s*(?:por favor|para|pra))?|(?:e-?mail|whatsapp|telefone|celular).{0,24}(?:por favor|para continuarmos|pra continuar)|(?:quer|gostaria).{0,60}(?:entr(?:ar|e) em contato|falar com voc[eê]))/iu;
const MONEY = /(?:(?:R\$|BRL|US\$|USD|EUR|€|\$)\s*\d[\d.,]*|\b\d[\d.,]*\s*(?:mil\s+)?(?:reais|d[oó]lares|euros)\b)/giu;

function containsNonLatinLetter(value: string) {
  for (const character of value.match(/\p{Letter}/gu) ?? []) {
    if (!/\p{Script=Latin}/u.test(character)) return true;
  }
  return false;
}

function normalizedMoneyValues(value: string) {
  return (value.match(MONEY) ?? []).map((match) => {
    const normalized = match.toLocaleLowerCase("pt-BR");
    const currency = /(?:us\$|usd|dolar|dólar|\$)/u.test(normalized) && !/r\$/u.test(normalized)
      ? "usd"
      : /(?:eur|€|euro)/u.test(normalized)
        ? "eur"
        : "brl";
    const digits = normalized.replace(/\D/g, "");
    return `${currency}:${digits}${/\bmil\b/u.test(normalized) ? "000" : ""}`;
  });
}

function numericTokens(value: string) {
  return value.match(/\b\d[\d.,]*\b/gu)?.map((token) => token.replace(/\D/g, "")) ?? [];
}

function commercialQualifiers(value: string) {
  const normalized = normalizeKnowledgeText(value);
  const qualifiers = [
    ["parcela", /\bparcelas?\b|\b\d+\s*x\b/],
    ["por-dia", /\b(?:por|ao|cada) dia\b|\bdiari[oa]\b/],
    ["por-semana", /\b(?:por|a|cada) semana\b|\bsemanal\b/],
    ["por-mes", /\b(?:por|ao|cada) mes\b|\bmensal(?:idade)?\b/],
    ["por-ano", /\b(?:por|ao|cada) ano\b|\banual\b/],
    ["por-estudante", /\bpor (?:estudante|aluno)\b/],
    ["a-vista", /\ba vista\b/],
    ["implantacao", /\bimplantacao\b/],
    ["renovacao", /\brenovacao\b/],
    ["matricula", /\bmatricula\b/],
    ["pix", /\bpix\b/],
    ["total", /\btotal\b/],
  ] as const;
  return qualifiers.flatMap(([name, pattern]) => pattern.test(normalized) ? [name] : []);
}

function pricesAreGrounded(text: string, retrieval: AnaRetrievalTrace) {
  const evidence = retrieval.documents.flatMap((document) => document.content.split(/\n{2,}|(?<=[.!?])\s+/u));
  const claims = text.split(/\n+|(?<=[.!?])\s+/u).filter((claim) => normalizedMoneyValues(claim).length > 0);

  return claims.every((claim) => {
    const claimMoney = normalizedMoneyValues(claim);
    const claimNumbers = numericTokens(claim);
    const claimQualifiers = commercialQualifiers(claim);
    return evidence.some((paragraph) => {
      const evidenceMoney = new Set(normalizedMoneyValues(paragraph));
      const evidenceNumbers = new Set(numericTokens(paragraph));
      const evidenceQualifiers = new Set(commercialQualifiers(paragraph));
      return claimMoney.every((value) => evidenceMoney.has(value))
        && claimNumbers.every((value) => evidenceNumbers.has(value))
        && claimQualifiers.every((value) => evidenceQualifiers.has(value))
        && [...evidenceQualifiers].every((value) => claimQualifiers.includes(value));
    });
  });
}

export function validateAnaAnswer(
  value: string,
  conversation: AnaConversationState,
  retrieval: AnaRetrievalTrace,
): AnaAnswerValidation {
  const text = formatAnaAssistantText(value);
  const issues: AnaAnswerIssue[] = [];

  if (!text) issues.push("empty");
  if (text.length > 4_000) issues.push("too_long");
  if (containsNonLatinLetter(text)) issues.push("non_latin_script");
  if (HIDDEN_UNICODE.test(text)) issues.push("hidden_unicode");
  if (INTERNAL_TERMS.test(text)) issues.push("internal_term");
  if ((text.match(/\?/g) ?? []).length > 1) issues.push("multiple_questions");
  if (MARKDOWN.test(text)) issues.push("markdown");
  if (VISIBLE_SOURCE.test(text)) issues.push("visible_source");
  const questionText = normalizeKnowledgeText(text.replace(/L\.E\.I\.A\./g, "LEIA").match(/[^.!?\n]+\?/g)?.join(" ") ?? "");
  if (conversation.acceptedAssistantOffer && (questionText || /\b(?:informe|diga|conte|escolha|defina)\b.{0,45}\b(?:prioridade|prazo|quantos|nome|email|whatsapp)\b/.test(normalizeKnowledgeText(text)))) {
    issues.push("qualification_instead_of_explanation");
  }
  if (conversation.qualification.priorityStatus && /\b(?:prioridade|priorizar|primeiro|pesa mais|mais urgente|focar)\b/.test(questionText)) {
    issues.push("unnecessary_priority");
  }

  const hasMoney = normalizedMoneyValues(text).length > 0;
  if (hasMoney && !conversation.qualification.pricingIntent) issues.push("unexpected_price");
  if (hasMoney && !pricesAreGrounded(text, retrieval)) issues.push("ungrounded_price");

  if (conversation.qualification.contactRevoked && CONTACT_REQUEST.test(text)) {
    issues.push("contact_after_refusal");
  } else if (CONTACT_REQUEST.test(text) && conversation.nextQuestion?.key !== "contact" && conversation.nextQuestion?.key !== "contactConsent") {
    issues.push("premature_contact_request");
  }

  if (
    conversation.shouldExpandLeia
    && /L\.E\.I\.A\./u.test(text)
    && !/L\.E\.I\.A\.\s*[—-]\s*Laboratório Escolar de Inteligência Artificial/iu.test(text)
  ) {
    issues.push("missing_leia_expansion");
  }

  return { valid: issues.length === 0, text, issues: [...new Set(issues)] };
}

export function createAnaDocumentationFallback(
  retrieval: AnaRetrievalTrace,
  conversation: AnaConversationState,
) {
  if (!retrieval.documents.length) {
    return "Não encontrei informação suficiente na documentação para responder com segurança agora.";
  }

  const descriptions = retrieval.documents.slice(0, 3).map((document) => {
    const title = document.id === "leia" && conversation.shouldExpandLeia
      ? "L.E.I.A. — Laboratório Escolar de Inteligência Artificial"
      : document.title;
    return `${title}: ${document.description}`;
  });

  return descriptions.length === 1
    ? descriptions[0]
    : `A Amplify pode ajudar nestas frentes:\n\n${descriptions.map((description) => `• ${description}`).join("\n")}`;
}
