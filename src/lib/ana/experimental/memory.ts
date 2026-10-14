import { normalizeKnowledgeText } from "../../okf/core.js";
import {
  mergeAnaLeadQualification,
  type AnaConversationStage,
  type AnaConversationState,
  type AnaLeadQualification,
  type AnaLeadStage,
} from "../conversation.js";
import { commercialFacts, type QualificationAnswers } from "../qualification.js";
import type { AnaTurnOutput } from "./schema.js";

function normalized(value: string) {
  return normalizeKnowledgeText(value).replace(/\s+/g, " ").trim();
}

// The model proposes facts; only what is literally supported by the person's
// own words enters memory.
export function isGrounded(evidence: string, userTexts: string[]) {
  const needle = normalized(evidence);
  return needle.length >= 2 && userTexts.some((text) => normalized(text).includes(needle));
}

const PLAUSIBLE_NAME = /^[\p{L}][\p{L}'-]+(?:\s+[\p{L}][\p{L}'-]+){0,3}$/u;

export function applyTurnUnderstanding(
  previous: Partial<AnaLeadQualification> | undefined,
  output: AnaTurnOutput,
  userTexts: string[],
): AnaLeadQualification {
  const latest = userTexts.at(-1) ?? "";
  const answers: QualificationAnswers = {};

  for (const fact of output.facts) {
    if (!isGrounded(fact.evidence, userTexts)) continue;
    const value = fact.value.trim().slice(0, 500);
    if (fact.status === "provided" && !value) continue;
    // A later "não sei" never erases something the person already told us.
    if (previous?.answers?.[fact.field]?.status === "provided" && fact.status !== "provided") continue;
    answers[fact.field] = {
      status: fact.status,
      answer: fact.status === "provided" ? value : fact.evidence.trim().slice(0, 500),
      sourceText: fact.evidence.trim().slice(0, 1000),
    };
  }

  const candidateName = output.userName?.trim();
  const name = candidateName && PLAUSIBLE_NAME.test(candidateName) && isGrounded(candidateName, userTexts)
    ? candidateName : undefined;
  if (name) answers.name = { status: "provided", answer: name, sourceText: latest.slice(0, 1000) };

  const provided = (field: keyof QualificationAnswers) => answers[field]?.status === "provided";
  const advancement = output.wantsToAdvance || output.wantsMeeting;
  const consentGranted = output.contactConsent === "granted" && (advancement || Boolean(previous?.advancementIntent));
  const consentRefused = output.contactConsent === "refused";

  const merged = mergeAnaLeadQualification(previous, {
    name,
    email: latest.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase(),
    phone: latest.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}/)?.[0]?.replace(/\s+/g, " "),
    organization: provided("organization") ? answers.organization?.answer : undefined,
    timeline: provided("timeline") ? answers.timeline?.answer : undefined,
    businessChallenge: provided("businessChallenge") ? answers.businessChallenge?.answer : undefined,
    schoolSector: output.schoolSector ?? undefined,
    gradeFit: provided("grades") ? output.gradeFit ?? undefined : undefined,
    studentCount: provided("students") ? output.studentCount ?? undefined : undefined,
    internetReady: provided("internet") ? output.internetReady ?? undefined : undefined,
    offerInterest: output.offerInterest ?? undefined,
    offerInterests: output.offerInterest ? [output.offerInterest] : [],
    answers,
    commercialIntent: advancement || output.asksPricing,
    pricingIntent: output.asksPricing,
    meetingIntent: output.wantsMeeting,
    advancementIntent: advancement,
    contactConsent: consentGranted,
    contactRevoked: consentRefused,
  });
  if (merged.contactConsent && !merged.contactRevoked) merged.nextStep = "Contato autorizado para continuar a conversa com o time.";
  else if (merged.contactRevoked) merged.nextStep = undefined;
  return merged;
}

export function experimentalLeadStage(q: AnaLeadQualification): AnaLeadStage {
  const hasContact = Boolean(q.email || q.phone);
  const hasNeed = q.answers?.need?.status === "provided";
  if (q.contactConsent && !q.contactRevoked && hasContact) return "handoff";
  if (q.meetingIntent && hasNeed) return "meeting_requested";
  if (q.advancementIntent && hasNeed) return "qualified";
  if (hasNeed || q.advancementIntent) return "qualifying";
  return "engaged";
}

const USEFUL_FIELDS = ["need", "organization", "organizationContext", "desiredOutcome", "timeline"] as const;

export function usefulFieldsStillUnknown(q: Partial<AnaLeadQualification> | undefined) {
  return USEFUL_FIELDS.filter((field) => !q?.answers?.[field]);
}

export function toLeadState(
  q: AnaLeadQualification,
  output: AnaTurnOutput | undefined,
  context: { userTurnCount: number; pagePath?: string; shouldExpandLeia: boolean },
): AnaConversationState {
  const leadStage = experimentalLeadStage(q);
  const turnKind = output?.turnKind ?? "disclosure";
  const questionKey = output?.questionField ?? undefined;
  const stage: AnaConversationStage = turnKind === "farewell"
    ? "closing"
    : leadStage === "handoff"
      ? "handoff"
      : questionKey === "contactConsent" || questionKey === "contact"
        ? "contact"
        : context.userTurnCount === 1 && turnKind === "greeting"
          ? "opening"
          : leadStage === "engaged" ? "discovery" : "qualification";
  const covered = USEFUL_FIELDS.filter((field) => q.answers?.[field]?.status === "provided").length;

  return {
    turnKind,
    stage,
    shouldRetrieveKnowledge: true,
    shouldAskQuestion: Boolean(questionKey),
    pageHint: context.pagePath?.toLocaleLowerCase("pt-BR").startsWith("/leia") ? "leia" : undefined,
    knownFacts: [...(q.name ? [`Nome informado: ${q.name}.`] : []), ...commercialFacts(q)],
    recentAssistantQuestions: [],
    userTurnCount: context.userTurnCount,
    qualification: q,
    qualificationScore: Math.round(covered / USEFUL_FIELDS.length * 100),
    leadStage,
    shouldPersistLead: Boolean(
      q.name || q.email || q.phone || q.offerInterest || q.commercialIntent || Object.keys(q.answers ?? {}).length,
    ),
    shouldExpandLeia: context.shouldExpandLeia,
    answeredNameThisTurn: false,
    incompleteUserThought: false,
    answerRequired: false,
    nextQuestion: questionKey ? { key: questionKey, text: "" } : undefined,
    pendingQualification: commercialFacts(q, true),
  };
}
