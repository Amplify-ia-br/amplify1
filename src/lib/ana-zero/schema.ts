import type { UIMessage } from "ai";
import { z } from "zod-v4";
import { ANA_MODELS, type AnaModelId } from "../ana/config.js";

const selectableModels = Object.keys(ANA_MODELS) as [AnaModelId, ...AnaModelId[]];

export const ANA_ZERO_DEFAULT_MODEL: AnaModelId = "openai/gpt-5.4-mini-fast";
export const ANA_ZERO_MAX_MESSAGES = 40;

export const memoryKeys = [
  "name",
  "organization",
  "role",
  "need",
  "audience",
  "timeline",
  "decision_maker",
  "contact_preference",
  "other",
] as const;

export const memoryEntrySchema = z.strictObject({
  key: z.enum(memoryKeys),
  value: z.string().trim().min(1).max(300),
  evidence: z.string().trim().min(2).max(400),
});

export type AnaZeroMemoryEntry = z.infer<typeof memoryEntrySchema>;

export type AnaZeroHandoff = {
  summary: string;
  consentQuote: string;
  contact: string;
};

const textMessage = (role: "user" | "assistant") =>
  z.strictObject({
    id: z.string().trim().min(1).max(160),
    role: z.literal(role),
    parts: z
      .array(z.strictObject({ type: z.literal("text"), text: z.string().trim().min(1).max(4_000) }))
      .length(1),
  });

export const anaZeroRequestSchema = z.strictObject({
  messages: z
    .array(z.union([textMessage("user"), textMessage("assistant")]))
    .min(1)
    .max(ANA_ZERO_MAX_MESSAGES),
  memory: z.array(memoryEntrySchema).max(20).default([]),
  model: z.enum(selectableModels).default(ANA_ZERO_DEFAULT_MODEL),
  sessionId: z.uuid().optional(),
  tester: z.string().trim().max(80).default(""),
  mission: z.string().trim().max(40).default("livre"),
}).refine((value) => value.messages[value.messages.length - 1].role === "user", {
  path: ["messages"],
  message: "A última mensagem precisa ser do usuário.",
});

export const FEEDBACK_REASONS = [
  "robotica",
  "repetitiva",
  "errou_fato",
  "pergunta_desnecessaria",
  "travou",
  "tom",
] as const;

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

const feedbackComment = z.string().trim().max(2_000).optional();

export const anaZeroFeedbackSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("turn"),
    sessionId: z.uuid(),
    turnIndex: z.number().int().min(1).max(ANA_ZERO_MAX_MESSAGES),
    verdict: z.union([z.literal(1), z.literal(-1)]),
    reasons: z.array(z.enum(FEEDBACK_REASONS)).max(FEEDBACK_REASONS.length).default([]),
    comment: feedbackComment,
  }),
  z.strictObject({
    kind: z.literal("session"),
    sessionId: z.uuid(),
    rating: z.number().int().min(1).max(5),
    helped: z.boolean().optional(),
    comment: feedbackComment,
  }),
]);

export type AnaZeroFeedback = z.infer<typeof anaZeroFeedbackSchema>;

export type AnaZeroMetadata = {
  turnIndex?: number;
  saved?: boolean;
  createdAt?: number;
  completedAt?: number;
  engine?: "ana-zero";
  model?: AnaModelId;
  resolvedModel?: string;
  memory?: AnaZeroMemoryEntry[];
  handoff?: AnaZeroHandoff;
  toolCalls?: string[];
  sources?: Array<{ id: string; title: string }>;
  regenerated?: boolean;
  issues?: string[];
  errors?: string[];
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
};

export type AnaZeroMessage = UIMessage<AnaZeroMetadata>;
