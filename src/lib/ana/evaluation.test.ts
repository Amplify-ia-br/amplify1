import { describe, expect, it } from "vitest";
import { analyzeAnaConversation } from "./conversation";
import { evaluateState, evaluateQualification, evaluateResponse, evaluateHandoff, evaluateQuestion } from "./evaluation";

const state = analyzeAnaConversation([{ id: "u1", role: "user", parts: [{ type: "text", text: "Oi" }] }]);
describe("evaluation fail-closed acceptance", () => {
  it("does not make optional name collection a prerequisite to answering", () => {
    const asking = { ...state, shouldAskQuestion: true, nextQuestion: { key: "name" as const, text: "Qual é seu nome?" } };
    expect(evaluateQuestion(asking, "A Amplify oferece consultoria.")).toEqual([]);
    expect(evaluateQuestion(asking, "Quantos alunos?")).toHaveLength(1);
    expect(evaluateResponse("A Amplify oferece consultoria.", { containsAll: ["nome"] })).toHaveLength(1);
  });
  it("checks corrected facts and explicit refusal, not only a stage label", () => {
    expect(evaluateQualification(state, { studentCount: 60, contactRevoked: true })).toHaveLength(2);
  });
  it("does not approve the right planned question when a different one was written", () => {
    const asking = { ...state, shouldAskQuestion: true, nextQuestion: { key: "students" as const, text: "Quantos alunos?" } };
    expect(evaluateQuestion(asking, "Qual é o seu e-mail?")).toHaveLength(1);
    expect(evaluateQuestion(asking, "Certo.")).toHaveLength(1);
    expect(evaluateQuestion(asking, "Quantos estudantes vocês querem atender?")).toEqual([]);
  });
  it("fails mandatory expected state even if response looks good", () => {
    expect(evaluateState(state, { stage: "handoff" })).toHaveLength(1);
  });
  it("fails a mismatched question", () => {
    expect(evaluateState(state, { nextQuestionKey: "internet" })).toHaveLength(1);
  });
  it("fails empty or missing mandatory response", () => {
    expect(evaluateResponse("", { containsAll: ["L.E.I.A."] })).toHaveLength(2);
    expect(evaluateResponse("Bom dia", { containsAny: ["projetos", "consultoria"] })).toHaveLength(1);
  });
  it("tests case and accents but not semantic truth", () => {
    expect(evaluateResponse("EDUCACAO", { containsAll: ["educação"] })).toEqual([]);
  });
  it("does not certify a commercial handoff without real persistence", () => {
    expect(evaluateHandoff(state, "Seu contato ficou registrado.")).toHaveLength(1);
  });
});
