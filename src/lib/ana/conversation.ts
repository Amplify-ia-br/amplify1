import { normalizeKnowledgeText } from "../okf/core.js";
import type { AnaMessage } from "./types.js";

export type AnaTurnKind = "greeting" | "acknowledgement" | "gratitude" | "farewell" | "disclosure" | "request";
export type AnaConversationStage = "opening" | "discovery" | "solution" | "qualification" | "closing";

export type AnaConversationState = {
  turnKind: AnaTurnKind;
  stage: AnaConversationStage;
  shouldRetrieveKnowledge: boolean;
  shouldAskQuestion: boolean;
  pageHint?: "leia";
  knownFacts: string[];
  recentAssistantQuestions: string[];
  userTurnCount: number;
};

function messageText(message: AnaMessage) {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

function canonical(value: string) {
  return normalizeKnowledgeText(value).replace(/[!?.,;:()[\]{}"']/g, "").trim();
}

function matchesOnly(value: string, alternatives: RegExp) {
  return alternatives.test(canonical(value));
}

export function classifyAnaTurn(value: string): AnaTurnKind {
  if (matchesOnly(value, /^(oi|ola|oie|bom dia|boa tarde|boa noite)( tudo bem| tudo bom| como vai)?$/)) {
    return "greeting";
  }
  if (matchesOnly(value, /^(obrigado|obrigada|valeu|agradeco|muito obrigado|muito obrigada)$/)) {
    return "gratitude";
  }
  if (matchesOnly(value, /^(tchau|ate mais|ate logo|falou|encerramos|por enquanto e so)$/)) {
    return "farewell";
  }
  if (matchesOnly(value, /^(ok|okay|certo|entendi|compreendi|beleza|ta bom|tudo bem|perfeito|legal|faz sentido|ah sim)$/)) {
    return "acknowledgement";
  }

  const normalized = normalizeKnowledgeText(value);
  const asksQuestion = value.includes("?") || /^(como|qual|quais|quanto|quando|onde|por que|porque|quem|o que|tem|posso|podem|voces|vcs)\b/.test(normalized);
  return asksQuestion ? "request" : "disclosure";
}

function inferKnownFacts(userMessages: string[]) {
  const joined = normalizeKnowledgeText(userMessages.join(" "));
  const facts: string[] = [];
  if (/\b(dono|dona|proprietario|proprietaria)\b.*\bescola\b/.test(joined)) facts.push("A pessoa é proprietária de uma escola.");
  else if (/\b(diretor|diretora|gestor|gestora|coordenador|coordenadora|professor|professora)\b.*\bescola\b/.test(joined)) facts.push("A pessoa atua profissionalmente em uma escola.");
  else if (/\bescola\b/.test(joined)) facts.push("A conversa envolve uma escola.");
  if (/\bescola particular\b/.test(joined)) facts.push("A escola é particular.");
  if (/\b(aluno|alunos|estudante|estudantes)\b/.test(joined)) facts.push("O interesse mencionado envolve estudantes.");
  if (/\b(professor|professores|docente|docentes)\b/.test(joined)) facts.push("O interesse mencionado envolve professores.");
  if (/\binternet (estavel|boa|rapida)\b/.test(joined)) facts.push("A pessoa informou que a escola possui internet adequada.");
  return facts;
}

function recentQuestions(messages: AnaMessage[]) {
  return messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) => messageText(message).split(/(?<=[?])\s+/))
    .filter((sentence) => sentence.includes("?"))
    .slice(-3);
}

export function analyzeAnaConversation(messages: AnaMessage[], pagePath?: string): AnaConversationState {
  const userMessages = messages.filter((message) => message.role === "user").map(messageText).filter(Boolean);
  const latest = userMessages.at(-1) ?? "";
  const turnKind = classifyAnaTurn(latest);
  const userTurnCount = userMessages.length;
  const pageHint = pagePath?.toLocaleLowerCase("pt-BR").startsWith("/leia") ? "leia" : undefined;

  const stage: AnaConversationStage = turnKind === "farewell"
    ? "closing"
    : userTurnCount === 1 && turnKind === "greeting"
      ? "opening"
      : turnKind === "request"
        ? "solution"
        : "discovery";

  return {
    turnKind,
    stage,
    shouldRetrieveKnowledge: turnKind === "request",
    shouldAskQuestion: turnKind === "disclosure",
    pageHint,
    knownFacts: inferKnownFacts(userMessages),
    recentAssistantQuestions: recentQuestions(messages),
    userTurnCount,
  };
}

export function immediateAnaReply(state: AnaConversationState, messages: AnaMessage[]) {
  if (state.turnKind === "greeting") return "Oi! Tudo bem? Como posso te ajudar?";
  if (state.turnKind === "gratitude") return "Eu que agradeço! Se precisar, estou por aqui.";
  if (state.turnKind === "farewell") return "Até mais! Foi um prazer conversar com você.";
  if (state.turnKind !== "acknowledgement") return undefined;

  const mentionsLeia = messages.some((message) => /l\s*\.\s*e\s*\.\s*i\s*\.\s*a\s*\.?/i.test(messageText(message)));
  if (mentionsLeia) {
    return "Claro. Se quiser, posso explicar algum ponto do L.E.I.A. com mais calma.";
  }
  return "Claro. Se quiser continuar, estou por aqui.";
}
