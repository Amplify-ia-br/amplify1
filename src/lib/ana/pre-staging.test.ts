import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeAnaConversation } from "./conversation";
import { ANA_REFERENCE_SUITE } from "./reference-suite";
import { validateAnaAnswer } from "./guardrails";
import { evaluateResponse } from "./evaluation";
import { buildAnaRetrievalQuery } from "./http";
import { retrieveAnaKnowledge } from "./retrieval";
import { fileKnowledgeService } from "../okf/file-service";
import { progressMessages } from "./progress-suite";

const mocks = vi.hoisted(() => ({ generateText: vi.fn(), gateway: vi.fn((model: string) => ({ model })) }));
vi.mock("ai", async original => ({ ...await original<typeof import("ai")>(), ...mocks }));
import { generateAnaAnswer } from "./agent";

// Exact observed responses; original live reports and lexical criteria remain unchanged.
const infrastructure = "Claro. O L.E.I.A. — Laboratório Escolar de Inteligência Artificial é um programa anual para estudantes do 9º ano do Ensino Fundamental à 3ª série do Ensino Médio, com projetos mediados por professor e foco em pensar com a IA, verificar o que ela produz e assumir responsabilidade pelo que cria.\n\nPara a proposta, o ponto que muda a estrutura e o investimento é o plano de infraestrutura: Standard, Silver ou Gold. Qual desses faz mais sentido para a sua escola?";
const incomplete = "Claro. Para escolas, a solução é o L.E.I.A. — Laboratório Escolar de Inteligência Artificial.\n\nEle ajuda em duas frentes ao mesmo tempo:\n• com os estudantes, desenvolve fluência em IA com projetos, verificação de respostas e responsabilidade sobre o que foi criado;\n• na escola, pode ser organizado no contraturno ou integrado ao currículo, e os planos mudam conforme a infraestrutura: a escola pode usar sua própria estrutura ou contratar a organização do acesso à IA e dos equipamentos pela Amplify.\n\nSe quiser, posso te explicar como funciona o percurso do ano ou como os planos se diferenciam.";
const complete = "Para estudantes, o L.E.I.A. — Laboratório Escolar de Inteligência Artificial trabalha fluência em IA com projetos mediados por professor. Para a operação, a Consultoria pode mapear oportunidades e redesenhar processos com IA. Podemos explicar essas frentes aqui, sem contato comercial.";

async function context(name: string) {
  const scenario = ANA_REFERENCE_SUITE.find(x => x.name === name)!;
  const history = progressMessages(...scenario.turns.map(x => x.text));
  const state = analyzeAnaConversation(history, scenario.pagePath);
  const trace = await retrieveAnaKnowledge("direct", buildAnaRetrievalQuery(scenario.turns.at(-1)!.text, state), fileKnowledgeService);
  return { scenario, state, trace };
}
const proposal = () => context("pedido de proposta autoriza avanço gradual");
const refusal = () => context("recusa seguida de pergunta volta a responder");
function generated(text: string) {
  return { text, usage: { inputTokens: 10, outputTokens: 5 }, finishReason: "stop", finalStep: { providerMetadata: {}, response: { modelId: "mock-model" } } };
}

describe("pre-staging review: recorded failures, no paid calls", () => {
  beforeEach(() => mocks.generateText.mockReset());
  it("rejects the recorded infrastructure detour when only an optional name is recommended", async () => {
    const { state, trace } = await proposal();
    expect(state.nextQuestion?.key).toBe("name");
    expect(validateAnaAnswer(infrastructure, state, trace).issues).toContain("unexpected_qualification_question");
    expect(state.qualification.contactConsent).toBe(false);
  });
  it.each(["Qual é o seu nome?", "Como posso te chamar?", ""])("keeps the name optional and accepts its wording: %s", async question => {
    const { state, trace } = await proposal();
    const answer = `O L.E.I.A. — Laboratório Escolar de Inteligência Artificial é um programa anual para estudantes. ${question}`;
    expect(validateAnaAnswer(answer, state, trace).valid).toBe(true);
  });
  it("detects the recorded missing operational answer after refusal despite both documents being retrieved", async () => {
    const { state, trace } = await refusal();
    expect(state.qualification).toMatchObject({ contactConsent: false, contactRevoked: true, needs: ["students", "processes"] });
    expect(trace.documents.map(x => x.id)).toEqual(expect.arrayContaining(["leia", "portfolio"]));
    expect(validateAnaAnswer(incomplete, state, trace).issues).toContain("missing_requested_front");
    expect(validateAnaAnswer(complete, state, trace).valid).toBe(true);
  });
  it("does not force the previous two topics when the new question selects one", async () => {
    const { scenario, trace } = await refusal();
    const state = analyzeAnaConversation(progressMessages(...scenario.turns.map(x => x.text), complete, "Como o L.E.I.A. pode ajudar apenas os alunos?"));
    expect(validateAnaAnswer(incomplete, state, trace).issues).not.toContain("missing_requested_front");
    expect(state.qualification.contactConsent).toBe(false);
  });
  it("respects a single previously selected front in a later general question", async () => {
    const { state: previous, trace } = await refusal();
    const state = analyzeAnaConversation(progressMessages("Como vocês podem ajudar?"), undefined,
      { ...previous.qualification, qualificationFocus: "consulting" });
    expect(state.answerNeedsTogether).toBe(false);
    expect(validateAnaAnswer("A consultoria pode redesenhar processos com IA.", state, trace).issues).not.toContain("missing_requested_front");
  });
  it("does not demand unsupported coverage when a required document is unavailable", async () => {
    const { state, trace } = await refusal();
    expect(validateAnaAnswer("Não encontrei informação suficiente para explicar as duas frentes.", state,
      { ...trace, documents: [] }).issues).not.toContain("missing_requested_front");
  });
  it.each([
    [proposal, infrastructure, "O L.E.I.A. — Laboratório Escolar de Inteligência Artificial é um programa anual. Qual é o seu nome?", "unexpected_qualification_question"],
    [refusal, incomplete, complete, "missing_requested_front"],
  ] as const)("rejects the recorded generation and validates the existing retry", async (makeContext, bad, good, issue) => {
    const { state, trace } = await makeContext();
    mocks.generateText.mockResolvedValueOnce(generated(bad)).mockResolvedValueOnce(generated(good));
    const answer = await generateAnaAnswer("direct", "openai/gpt-5.4-mini-fast", [], trace, state);
    expect(answer.text).toBe(good);
    expect(answer.qualityRetryCount).toBe(1);
    expect(answer.qualityFallback).toBe(false);
    expect(answer.validationIssues).toContain(issue);
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
    expect(state.qualification.contactConsent).toBe(false);
  });
  it("uses the existing documented fallback when both generated attempts omit a front", async () => {
    const { state, trace } = await refusal();
    mocks.generateText.mockResolvedValue(generated(incomplete));
    const answer = await generateAnaAnswer("direct", "openai/gpt-5.4-mini-fast", [], trace, state);
    expect(answer.qualityFallback).toBe(true);
    expect(answer.text).toContain("Consultoria");
    expect(validateAnaAnswer(answer.text, state, trace).valid).toBe(true);
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
  });
  it("does not confuse real-world problems with a price or relax the original lexical evaluator", async () => {
    const { state, trace } = await proposal();
    const text = "O L.E.I.A. — Laboratório Escolar de Inteligência Artificial trabalha problemas reais com os estudantes.";
    expect(evaluateResponse(text, { excludes: ["reais"] })).toHaveLength(1);
    expect(validateAnaAnswer(text, state, trace).valid).toBe(true);
    expect(validateAnaAnswer(`${text} Custa R$ 1.`, state, trace).issues).toContain("unexpected_price");
  });
  it("preserves the strict literal diagnosis check without requiring that word in every response", async () => {
    const { state, trace } = await proposal();
    const text = "Primeiro entendemos o contexto e os processos do negócio; depois avaliamos oportunidades, riscos e próximos passos.";
    expect(evaluateResponse(text, { containsAll: ["diagnóstico"] })).toHaveLength(1);
    expect(validateAnaAnswer(text, state, trace).valid).toBe(true);
  });
});
