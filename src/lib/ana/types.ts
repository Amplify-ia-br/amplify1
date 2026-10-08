import type { UIMessage } from "ai";
import type { AnaKnowledgeMode, AnaModelId } from "./config.js";

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
};

export type AnaMessage = UIMessage<AnaMessageMetadata>;
