import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { resolveAnaSession } from "../ana/session.js";
import { checkAnaRateLimit } from "../ana/store.js";
import type { KnowledgeReader } from "../okf/http.js";
import { runAnaZeroTurn } from "./agent.js";
import { anaZeroRequestSchema, type AnaZeroMessage } from "./schema.js";

const PRIVATE_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
};
const MAX_REQUEST_BYTES = 65_536;
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_SECONDS = 300;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ana-zero:${value}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function handleAnaZeroChat(
  request: Request,
  reader: KnowledgeReader,
  run: typeof runAnaZeroTurn = runAnaZeroTurn,
) {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: PRIVATE_HEADERS });
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "payload_too_large" }, { status: 413, headers: PRIVATE_HEADERS });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const parsed = anaZeroRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues.map(({ path, message }) => ({ path, message })) },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const session = await resolveAnaSession(request);
  const headers: Record<string, string> = session?.setCookie
    ? { ...PRIVATE_HEADERS, "set-cookie": session.setCookie }
    : PRIVATE_HEADERS;
  const forwarded = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const identity = forwarded || (session ? `session:${session.sessionHash}` : "anonymous");
  const limit = await checkAnaRateLimit(await sha256(identity), RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS);
  if (!limit.allowed) {
    const unavailable = "reason" in limit && (limit.reason === "check_failed" || limit.reason === "not_configured");
    return Response.json(
      { error: unavailable ? "rate_limit_unavailable" : "rate_limited" },
      { status: unavailable ? 503 : 429, headers: { ...headers, "retry-after": String(RATE_LIMIT_WINDOW_SECONDS) } },
    );
  }

  const { messages, memory, model } = parsed.data;
  const history = messages.map((message) => ({ role: message.role, text: message.parts[0].text }));
  const startedAt = Date.now();

  const stream = createUIMessageStream<AnaZeroMessage>({
    async execute({ writer }) {
      writer.write({ type: "start", messageMetadata: { createdAt: startedAt, engine: "ana-zero", model } });
      const turn = await run({ model, history, memory, reader, pagePath: "/lab/ana-zero" });
      const textId = `ana-zero-${crypto.randomUUID()}`;
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: turn.text });
      writer.write({ type: "text-end", id: textId });
      writer.write({
        type: "finish",
        finishReason: "stop",
        messageMetadata: {
          completedAt: Date.now(),
          engine: "ana-zero",
          model,
          resolvedModel: turn.resolvedModel,
          memory: turn.memory,
          handoff: turn.handoff,
          toolCalls: turn.toolCalls,
          sources: turn.sources,
          regenerated: turn.regenerated,
          issues: turn.issues,
          errors: turn.errors,
          inputTokens: turn.usage.inputTokens,
          outputTokens: turn.usage.outputTokens,
          totalTokens: turn.usage.totalTokens,
          estimatedCostUsd: turn.estimatedCostUsd,
        },
      });
    },
    onError: () => {
      console.error("[Ana Zero] Falha no stream");
      return "O modelo selecionado está temporariamente indisponível.";
    },
  });

  return createUIMessageStreamResponse({ stream, headers, keepAliveMs: 10_000 });
}
