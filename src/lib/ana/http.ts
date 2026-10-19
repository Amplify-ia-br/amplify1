import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { generateAnaAnswer } from "./agent.js";
import { anaChatRequestSchema, estimateAnaCost } from "./config.js";
import { analyzeAnaConversation, immediateAnaReply, type AnaConversationState } from "./conversation.js";
import { emptyAnaRetrieval, retrieveAnaKnowledge } from "./retrieval.js";
import type { AnaMessage, AnaMessageMetadata } from "./types.js";
import { resolveAnaSession } from "./session.js";
import {
  checkAnaRateLimit,
  loadAnaConversationMessages,
  loadAnaLeadQualification,
  saveAnaLeadSnapshot,
  saveAnaMessage,
} from "./store.js";
import type { KnowledgeReader } from "../okf/http.js";

const PRIVATE_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
};
const MAX_REQUEST_BYTES = 16_384;
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_SECONDS = 300;

function textFromMessage(message: AnaMessage) {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

async function readBoundedJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) return { error: "payload_too_large" as const };

  if (!request.body) return { error: "invalid_json" as const };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_REQUEST_BYTES) {
      await reader.cancel("payload_too_large");
      return { error: "payload_too_large" as const };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder().decode(bytes);

  try {
    return { value: JSON.parse(body) as unknown };
  } catch {
    return { error: "invalid_json" as const };
  }
}

function requestIdentity(request: Request, sessionHash: string) {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  return vercelForwarded || `session:${sessionHash}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ana:${value}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function withRateHeaders(
  headers: Record<string, string>,
  limit: Awaited<ReturnType<typeof checkAnaRateLimit>>,
) {
  if (!limit.configured || !("remaining" in limit)) return headers;
  return {
    ...headers,
    "x-ratelimit-limit": String(RATE_LIMIT_REQUESTS),
    "x-ratelimit-remaining": String(limit.remaining),
    "x-ratelimit-reset": limit.resetAt,
  };
}

export function buildAnaRetrievalQuery(latestMessage: string, conversation: AnaConversationState) {
  const { qualification } = conversation;
  const context = [
    latestMessage,
    ...(conversation.acceptedAssistantOffer ? [conversation.acceptedAssistantOffer] : []),
    ...(qualification.needs?.includes("students") ? ["educação para estudantes escola L.E.I.A."] : []),
    ...(qualification.needs?.some((need) => need === "processes" || need === "management")
      ? ["consultoria diagnóstico operação negócio processos implantação de IA"]
      : []),
    ...(qualification.needs?.includes("product") ? ["desenvolvimento e implantação de soluções e produtos de IA"] : []),
    ...(qualification.offerInterests?.includes("academy") ? ["Amplify Academy educação capacitação"] : []),
    ...(qualification.pricingIntent ? ["preço investimento política comercial"] : []),
  ];
  return [...new Set(context)].join(" ");
}

export async function handleAnaChat(request: Request, reader: KnowledgeReader) {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: PRIVATE_HEADERS });
  }

  const body = await readBoundedJson(request);
  if ("error" in body && body.error === "payload_too_large") {
    return Response.json({ error: body.error }, { status: 413, headers: PRIVATE_HEADERS });
  }
  if ("error" in body && body.error === "invalid_json") {
    return Response.json({ error: body.error }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const parsed = anaChatRequestSchema.safeParse("value" in body ? body.value : undefined);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues.map(({ path, message }) => ({ path, message })) },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const session = await resolveAnaSession(request);
  if (!session) {
    return Response.json({ error: "session_unavailable" }, { status: 503, headers: PRIVATE_HEADERS });
  }
  const responseHeaders = session.setCookie
    ? { ...PRIVATE_HEADERS, "set-cookie": session.setCookie }
    : PRIVATE_HEADERS;

  const { messages, mode, model, apiKey, pagePath } = parsed.data;
  const conversationId = parsed.data.conversationId ?? crypto.randomUUID();
  const incomingMessages = messages as AnaMessage[];
  const latestUserMessage = incomingMessages[0];
  const latestQuestion = textFromMessage(latestUserMessage);

  if (!latestQuestion) {
    return Response.json({ error: "missing_user_message" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const rateLimit = await checkAnaRateLimit(
    await sha256(requestIdentity(request, session.sessionHash)),
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!rateLimit.allowed) {
    const unavailable = "reason" in rateLimit && (rateLimit.reason === "check_failed" || rateLimit.reason === "not_configured");
    const status = unavailable ? 503 : 429;
    const headers = withRateHeaders({ ...responseHeaders, "retry-after": String(RATE_LIMIT_WINDOW_SECONDS) }, rateLimit);
    return Response.json({ error: status === 429 ? "rate_limited" : "rate_limit_unavailable" }, { status, headers });
  }

  const serverUserMessage: AnaMessage = {
    id: `user:${crypto.randomUUID()}`,
    role: "user",
    parts: [{ type: "text", text: latestQuestion }],
  };
  const persistedUserMessage = await saveAnaMessage({
    conversationKey: conversationId,
    sessionHash: session.sessionHash,
    externalId: serverUserMessage.id,
    role: "user",
    content: latestQuestion,
    model,
    knowledgeMode: mode,
    pagePath,
  });
  if (!persistedUserMessage.persisted) {
    if (persistedUserMessage.reason === "forbidden") {
      return Response.json({ error: "conversation_forbidden" }, { status: 403, headers: responseHeaders });
    }
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
      return Response.json({ error: "persistence_unavailable" }, { status: 503, headers: responseHeaders });
    }
  }

  const [storedMessages, previousQualification] = await Promise.all([
    loadAnaConversationMessages(conversationId, session.sessionHash),
    loadAnaLeadQualification(conversationId, session.sessionHash),
  ]);
  const uiMessages = storedMessages.some((message) => message.id === serverUserMessage.id)
    ? storedMessages
    : [...storedMessages, serverUserMessage];
  const conversation = analyzeAnaConversation(uiMessages, pagePath, previousQualification);
  const retrievalQuery = buildAnaRetrievalQuery(latestQuestion, conversation);
  const startedAt = Date.now();
  let retrieval;
  try {
    retrieval = conversation.shouldRetrieveKnowledge
      ? await retrieveAnaKnowledge(mode, retrievalQuery, reader)
      : emptyAnaRetrieval(mode, latestQuestion, `conversa-${conversation.turnKind}`);
  } catch (error) {
    console.error("[Ana Lab] Falha durante recuperação", error);
    return Response.json(
      { error: "knowledge_unavailable", message: "Não foi possível consultar a documentação agora." },
      { status: 503, headers: responseHeaders },
    );
  }

  const persistedLead = persistedUserMessage.persisted && conversation.shouldPersistLead
    ? await saveAnaLeadSnapshot(persistedUserMessage.conversationId, conversation)
    : undefined;

  const immediateReply = immediateAnaReply(conversation, uiMessages, Boolean(persistedLead?.persisted && conversation.leadStage === "handoff"));
  if (immediateReply) {
    const persistedAssistant = await saveAnaMessage({
      conversationKey: conversationId,
      sessionHash: session.sessionHash,
      externalId: `assistant:${crypto.randomUUID()}`,
      role: "assistant",
      content: immediateReply,
      model: "ana-conversation-policy",
      knowledgeMode: mode,
      pagePath,
      metadata: {
        turnKind: conversation.turnKind,
        conversationStage: conversation.stage,
        leadStage: conversation.leadStage,
        qualificationScore: conversation.qualificationScore,
        nextQuestionKey: conversation.nextQuestion?.key,
      },
    });
    if (!persistedAssistant.persisted && (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV)) {
      return Response.json({ error: "persistence_unavailable" }, { status: 503, headers: responseHeaders });
    }
    const completedAt = Date.now();
    const stream = createUIMessageStream<AnaMessage>({
      originalMessages: incomingMessages,
      async execute({ writer }) {
        const textId = `ana-${crypto.randomUUID()}`;
        writer.write({
          type: "start",
          messageMetadata: {
            createdAt: startedAt,
            mode,
            model,
            turnKind: conversation.turnKind,
            conversationStage: conversation.stage,
            leadStage: conversation.leadStage,
            qualificationScore: conversation.qualificationScore,
            nextQuestionKey: conversation.nextQuestion?.key,
          },
        });
        writer.write({ type: "data-retrieval", data: retrieval });
        writer.write({ type: "text-start", id: textId });
        writer.write({ type: "text-delta", id: textId, delta: immediateReply });
        writer.write({ type: "text-end", id: textId });
        writer.write({
          type: "finish",
          finishReason: "stop",
          messageMetadata: {
            completedAt,
            mode,
            model,
            resolvedModel: "ana-conversation-policy",
            turnKind: conversation.turnKind,
            conversationStage: conversation.stage,
            leadStage: conversation.leadStage,
            qualificationScore: conversation.qualificationScore,
            nextQuestionKey: conversation.nextQuestion?.key,
          },
        });
      },
    });
    return createUIMessageStreamResponse({ stream, headers: withRateHeaders(responseHeaders, rateLimit) });
  }

  const modelMessages = await convertToModelMessages(uiMessages);

  const stream = createUIMessageStream<AnaMessage>({
    originalMessages: incomingMessages,
    async execute({ writer }) {
      const initialMetadata: AnaMessageMetadata = {
        createdAt: startedAt,
        mode,
        model,
        turnKind: conversation.turnKind,
        conversationStage: conversation.stage,
        leadStage: conversation.leadStage,
        qualificationScore: conversation.qualificationScore,
        nextQuestionKey: conversation.nextQuestion?.key,
      };
      writer.write({ type: "start", messageMetadata: initialMetadata });
      writer.write({ type: "data-retrieval", data: retrieval });
      const answer = await generateAnaAnswer(mode, model, modelMessages, retrieval, conversation, apiKey);
      const persistedAssistant = await saveAnaMessage({
        conversationKey: conversationId,
        sessionHash: session.sessionHash,
        externalId: `assistant:${crypto.randomUUID()}`,
        role: "assistant",
        content: answer.text,
        model: answer.resolvedModel,
        knowledgeMode: mode,
        pagePath,
        sourceIds: retrieval.documents.map((document) => document.id),
        metadata: {
          finishReason: answer.finishReason,
          inputTokens: answer.usage.inputTokens,
          outputTokens: answer.usage.outputTokens,
          totalTokens: answer.usage.totalTokens,
          qualityRetryCount: answer.qualityRetryCount,
          qualityFallback: answer.qualityFallback,
          validationIssues: answer.validationIssues,
          turnKind: conversation.turnKind,
          conversationStage: conversation.stage,
          leadStage: conversation.leadStage,
          qualificationScore: conversation.qualificationScore,
          nextQuestionKey: conversation.nextQuestion?.key,
        },
      });
      if (!persistedAssistant.persisted && (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV)) {
        throw new Error("assistant_persistence_unavailable");
      }
      const textId = `ana-${crypto.randomUUID()}`;
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: answer.text });
      writer.write({ type: "text-end", id: textId });
      writer.write({
        type: "finish",
        finishReason: answer.finishReason === "fallback" ? "stop" : answer.finishReason,
        messageMetadata: {
          completedAt: Date.now(),
          mode,
          model,
          inputTokens: answer.usage.inputTokens,
          outputTokens: answer.usage.outputTokens,
          totalTokens: answer.usage.totalTokens,
          estimatedCostUsd: estimateAnaCost(model, answer.usage),
          generationId: answer.generationId,
          resolvedModel: answer.resolvedModel,
          qualityRetryCount: answer.qualityRetryCount,
          qualityFallback: answer.qualityFallback,
          validationIssues: answer.validationIssues,
          turnKind: conversation.turnKind,
          conversationStage: conversation.stage,
          leadStage: conversation.leadStage,
          qualificationScore: conversation.qualificationScore,
          nextQuestionKey: conversation.nextQuestion?.key,
        },
      });
    },
    onError: () => {
      console.error("[Ana Lab] Falha no stream");
      return "O modelo selecionado está temporariamente indisponível.";
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: withRateHeaders(responseHeaders, rateLimit),
    keepAliveMs: 10_000,
  });
}
