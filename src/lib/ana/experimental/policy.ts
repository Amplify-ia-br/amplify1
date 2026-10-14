import { normalizeKnowledgeText } from "../../okf/core.js";
import type { AnaLeadQualification } from "../conversation.js";
import {
  CONTACT_REQUEST,
  HIDDEN_UNICODE,
  INTERNAL_TERMS,
  MARKDOWN,
  VISIBLE_SOURCE,
  containsNonLatinLetter,
  normalizedMoneyValues,
  pricesAreGrounded,
  type AnaAnswerIssue,
} from "../guardrails.js";
import { qualificationQuestion } from "../qualification.js";
import type { AnaRetrievalTrace } from "../retrieval.js";
import { formatAnaAssistantText } from "../text.js";
import type { AnaTurnOutput } from "./schema.js";

export type ExperimentalIssue =
  | AnaAnswerIssue
  | "repeated_question"
  | "question_after_closing"
  | "contact_channel_before_consent"
  | "unconfirmed_handoff";

const CHANNEL_REQUEST = /e-?mail|whatsapp|telefone|celular|canal/;
const UNCONFIRMED_HANDOFF = /reuniao (?:esta|foi|ficou) (?:marcada|agendada)|(?:vamos|iremos|vai|vao|ira|entrarao?) (?:entrar em contato|te ligar|te chamar)|(?:contato|lead|dados?) (?:foi|ficou|foram|ficaram) (?:enviad|registrad)/;

// Only invariants that must hold regardless of how the model words things.
// Everything about tone, whether to ask, and what to ask is left to the model.
export function validateExperimentalReply(
  value: string,
  output: AnaTurnOutput,
  q: AnaLeadQualification,
  context: { shouldExpandLeia: boolean; leadStage: string; retrieval: AnaRetrievalTrace },
) {
  const text = formatAnaAssistantText(value);
  const issues: ExperimentalIssue[] = [];
  const normalized = normalizeKnowledgeText(text);

  if (!text) issues.push("empty");
  if (text.length > 4_000) issues.push("too_long");
  if (containsNonLatinLetter(text)) issues.push("non_latin_script");
  if (HIDDEN_UNICODE.test(text)) issues.push("hidden_unicode");
  if (INTERNAL_TERMS.test(text)) issues.push("internal_term");
  if (MARKDOWN.test(text)) issues.push("markdown");
  if (VISIBLE_SOURCE.test(text)) issues.push("visible_source");

  const questionCount = (text.match(/\?/g) ?? []).length;
  if (questionCount > 1) issues.push("multiple_questions");
  if (questionCount > 0 && (output.turnKind === "gratitude" || output.turnKind === "farewell")) {
    issues.push("question_after_closing");
  }

  const asked = qualificationQuestion(text);
  if (asked === "name" ? Boolean(q.name) : asked && q.answers?.[asked]) issues.push("repeated_question");

  const hasMoney = normalizedMoneyValues(text).length > 0;
  if (hasMoney && !output.asksPricing) issues.push("unexpected_price");
  if (hasMoney && !pricesAreGrounded(text, context.retrieval)) issues.push("ungrounded_price");

  if (CONTACT_REQUEST.test(text)) {
    const asksChannel = CHANNEL_REQUEST.test(normalized);
    if (q.contactRevoked) issues.push("contact_after_refusal");
    else if (!q.advancementIntent) issues.push("premature_contact_request");
    else if (asksChannel && !q.contactConsent) issues.push("contact_channel_before_consent");
  }
  if (context.leadStage !== "handoff" && UNCONFIRMED_HANDOFF.test(normalized)) issues.push("unconfirmed_handoff");

  if (
    context.shouldExpandLeia
    && /L\.E\.I\.A\./u.test(text)
    && !/L\.E\.I\.A\.\s*[—-]\s*Laboratório Escolar de Inteligência Artificial/iu.test(text)
  ) {
    issues.push("missing_leia_expansion");
  }

  return { valid: issues.length === 0, text, issues: [...new Set(issues)] };
}
