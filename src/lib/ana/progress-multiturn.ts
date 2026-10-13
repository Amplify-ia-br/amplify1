import type { AnaReferenceScenario } from "./reference-suite.js";
import { schoolIntro, schoolOffer2, consultingTranscript, carlitosTranscript } from "./progress-suite.js";

type Step = {
  user: string;
  expected: AnaReferenceScenario["expected"];
  expectedQualification?: AnaReferenceScenario["expectedQualification"];
  response?: AnaReferenceScenario["response"];
  offlineReply?: string;
};
type Sequence = { name: string; seed?: AnaReferenceScenario["turns"]; turns: Step[] };
const seed = (turns: string[]): AnaReferenceScenario["turns"] => turns.map((text, i) => ({ role: i % 2 ? "assistant" : "user", text }));

// Fixed seeds reproduce the reported assistant commitments. Every subsequent
// assistant turn is the real engine output in live mode (never scripted).
export const ANA_PROGRESS_MULTITURN: Sequence[] = [
  { name: "multi: escola explica e depois qualifica", seed: seed([...schoolIntro, schoolOffer2]), turns: [
    { user: "ok quero sim,", expected: { answerRequired: true, shouldAskQuestion: false }, response: { containsAny: ["L.E.I.A.", "programa"], maxQuestions: 0 } },
    { user: "Quero contratar para ensinar IA a 120 alunos do ensino médio. Temos internet estável e queremos começar no próximo ano.", expected: { nextQuestionKey: "contactConsent", leadStage: "qualified" }, expectedQualification: { name: "Leonardo", studentCount: 120, contactConsent: false }, response: { maxQuestions: 1 } },
    { user: "Prefiro não receber contato", expected: { shouldAskQuestion: false }, expectedQualification: { contactConsent: false, contactRevoked: true }, response: { maxQuestions: 0 } },
  ] },
  { name: "multi: diagnóstico descobre prioridades", seed: seed(consultingTranscript.slice(0, 6)), turns: [
    { user: "Quero sim", expected: { answerRequired: true, shouldAskQuestion: false }, response: { containsAll: ["diagnóstico"], maxQuestions: 0 } },
    { user: "Quero avançar com o diagnóstico, mas não sei ainda quais são minhas prioridades.", expected: { nextQuestionKey: "timeline" }, expectedQualification: { contactConsent: false }, response: { maxQuestions: 1 } },
    { user: "Mês que vem", expected: { nextQuestionKey: "contactConsent", leadStage: "qualified" }, expectedQualification: { contactConsent: false }, response: { maxQuestions: 1 } },
  ] },
  { name: "multi: três processos no mesmo diagnóstico", seed: seed(consultingTranscript.slice(0, 14)), turns: [
    { user: "As três juntas", expected: { nextQuestionKey: "timeline" }, expectedQualification: { qualificationFocus: "consulting", contactConsent: false }, response: { maxQuestions: 1 } },
    { user: "Queremos começar mês que vem", expected: { nextQuestionKey: "contactConsent", leadStage: "qualified" }, response: { maxQuestions: 1 } },
    { user: "Antes disso: como funciona esse diagnóstico?", expected: { answerRequired: true }, expectedQualification: { contactConsent: false }, response: { containsAll: ["diagnóstico"], maxQuestions: 1 } },
  ] },
  { name: "multi: Carlitos objetivos iguais", turns: [
    { user: carlitosTranscript[0], expected: { answerRequired: true, nextQuestionKey: "timeline" }, expectedQualification: { name: "Carlitos", contactConsent: false }, response: { maxQuestions: 1 } },
    { user: carlitosTranscript[2], expected: { nextQuestionKey: "timeline" }, expectedQualification: { name: "Carlitos", contactConsent: false }, response: { maxQuestions: 1 } },
    { user: "Ambos são igualmente prioritários. Queremos começar mês que vem.", expected: { nextQuestionKey: "contactConsent", leadStage: "qualified" }, expectedQualification: { contactConsent: false }, response: { maxQuestions: 1 } },
  ] },
  { name: "multi: resposta suficiente em formato livre", turns: [
    { user: "Meu nome é Lia. Quero uma proposta para automatizar atendimento e cobrança no escritório. Desejamos começar mês que vem.", expected: { nextQuestionKey: "contactConsent", leadStage: "qualified" }, expectedQualification: { contactConsent: false }, response: { maxQuestions: 1 } },
    { user: "Não autorizo contato. Só queria entender.", expected: { shouldAskQuestion: false }, expectedQualification: { contactConsent: false, contactRevoked: true }, response: { maxQuestions: 0 } },
  ] },
];
