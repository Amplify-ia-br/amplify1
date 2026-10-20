import { formatAnaAssistantText } from "../ana/text.js";

export type AnaZeroIssue =
  | "empty"
  | "markdown"
  | "internal_term"
  | "non_latin_script"
  | "ungrounded_price"
  | "promise_of_action"
  | "stalled_active_interest"
  | "missing_leia_implementation"
  | "missing_leia_shared_decisions"
  | "renamed_leia_presentation"
  | "ambiguous_handoff_consent";

const MONEY = /(?:(?:R\$|BRL|US\$|USD|EUR|€|\$)\s*\d[\d.,]*|\b\d[\d.,]*\s*(?:mil\s+)?(?:reais|d[oó]lares|euros)\b)/giu;
const MARKDOWN = /(?:^|\n)\s{0,3}(?:#{1,6}\s|```|>\s)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/u;
const INTERNAL_TERMS = /\b(?:MCP|OKF)\b/iu;
const PROMISE_OF_ACTION = /\b(?:agendei|marquei|enviei|encaminhei|registrei)\b|\breuni[aã]o\b.{0,25}\b(?:marcada|agendada|confirmada)\b|\b(?:vamos|vai|v[aã]o|iremos|ir[aá])\b.{0,25}\b(?:te ligar|ligar para voc[eê]|entrar em contato|te chamar|te enviar|enviar um)\b|\b(?:nossa equipe|o time)\b.{0,30}\b(?:vai|ir[aá]|entrar[aá])\b.{0,20}\b(?:te|entrar|ligar|chamar)\b/iu;
const ACTIVE_INTEREST = /^(?:legal|gostei|interessante|bacana|quero sim|pode ser|claro|que mais|sim)[!.?\s]*$/i;
const DRY_ACKNOWLEDGEMENT = /^(?:[óo]timo|legal|perfeito|que bom|bacana|entendi)[!.?\s]*$/i;
const LEIA_TOPIC = /\bl\s*\.?\s*e\s*\.?\s*i\s*\.?\s*a\s*\.?\b|laborat[oó]rio escolar de intelig[êe]ncia artificial/i;
const IMPLEMENTATION_OFFER = /implanta[cç][aã]o|como funciona|na pr[aá]tica|rotina da escola|etapas?|responsabilidades?/i;
const IMPLEMENTATION_STAGES = [
  /experiment|apresenta[cç][aã]o gratuita/i,
  /planej|diagn[oó]stico/i,
  /prepar|proposta/i,
];
const SHARED_DECISIONS = /em conjunto|decis(?:[aã]o|[oõ]es) conjunta|defini[cç][aã]o conjunta|definid[oa]s? com a escola|combinad[oa]s? com a escola/i;
const RENAMED_LEIA_PRESENTATION = /masterclass|aula experimental|demonstra[cç][aã]o gratuita/i;
const CHANNEL_ONLY = /^(?:whats\s*app|zap|e-?mail|email)[!.?\s]*$/i;
const HANDOFF_PERMISSION_QUESTION = /\bposso\b.{0,80}\b(?:passar|compartilhar)\b.{0,80}\b(?:whats\s*app|contato)\b/i;

type ConversationTurn = { role: "user" | "assistant"; text: string };

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

function expectsLeiaImplementation(history: ConversationTurn[]) {
  const latest = history.at(-1);
  if (!latest || latest.role !== "user") return false;
  const previousAssistant = [...history].reverse().find((turn) => turn.role === "assistant")?.text ?? "";
  const recentContext = history.slice(-6).map((turn) => turn.text).join("\n");
  return (
    ACTIVE_INTEREST.test(latest.text.trim()) && LEIA_TOPIC.test(previousAssistant) && IMPLEMENTATION_OFFER.test(previousAssistant)
  ) || (LEIA_TOPIC.test(recentContext) && IMPLEMENTATION_OFFER.test(latest.text));
}

export function validateAnaZeroTurnAnswer(value: string, evidenceText: string[], history: ConversationTurn[]) {
  const base = validateAnaZeroAnswer(value, evidenceText);
  const issues = [...base.issues];
  const latest = history.at(-1);

  if (latest?.role === "user" && ACTIVE_INTEREST.test(latest.text.trim()) && DRY_ACKNOWLEDGEMENT.test(base.text)) {
    issues.push("stalled_active_interest");
  }
  if (expectsLeiaImplementation(history)) {
    const coveredStages = IMPLEMENTATION_STAGES.filter((pattern) => pattern.test(base.text)).length;
    if (coveredStages < 2) issues.push("missing_leia_implementation");
    if (!SHARED_DECISIONS.test(base.text)) issues.push("missing_leia_shared_decisions");
    if (RENAMED_LEIA_PRESENTATION.test(base.text)) issues.push("renamed_leia_presentation");
  }
  if (
    latest?.role === "user"
    && CHANNEL_ONLY.test(latest.text.trim())
    && /\bposso\b.{0,80}\bwhats\s*app\b/i.test(history.at(-2)?.text ?? "")
    && !HANDOFF_PERMISSION_QUESTION.test(base.text)
  ) {
    issues.push("ambiguous_handoff_consent");
  }

  return { valid: issues.length === 0, text: base.text, issues: [...new Set(issues)] };
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
