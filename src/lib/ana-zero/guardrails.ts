import { formatAnaAssistantText } from "../ana/text.js";

export type AnaZeroIssue =
  | "empty"
  | "markdown"
  | "internal_term"
  | "non_latin_script"
  | "ungrounded_price"
  | "promise_of_action";

const MONEY = /(?:(?:R\$|BRL|US\$|USD|EUR|€|\$)\s*\d[\d.,]*|\b\d[\d.,]*\s*(?:mil\s+)?(?:reais|d[oó]lares|euros)\b)/giu;
const MARKDOWN = /(?:^|\n)\s{0,3}(?:#{1,6}\s|```|>\s)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/u;
const INTERNAL_TERMS = /\b(?:MCP|OKF)\b/iu;
const PROMISE_OF_ACTION = /\b(?:agendei|marquei|enviei|encaminhei|registrei)\b|\breuni[aã]o\b.{0,25}\b(?:marcada|agendada|confirmada)\b|\b(?:vamos|vai|v[aã]o|iremos|ir[aá])\b.{0,25}\b(?:te ligar|ligar para voc[eê]|entrar em contato|te chamar|te enviar|enviar um)\b|\b(?:nossa equipe|o time)\b.{0,30}\b(?:vai|ir[aá]|entrar[aá])\b.{0,20}\b(?:te|entrar|ligar|chamar)\b/iu;

function moneyValues(value: string) {
  return (value.match(MONEY) ?? []).map((match) => {
    const normalized = match.toLocaleLowerCase("pt-BR");
    const digits = normalized.replace(/\D/g, "");
    return `${digits}${/\bmil\b/u.test(normalized) ? "000" : ""}`;
  });
}

function containsNonLatinLetter(value: string) {
  return (value.match(/\p{Letter}/gu) ?? []).some((character) => !/\p{Script=Latin}/u.test(character));
}

export function validateAnaZeroAnswer(value: string, evidenceText: string[]) {
  const text = formatAnaAssistantText(value);
  const issues: AnaZeroIssue[] = [];
  if (!text) issues.push("empty");
  if (containsNonLatinLetter(text)) issues.push("non_latin_script");
  if (MARKDOWN.test(text)) issues.push("markdown");
  if (INTERNAL_TERMS.test(text)) issues.push("internal_term");
  if (PROMISE_OF_ACTION.test(text)) issues.push("promise_of_action");
  const answerMoney = moneyValues(text);
  if (answerMoney.length) {
    const evidenceMoney = new Set(evidenceText.flatMap(moneyValues));
    if (!answerMoney.every((amount) => evidenceMoney.has(amount))) issues.push("ungrounded_price");
  }
  return { valid: issues.length === 0, text, issues };
}

// Removes only the offending sentences instead of replacing the whole reply
// with a canned message, so a second failed attempt still sounds like Ana.
export function redactAnaZeroAnswer(text: string, evidenceText: string[]) {
  const evidenceMoney = new Set(evidenceText.flatMap(moneyValues));
  const kept = text.split(/(?<=[.!?])\s+|\n+/u).filter((sentence) => {
    if (PROMISE_OF_ACTION.test(sentence) || INTERNAL_TERMS.test(sentence)) return false;
    const amounts = moneyValues(sentence);
    return amounts.every((amount) => evidenceMoney.has(amount));
  });
  return kept.join(" ").replace(/\*\*(.*?)\*\*/g, "$1").trim();
}

export const ANA_ZERO_TECHNICAL_REPLY =
  "Tive um problema técnico para responder agora. Pode tentar de novo em instantes?";

export const ANA_ZERO_SAFE_REPLY =
  "Prefiro não afirmar isso sem ter certeza. Pode me contar um pouco mais sobre o que você precisa?";
