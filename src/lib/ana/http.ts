import { createAgentUIStreamResponse } from "ai";
import { createAnaAgent } from "./agent.js";
import { anaChatRequestSchema, estimateAnaCost } from "./config.js";
import type { AnaMessage } from "./types.js";
import type { KnowledgeReader } from "../okf/http.js";

const PRIVATE_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
};

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

  const { messages, mode, model } = parsed.data;
  let session: Awaited<ReturnType<typeof createAnaAgent>>;

  try {
    session = await createAnaAgent(mode, model, reader);
  } catch (error) {
    console.error("[Ana Lab] Falha ao iniciar o agente", error);
    return Response.json(
      { error: "agent_unavailable", message: "Não foi possível iniciar o agente agora." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }

  const startedAt = Date.now();
  let generationId: string | undefined;

  try {
    return await createAgentUIStreamResponse({
      agent: session.agent,
      uiMessages: messages as AnaMessage[],
      abortSignal: request.signal,
      timeout: { totalMs: 55_000 },
      headers: PRIVATE_HEADERS,
      messageMetadata: ({ part }) => {
        if (part.type === "start") return { createdAt: startedAt, mode, model };
        if (part.type === "finish-step") {
          const gatewayMetadata = part.providerMetadata?.gateway as { generationId?: string } | undefined;
          generationId = gatewayMetadata?.generationId ?? generationId;
          return generationId ? { generationId } : undefined;
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
        };
      },
      onEnd: async () => {
        await session.close().catch((error) => console.warn("[Ana Lab] Falha ao encerrar MCP", error));
      },
      onError: (error) => {
        console.error("[Ana Lab] Erro durante resposta", error);
        return "A Ana encontrou um erro ao consultar a base. Tente novamente.";
      },
    });
  } catch (error) {
    await session.close().catch(() => undefined);
    console.error("[Ana Lab] Falha ao criar stream", error);
    return Response.json(
      { error: "generation_failed", message: "Não foi possível gerar a resposta agora." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
