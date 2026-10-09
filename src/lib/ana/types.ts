import type { UIMessage } from "ai";
import type { AnaKnowledgeMode, AnaModelId } from "./config.js";
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
};

export type AnaDataParts = {
  retrieval: AnaRetrievalTrace;
};

export type AnaMessage = UIMessage<AnaMessageMetadata, AnaDataParts>;
