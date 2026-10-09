import type { UIMessage } from "ai";
import type { AnaKnowledgeMode, AnaModelId } from "./config.js";
import type { AnaConversationStage, AnaTurnKind } from "./conversation.js";
import type { AnaRetrievalTrace } from "./retrieval.js";

export type AnaMessageMetadata = {
  createdAt?: number;
  completedAt?: number;
  mode?: AnaKnowledgeMode;
  model?: AnaModelId;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  generationId?: string;
  resolvedModel?: string;
  turnKind?: AnaTurnKind;
  conversationStage?: AnaConversationStage;
  leadStage?: import("./conversation.js").AnaLeadStage;
  qualificationScore?: number;
  nextQuestionKey?: import("./conversation.js").AnaNextQuestion["key"];
};

export type AnaDataParts = {
  retrieval: AnaRetrievalTrace;
};

export type AnaMessage = UIMessage<AnaMessageMetadata, AnaDataParts>;
