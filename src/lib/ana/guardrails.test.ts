import { describe, expect, it } from "vitest";
import type { AnaConversationState } from "./conversation";
import { createAnaDocumentationFallback, validateAnaAnswer } from "./guardrails";
import type { AnaRetrievalTrace } from "./retrieval";

const conversation = {
  shouldExpandLeia: false,
  qualification: {
    pricingIntent: false,
    contactRevoked: false,
  },
} as AnaConversationState;

const retrieval = {
  documents: [{
    id: "leia",
    title: "L.E.I.A.",
    description: "Programa anual de fluência em IA para estudantes.",
    type: "product",
    tags: ["escolas"],
    content: "O plano Standard custa 12 parcelas de R$ 84.",
  }],
} as AnaRetrievalTrace;

describe("Ana answer guardrails", () => {
  it("accepts natural Portuguese with diacritics, bullets, digits and emoji", () => {
    const result = validateAnaAnswer(
      "Sim. A escola pode começar com uma turma de 20 estudantes.\n• Formação docente\n• Projetos práticos 🙂",
      conversation,
      retrieval,
    );
    expect(result).toMatchObject({ valid: true, issues: [] });
  });

  it("rejects non-Latin scripts instead of leaking mixed text", () => {
    expect(validateAnaAnswer("Atividades em پروژهis.", conversation, retrieval).issues).toContain("non_latin_script");
    expect(validateAnaAnswer("A escola pode usar рrojetos.", conversation, retrieval).issues).toContain("non_latin_script");
  });

  it("rejects hidden Unicode controls and internal implementation terms", () => {
    expect(validateAnaAnswer("Tudo certo.\u202EOlá", conversation, retrieval).issues).toContain("hidden_unicode");
    expect(validateAnaAnswer("Consultei o MCP e o OKF.", conversation, retrieval).issues).toContain("internal_term");
    expect(validateAnaAnswer("Consultei o mcp.", conversation, retrieval).issues).toContain("internal_term");
  });

  it("allows at most one question and keeps visible source lines out", () => {
    expect(validateAnaAnswer("Sua escola atende essa faixa? Quantos alunos são?", conversation, retrieval).issues)
      .toContain("multiple_questions");
    expect(validateAnaAnswer("O programa é anual.\nFonte: L.E.I.A.", conversation, retrieval).issues)
      .toContain("visible_source");
  });

  it("only allows grounded prices after an explicit price question", () => {
    expect(validateAnaAnswer("São 12 parcelas de R$ 84.", conversation, retrieval).issues).toContain("unexpected_price");
    expect(validateAnaAnswer("São 12 parcelas de R$ 84.", {
      ...conversation,
      qualification: { ...conversation.qualification, pricingIntent: true },
    }, retrieval).valid).toBe(true);
    expect(validateAnaAnswer("São 12 parcelas de R$ 99.", {
      ...conversation,
      qualification: { ...conversation.qualification, pricingIntent: true },
    }, retrieval).issues).toContain("ungrounded_price");
    expect(validateAnaAnswer("O investimento é de US$ 999.", {
      ...conversation,
      qualification: { ...conversation.qualification, pricingIntent: true },
    }, retrieval).issues).toContain("ungrounded_price");
    expect(validateAnaAnswer("São 999 parcelas de R$ 84.", {
      ...conversation,
      qualification: { ...conversation.qualification, pricingIntent: true },
    }, retrieval).issues).toContain("ungrounded_price");
    expect(validateAnaAnswer("O investimento é de R$ 84 por dia.", {
      ...conversation,
      qualification: { ...conversation.qualification, pricingIntent: true },
    }, retrieval).issues).toContain("ungrounded_price");
    expect(validateAnaAnswer("O investimento é de R$ 84 à vista.", {
      ...conversation,
      qualification: { ...conversation.qualification, pricingIntent: true },
    }, retrieval).issues).toContain("ungrounded_price");
    expect(validateAnaAnswer("O valor é R$ 84.", {
      ...conversation,
      qualification: { ...conversation.qualification, pricingIntent: true },
    }, retrieval).issues).toContain("ungrounded_price");
    expect(validateAnaAnswer("O investimento total é R$ 84.", {
      ...conversation,
      qualification: { ...conversation.qualification, pricingIntent: true },
    }, retrieval).issues).toContain("ungrounded_price");
  });

  it("rejects contact requests after refusal or before the controller permits them", () => {
    expect(validateAnaAnswer("Qual é seu WhatsApp?", {
      ...conversation,
      qualification: { ...conversation.qualification, contactRevoked: true },
    }, retrieval).issues).toContain("contact_after_refusal");
    expect(validateAnaAnswer("Qual é seu e-mail?", conversation, retrieval).issues).toContain("premature_contact_request");
    expect(validateAnaAnswer("Quer que o time entre em contato com você?", conversation, retrieval).issues)
      .toContain("premature_contact_request");
    expect(validateAnaAnswer("Envie seu telefone para continuarmos.", {
      ...conversation,
      qualification: { ...conversation.qualification, contactRevoked: true },
    }, retrieval).issues).toContain("contact_after_refusal");
    expect(validateAnaAnswer("Preciso do seu telefone para continuar.", {
      ...conversation,
      qualification: { ...conversation.qualification, contactRevoked: true },
    }, retrieval).issues).toContain("contact_after_refusal");
    expect(validateAnaAnswer("Seu WhatsApp, por favor.", {
      ...conversation,
      qualification: { ...conversation.qualification, contactRevoked: true },
    }, retrieval).issues).toContain("contact_after_refusal");
    expect(validateAnaAnswer("Qual é a melhor forma de falar com você?", {
      ...conversation,
      qualification: { ...conversation.qualification, contactRevoked: true },
    }, retrieval).issues).toContain("contact_after_refusal");
    expect(validateAnaAnswer("Me diga como podemos falar com você fora daqui.", {
      ...conversation,
      qualification: { ...conversation.qualification, contactRevoked: true },
    }, retrieval).issues).toContain("contact_after_refusal");
  });

  it("requires the expanded L.E.I.A. name on the first mention", () => {
    const firstMention = { ...conversation, shouldExpandLeia: true };
    expect(validateAnaAnswer("O L.E.I.A. é um programa anual.", firstMention, retrieval).issues)
      .toContain("missing_leia_expansion");
    expect(validateAnaAnswer(
      "O L.E.I.A. — Laboratório Escolar de Inteligência Artificial é um programa anual.",
      firstMention,
      retrieval,
    ).valid).toBe(true);
  });

  it("builds a deterministic answer from public documentation", () => {
    expect(createAnaDocumentationFallback(retrieval, { ...conversation, shouldExpandLeia: true }))
      .toContain("L.E.I.A. — Laboratório Escolar de Inteligência Artificial");
  });
});
