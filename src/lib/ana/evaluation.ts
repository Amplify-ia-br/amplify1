import { normalizeKnowledgeText } from "../okf/core.js";
import type { AnaConversationState } from "./conversation.js";
import type { AnaReferenceScenario } from "./reference-suite.js";
import { realizesQuestion } from "./qualification.js";

export type EvaluationFailure = { layer: "controller" | "retrieval" | "generation" | "guardrail" | "persistence"; rule: string };
export function evaluateState(state: AnaConversationState, expected: AnaReferenceScenario["expected"]): EvaluationFailure[] {
  return Object.entries(expected).flatMap(([key, value]) => {
    const actual = key === "nextQuestionKey" ? state.nextQuestion?.key : state[key as keyof AnaConversationState];
    return actual === value ? [] : [{ layer: "controller" as const, rule: `${key}: expected ${JSON.stringify(value)}, received ${JSON.stringify(actual)}` }];
  });
}
export function evaluateQualification(state: AnaConversationState, expected: AnaReferenceScenario["expectedQualification"]): EvaluationFailure[] {
  return Object.entries(expected ?? {}).flatMap(([key, value]) => JSON.stringify(state.qualification[key as keyof typeof state.qualification]) === JSON.stringify(value)
    ? [] : [{ layer: "controller" as const, rule: `qualification.${key}: mismatch` }]);
}
export function evaluateResponse(text: string, criteria?: AnaReferenceScenario["response"]): EvaluationFailure[] {
  const failures: EvaluationFailure[] = [];
  const includes = (needle: string) => normalizeKnowledgeText(text).includes(normalizeKnowledgeText(needle));
  if (!text.trim()) failures.push({ layer: "generation", rule: "empty_response" });
  for (const term of criteria?.containsAll ?? []) if (!includes(term)) failures.push({ layer: "generation", rule: `missing:${term}` });
  if (criteria?.containsAny?.length && !criteria.containsAny.some(includes)) failures.push({ layer: "generation", rule: "missing_any_required_term" });
  for (const term of criteria?.excludes ?? []) if (includes(term)) failures.push({ layer: "generation", rule: `forbidden:${term}` });
  if (criteria?.maxQuestions !== undefined && (text.match(/\?/g) ?? []).length > criteria.maxQuestions) failures.push({ layer: "generation", rule: "too_many_questions" });
  return failures;
}

// Observable question intent, not a semantic judge of the whole response.
export function evaluateQuestion(state: AnaConversationState, text: string): EvaluationFailure[] {
  if (!state.shouldAskQuestion || !state.nextQuestion) return [];
  // Asking for a name is optional by product policy. If asked, it must still
  // match the controller; mandatory response terms remain checked separately.
  if (state.nextQuestion.key === "name" && !text.includes("?")) return [];
  return realizesQuestion(state.nextQuestion.key, text) ? [] : [{ layer: "generation", rule: `recommended_question_not_realized:${state.nextQuestion.key}` }];
}

// In-process evaluation never dispatches or persists a commercial handoff.
export function evaluateHandoff(state: AnaConversationState, text: string, persisted = false): EvaluationFailure[] {
  const authorized = state.qualification.contactConsent && !state.qualification.contactRevoked;
  const claimsDelivery = /(?:ficou registrado|foi enviado|encaminhei|reuniao (?:foi |esta )?marcada|entraremos em contato)/.test(normalizeKnowledgeText(text));
  return ((state.leadStage === "handoff" || claimsDelivery) && (!authorized || !persisted))
    ? [{ layer: "persistence", rule: "handoff_without_explicit_consent_and_confirmed_persistence" }] : [];
}
