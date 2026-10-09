import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { streamAnaAnswer } from "./agent.js";
import { anaChatRequestSchema, estimateAnaCost } from "./config.js";
import { retrieveAnaKnowledge } from "./retrieval.js";
import type { AnaMessage, AnaMessageMetadata } from "./types.js";
import { saveAnaMessage } from "./store.js";
import type { KnowledgeReader } from "../okf/http.js";

const PRIVATE_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
};

function textFromMessage(message: AnaMessage) {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function handleAnaChat(request: Request, reader: KnowledgeReader) {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: PRIVATE_HEADERS });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const parsed = anaChatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues.map(({ path, message }) => ({ path, message })) },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const { messages, mode, model, apiKey, pagePath } = parsed.data;
  const conversationId = parsed.data.conversationId ?? crypto.randomUUID();
  const uiMessages = messages as AnaMessage[];
  const latestUserMessage = [...uiMessages].reverse()
    .find((message) => message.role === "user" && textFromMessage(message));
  const latestQuestion = latestUserMessage ? textFromMessage(latestUserMessage) : undefined;

  if (!latestQuestion) {
    return Response.json({ error: "missing_user_message" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const startedAt = Date.now();
  let retrieval;
  try {
    retrieval = await retrieveAnaKnowledge(mode, latestQuestion, reader);
  } catch (error) {
    console.error("[Ana Lab] Falha durante recuperação", error);
    return Response.json(
      { error: "knowledge_unavailable", message: "Não foi possível consultar a documentação agora." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }

  await saveAnaMessage({
    conversationKey: conversationId,
    externalId: latestUserMessage?.id ?? `user:${crypto.randomUUID()}`,
    role: "user",
    content: latestQuestion,
    model,
    knowledgeMode: mode,
    pagePath,
    sourceIds: retrieval.documents.map((document) => document.id),
  });

  const modelMessages = await convertToModelMessages(uiMessages);
  const result = streamAnaAnswer(mode, model, modelMessages, retrieval, apiKey, async (finished) => {
    if (!finished.text.trim()) return;
    await saveAnaMessage({
      conversationKey: conversationId,
      externalId: `assistant:${latestUserMessage?.id ?? crypto.randomUUID()}`,
      role: "assistant",
      content: finished.text.trim(),
      model: finished.response.modelId || model,
      knowledgeMode: mode,
      pagePath,
      sourceIds: retrieval.documents.map((document) => document.id),
      metadata: {
        finishReason: finished.finishReason,
        inputTokens: finished.totalUsage.inputTokens,
        outputTokens: finished.totalUsage.outputTokens,
        totalTokens: finished.totalUsage.totalTokens,
      },
    });
  });
  let generationId: string | undefined;
  let resolvedModel: string | undefined;

  const stream = createUIMessageStream<AnaMessage>({
    originalMessages: uiMessages,
    execute({ writer }) {
      const initialMetadata: AnaMessageMetadata = { createdAt: startedAt, mode, model };
      writer.write({ type: "start", messageMetadata: initialMetadata });
      writer.write({ type: "data-retrieval", data: retrieval });
      writer.merge(result.toUIMessageStream<AnaMessage>({
        sendStart: false,
        sendReasoning: false,
        originalMessages: uiMessages,
        messageMetadata: ({ part }) => {
          if (part.type === "finish-step") {
            const gatewayMetadata = part.providerMetadata?.gateway as { generationId?: string } | undefined;
            generationId = gatewayMetadata?.generationId ?? generationId;
            resolvedModel = part.response.modelId || resolvedModel;
            return { generationId, resolvedModel };
          }
          if (part.type !== "finish") return undefined;
          const usage = part.totalUsage;
          return {
            completedAt: Date.now(),
            mode,
            model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
            estimatedCostUsd: estimateAnaCost(model, usage),
            generationId,
            resolvedModel,
          } satisfies AnaMessageMetadata;
        },
        onError: () => "O modelo selecionado está temporariamente indisponível.",
      }));
    },
    onError: () => {
      console.error("[Ana Lab] Falha no stream");
      return "O modelo selecionado está temporariamente indisponível.";
    },
  });

  return createUIMessageStreamResponse({ stream, headers: PRIVATE_HEADERS, keepAliveMs: 10_000 });
}
