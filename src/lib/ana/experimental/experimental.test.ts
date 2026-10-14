import { describe, expect, it, vi } from "vitest";
import type { AnaRetrievalTrace } from "../retrieval.js";
import { applyTurnUnderstanding, experimentalLeadStage } from "./memory.js";
import { validateExperimentalReply } from "./policy.js";
import { buildExperimentalSystem } from "./prompt.js";
import type { AnaTurnOutput } from "./schema.js";
import { runExperimentalTurn, type TurnGenerator } from "./turn.js";

const retrieval = {
  query: "", normalizedTerms: [], intent: "geral", mode: "direct", listMs: 0, fetchMs: 0, totalMs: 0,
  ranked: [], documents: [], fallbackText: "",
} as AnaRetrievalTrace;

function output(overrides: Partial<AnaTurnOutput> = {}): AnaTurnOutput {
  return {
    reply: "Que bom ter você aqui.", turnKind: "disclosure", userName: null, offerInterest: null,
    wantsToAdvance: false, wantsMeeting: false, asksPricing: false, contactConsent: null,
    schoolSector: null, gradeFit: null, studentCount: null, internetReady: null, facts: [],
    questionField: null, ...overrides,
  };
}

const usage = { inputTokens: 1, outputTokens: 1, totalTokens: 2 };
const ctx = { shouldExpandLeia: false, leadStage: "engaged", retrieval };

describe("memória com evidência", () => {
  it("só aceita fatos sustentados por palavras da própria pessoa", () => {
    const q = applyTurnUnderstanding(undefined, output({
      facts: [
        { field: "need", status: "provided", value: "medo de IA entre professores", evidence: "os professores estão com medo de IA" },
        { field: "timeline", status: "provided", value: "este semestre", evidence: "começar neste semestre" },
      ],
    }), ["Tenho uma escola e os professores estão com medo de IA"]);
    expect(q.answers?.need?.status).toBe("provided");
    expect(q.answers?.timeline).toBeUndefined();
  });

  it("descarta nome que não aparece na fala da pessoa e aceita o que aparece", () => {
    expect(applyTurnUnderstanding(undefined, output({ userName: "Marina" }), ["Sou professora"]).name).toBeUndefined();
    expect(applyTurnUnderstanding(undefined, output({ userName: "Marina" }), ["Me chamo Marina"]).name).toBe("Marina");
  });

  it("'não sei' posterior não apaga o que já foi informado", () => {
    const first = applyTurnUnderstanding(undefined, output({
      facts: [{ field: "timeline", status: "provided", value: "março", evidence: "em março" }],
    }), ["Queremos começar em março"]);
    const second = applyTurnUnderstanding(first, output({
      facts: [{ field: "timeline", status: "unknown", value: "", evidence: "não sei" }],
    }), ["Queremos começar em março", "não sei"]);
    expect(second.answers?.timeline?.status).toBe("provided");
  });

  it("consentimento exige intenção de avançar e recusa revoga", () => {
    const sem = applyTurnUnderstanding(undefined, output({ contactConsent: "granted" }), ["pode"]);
    expect(sem.contactConsent).toBe(false);
    const com = applyTurnUnderstanding(undefined, output({ contactConsent: "granted", wantsToAdvance: true }), ["quero proposta, pode"]);
    expect(com.contactConsent).toBe(true);
    const recusa = applyTurnUnderstanding(com, output({ contactConsent: "refused" }), ["quero proposta", "prefiro não"]);
    expect(recusa.contactRevoked).toBe(true);
  });

  it("handoff só com consentimento e contato extraído do texto da pessoa", () => {
    const q = applyTurnUnderstanding(undefined, output({ contactConsent: "granted", wantsToAdvance: true }),
      ["quero proposta, pode falar comigo em ana@empresa.com"]);
    expect(q.email).toBe("ana@empresa.com");
    expect(experimentalLeadStage(q)).toBe("handoff");

    const semConsentimento = applyTurnUnderstanding(undefined, output({ wantsToAdvance: true }),
      ["quero proposta, meu e-mail é ana@empresa.com"]);
    expect(semConsentimento.email).toBe("ana@empresa.com");
    expect(experimentalLeadStage(semConsentimento)).not.toBe("handoff");
  });
});

describe("validação determinística", () => {
  const base = applyTurnUnderstanding(undefined, output(), ["oi"]);

  it("aceita resposta natural sem pergunta", () => {
    expect(validateExperimentalReply("Oi! Eu sou a Ana, da Amplify.", output(), base, ctx).valid).toBe(true);
  });

  it("bloqueia contato prematuro, duas perguntas e pergunta após agradecimento", () => {
    expect(validateExperimentalReply("Qual seu e-mail?", output(), base, ctx).issues).toContain("premature_contact_request");
    expect(validateExperimentalReply("Qual o prazo? E o orçamento?", output(), base, ctx).issues).toContain("multiple_questions");
    expect(validateExperimentalReply("De nada! Posso ajudar em algo mais?", output({ turnKind: "gratitude" }), base, ctx).issues)
      .toContain("question_after_closing");
  });

  it("bloqueia pergunta repetida sobre algo que a pessoa já respondeu", () => {
    const q = applyTurnUnderstanding(undefined, output({
      facts: [{ field: "timeline", status: "provided", value: "março", evidence: "em março" }],
    }), ["em março"]);
    expect(validateExperimentalReply("Qual é o prazo que vocês têm em mente?", output(), q, ctx).issues).toContain("repeated_question");
  });

  it("exige consentimento antes do canal e respeita recusa", () => {
    const advancing = applyTurnUnderstanding(undefined, output({ wantsToAdvance: true }), ["quero proposta"]);
    expect(validateExperimentalReply("Qual e-mail ou WhatsApp prefere?", output({ wantsToAdvance: true }), advancing, ctx).issues)
      .toContain("contact_channel_before_consent");
    const refused = applyTurnUnderstanding(advancing, output({ contactConsent: "refused" }), ["quero proposta", "não quero"]);
    expect(validateExperimentalReply("Posso pedir seu e-mail?", output(), refused, ctx).issues).toContain("contact_after_refusal");
  });

  it("bloqueia preço não solicitado e promessas não executadas", () => {
    expect(validateExperimentalReply("O plano custa R$ 1.000 por mês.", output(), base, ctx).issues).toContain("unexpected_price");
    expect(validateExperimentalReply("Sua reunião foi agendada para amanhã.", output(), base, ctx).issues).toContain("unconfirmed_handoff");
  });
});

describe("prompt", () => {
  it("expõe memória e metas opcionais, sem fila de perguntas obrigatória", () => {
    const q = applyTurnUnderstanding(undefined, output({
      facts: [{ field: "need", status: "provided", value: "medo de IA", evidence: "medo de IA" }],
    }), ["medo de IA"]);
    const system = buildExperimentalSystem({ qualification: q, retrieval, shouldExpandLeia: true });
    expect(system).toContain("medo de IA");
    expect(system).toContain("opcionais");
    expect(system).not.toContain("pergunta recomendada");
  });
});

describe("orquestração do turno", () => {
  const base = { model: "openai/gpt-5.4-mini-fast" as const, messages: [], userTexts: ["Tenho uma escola"], assistantTexts: [], retrieval };

  it("usa uma única chamada quando a resposta é válida", async () => {
    const generate = vi.fn<TurnGenerator>().mockResolvedValue({ output: output({ reply: "Conte mais sobre a escola." }), usage, resolvedModel: "m" });
    const turn = await runExperimentalTurn({ ...base, generate });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(turn).toMatchObject({ qualityRetryCount: 0, qualityFallback: false, modelCalls: 1 });
  });

  it("reenvia uma vez com as violações e aceita a correção", async () => {
    const generate = vi.fn<TurnGenerator>()
      .mockResolvedValueOnce({ output: output({ reply: "Qual seu e-mail?" }), usage, resolvedModel: "m" })
      .mockResolvedValueOnce({ output: output({ reply: "Conte mais sobre a escola." }), usage, resolvedModel: "m2" });
    const turn = await runExperimentalTurn({ ...base, generate });
    expect(turn).toMatchObject({ qualityRetryCount: 1, qualityFallback: false, text: "Conte mais sobre a escola." });
    expect(generate.mock.calls[1][0].system).toContain("premature_contact_request");
  });

  it("cai no fallback seguro após duas falhas, preservando a memória extraída", async () => {
    const generate = vi.fn<TurnGenerator>().mockResolvedValue({
      output: output({
        reply: "Qual seu e-mail?",
        userName: "Marina",
      }),
      usage, resolvedModel: "m",
    });
    const turn = await runExperimentalTurn({ ...base, userTexts: ["Me chamo Marina"], generate });
    expect(turn.qualityFallback).toBe(true);
    expect(turn.qualification.name).toBe("Marina");
    expect(turn.text).not.toContain("e-mail");
  });

  it("sobrevive a falha do provedor", async () => {
    const generate = vi.fn<TurnGenerator>().mockRejectedValue(new Error("provider_unavailable"));
    const turn = await runExperimentalTurn({ ...base, generate });
    expect(turn).toMatchObject({ qualityFallback: true, modelCalls: 2 });
  });
});
