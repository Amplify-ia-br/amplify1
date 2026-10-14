import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { KnowledgeReader } from "../../okf/http.js";
import { estimateAnaCost, type AnaKnowledgeMode, type AnaModelId } from "../config.js";
import type { AnaLeadQualification } from "../conversation.js";
import { retrieveAnaKnowledge } from "../retrieval.js";
import { saveAnaLeadSnapshot, saveAnaMessage } from "../store.js";
import type { AnaMessage, AnaMessageMetadata } from "../types.js";
import { runExperimentalTurn } from "./turn.js";

const HANDOFF_CONFIRMATION = "Seu contato ficou registrado para o time da Amplify continuar essa conversa com você.";

export function isExperimentalEngineEnabled() {
  return process.env.ANA_ENGINE === "experimental";
}

function textOf(message: AnaMessage) {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

// Continuity comes from the conversation itself, not from the last message alone.
export function buildExperimentalRetrievalQuery(userTexts: string[]) {
  return userTexts.slice(-3).join(" ");
}

type Input = {
  reader: KnowledgeReader;
  mode: AnaKnowledgeMode;
  model: AnaModelId;
  apiKey?: string;
  pagePath?: string;
  conversationKey: string;
  sessionHash: string;
  persistedConversationId?: string;
  incomingMessages: AnaMessage[];
  uiMessages: AnaMessage[];
  previousQualification?: Partial<AnaLeadQualification>;
  headers: Record<string, string>;
  startedAt: number;
};

export async function handleExperimentalTurn(input: Input) {
  const userTexts = input.uiMessages.filter((message) => message.role === "user").map(textOf);
  const assistantTexts = input.uiMessages.filter((message) => message.role === "assistant").map(textOf);

  let retrieval;
  try {
    retrieval = await retrieveAnaKnowledge(input.mode, buildExperimentalRetrievalQuery(userTexts), input.reader);
  } catch (error) {
    console.error("[Ana Lab] Falha durante recuperação", error);
    return Response.json(
      { error: "knowledge_unavailable", message: "Não foi possível consultar a documentação agora." },
      { status: 503, headers: input.headers },
    );
  }

  const modelMessages = await convertToModelMessages(input.uiMessages);
  const inProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV);

  const stream = createUIMessageStream<AnaMessage>({
    originalMessages: input.incomingMessages,
    async execute({ writer }) {
      writer.write({ type: "start", messageMetadata: { createdAt: input.startedAt, mode: input.mode, model: input.model } });
      writer.write({ type: "data-retrieval", data: retrieval });

      const turn = await runExperimentalTurn({
        model: input.model,
        apiKey: input.apiKey,
        messages: modelMessages,
        userTexts,
        assistantTexts,
        retrieval,
        previousQualification: input.previousQualification,
        pagePath: input.pagePath,
      });

      const persistedLead = input.persistedConversationId && turn.conversation.shouldPersistLead
        ? await saveAnaLeadSnapshot(input.persistedConversationId, turn.conversation)
        : undefined;
      // Registration is a system fact: it is stated only after persistence succeeded.
      const text = turn.conversation.leadStage === "handoff" && persistedLead?.persisted
        ? `${turn.text}\n\n${HANDOFF_CONFIRMATION}`
        : turn.text;

      const state = turn.conversation;
      const metadata = {
        turnKind: state.turnKind,
        conversationStage: state.stage,
        leadStage: state.leadStage,
        qualificationScore: state.qualificationScore,
        nextQuestionKey: state.nextQuestion?.key,
      };
      const persistedAssistant = await saveAnaMessage({
        conversationKey: input.conversationKey,
        sessionHash: input.sessionHash,
        externalId: `assistant:${crypto.randomUUID()}`,
        role: "assistant",
        content: text,
        model: turn.resolvedModel,
        knowledgeMode: input.mode,
        sourceIds: retrieval.documents.map(({ id }) => id),
        pagePath: input.pagePath,
        metadata: { ...metadata, engine: "experimental", validationIssues: turn.validationIssues, modelCalls: turn.modelCalls },
      });
      if (!persistedAssistant.persisted && inProduction) throw new Error("persistence_unavailable");

      const textId = `ana-${crypto.randomUUID()}`;
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });

      const finishMetadata: AnaMessageMetadata = {
        ...metadata,
        completedAt: Date.now(),
        mode: input.mode,
        model: input.model,
        resolvedModel: turn.resolvedModel,
        generationId: turn.generationId,
        finishReason: turn.finishReason,
        usage: turn.usage,
        estimatedCostUsd: estimateAnaCost(input.model, turn.usage),
        qualityRetryCount: turn.qualityRetryCount,
        qualityFallback: turn.qualityFallback,
        validationIssues: turn.validationIssues,
      } as AnaMessageMetadata;
      writer.write({ type: "finish", finishReason: "stop", messageMetadata: finishMetadata });
    },
  });

  return createUIMessageStreamResponse({ stream, headers: input.headers });
}
