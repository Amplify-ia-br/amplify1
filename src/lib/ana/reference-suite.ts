import type { AnaConversationStage, AnaTurnKind } from "./conversation.js";

export type AnaReferenceScenario = {
  name: string;
  turns: Array<{ role: "user" | "assistant"; text: string }>;
  pagePath?: string;
  expected: {
    turnKind: AnaTurnKind;
    stage: AnaConversationStage;
    shouldRetrieveKnowledge: boolean;
    shouldAskQuestion: boolean;
    pageHint?: "leia";
  };
};

export const ANA_REFERENCE_SUITE: AnaReferenceScenario[] = [
  {
    name: "cumprimento não dispara apresentação comercial",
    turns: [{ role: "user", text: "Olá" }],
    expected: { turnKind: "greeting", stage: "opening", shouldRetrieveKnowledge: false, shouldAskQuestion: false },
  },
  {
    name: "contexto pessoal abre descoberta antes de oferta",
    turns: [
      { role: "user", text: "Olá" },
      { role: "assistant", text: "Oi! Tudo bem? Como posso te ajudar?" },
      { role: "user", text: "Sou dono de uma escola." },
    ],
    expected: { turnKind: "disclosure", stage: "qualification", shouldRetrieveKnowledge: false, shouldAskQuestion: true },
  },
  {
    name: "confirmação curta não repete pergunta de qualificação",
    turns: [
      { role: "user", text: "Quero conhecer o L.E.I.A." },
      { role: "assistant", text: "Posso explicar. Quais séries sua escola atende?" },
      { role: "user", text: "Entendi." },
    ],
    expected: { turnKind: "acknowledgement", stage: "qualification", shouldRetrieveKnowledge: false, shouldAskQuestion: false },
  },
  {
    name: "pergunta sobre escola consulta conhecimento",
    turns: [{ role: "user", text: "Vocês têm algum produto para escolas?" }],
    expected: { turnKind: "request", stage: "solution", shouldRetrieveKnowledge: true, shouldAskQuestion: true },
  },
  {
    name: "contexto da página é tratado como pista",
    pagePath: "/leia",
    turns: [{ role: "user", text: "Como funciona?" }],
    expected: { turnKind: "request", stage: "solution", shouldRetrieveKnowledge: true, shouldAskQuestion: true, pageHint: "leia" },
  },
  {
    name: "agradecimento encerra sem nova qualificação",
    turns: [{ role: "user", text: "Obrigado" }],
    expected: { turnKind: "gratitude", stage: "discovery", shouldRetrieveKnowledge: false, shouldAskQuestion: false },
  },
  {
    name: "despedida encerra a conversa",
    turns: [{ role: "user", text: "Até mais" }],
    expected: { turnKind: "farewell", stage: "closing", shouldRetrieveKnowledge: false, shouldAskQuestion: false },
  },
];
