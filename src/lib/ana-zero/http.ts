import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { resolveAnaSession } from "../ana/session.js";
import { checkAnaRateLimit } from "../ana/store.js";
import type { KnowledgeReader } from "../okf/http.js";
import { hasValidTestToken, PRIVATE_HEADERS, sha256 } from "./access.js";
import { runAnaZeroTurn } from "./agent.js";
import { readServerEnv } from "./env.js";
import { PROMPT_VERSION } from "./prompt.js";
import { anaZeroRequestSchema, type AnaZeroMessage } from "./schema.js";
import { anaTestStore, type AnaTestStore } from "./testing-store.js";

const MAX_REQUEST_BYTES = 65_536;
const RATE_LIMITS = [
  { scope: "burst", requests: 30, windowSeconds: 300 },
  { scope: "day", requests: 200, windowSeconds: 86_400 },
] as const;

export async function handleAnaZeroChat(
  request: Request,
  reader: KnowledgeReader,
  run: typeof runAnaZeroTurn = runAnaZeroTurn,
  store: AnaTestStore = anaTestStore,
) {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: PRIVATE_HEADERS });
  }
  if (!(await hasValidTestToken(request))) {
    return Response.json({ error: "invalid_token" }, { status: 401, headers: PRIVATE_HEADERS });
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
  for (const { scope, requests, windowSeconds } of RATE_LIMITS) {
    const limit = await checkAnaRateLimit(await sha256(`${scope}:${identity}`), requests, windowSeconds);
    if (limit.allowed) continue;
    const unavailable = "reason" in limit && (limit.reason === "check_failed" || limit.reason === "not_configured");
    return Response.json(
      { error: unavailable ? "rate_limit_unavailable" : "rate_limited" },
      { status: unavailable ? 503 : 429, headers: { ...headers, "retry-after": String(windowSeconds) } },
    );
  }

  const { messages, memory, model, sessionId, tester, mission } = parsed.data;
  const history = messages.map((message) => ({ role: message.role, text: message.parts[0].text }));
  const turnIndex = history.filter((message) => message.role === "user").length;
  const startedAt = Date.now();

  const stream = createUIMessageStream<AnaZeroMessage>({
    async execute({ writer }) {
      writer.write({ type: "start", messageMetadata: { createdAt: startedAt, engine: "ana-zero", model, turnIndex } });
      const turn = await run({ model, history, memory, reader, pagePath: "/lab/ana-zero" });
      const saved = sessionId
        ? await store.saveTurn({
            sessionId,
            testerName: tester,
            mission,
            model,
            turnIndex,
            userText: history[history.length - 1].text,
            assistantText: turn.text,
            resolvedModel: turn.resolvedModel,
            toolCalls: turn.toolCalls,
            memory: turn.memory,
            issues: turn.issues,
            regenerated: turn.regenerated,
            errors: turn.errors,
            totalTokens: turn.usage.totalTokens,
            estimatedCostUsd: turn.estimatedCostUsd,
            latencyMs: Date.now() - startedAt,
            sources: turn.sources,
            handoff: turn.handoff,
            promptVersion: PROMPT_VERSION,
            appCommit: readServerEnv("VERCEL_GIT_COMMIT_SHA")?.slice(0, 12),
          })
        : false;
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
          turnIndex,
          saved,
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
