import { checkAnaRateLimit } from "../ana/store.js";
import { hasValidTestToken, PRIVATE_HEADERS, sha256 } from "./access.js";
import { anaZeroFeedbackSchema } from "./schema.js";
import { anaTestStore, type AnaTestStore } from "./testing-store.js";

const MAX_REQUEST_BYTES = 8_192;

export async function handleAnaZeroFeedback(request: Request, store: AnaTestStore = anaTestStore) {
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
  const parsed = anaZeroFeedbackSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues.map(({ path, message }) => ({ path, message })) },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const forwarded = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const limit = await checkAnaRateLimit(await sha256(`feedback:${forwarded || "anonymous"}`), 60, 300);
  if (!limit.allowed) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { ...PRIVATE_HEADERS, "retry-after": "300" } });
  }

  const feedback = parsed.data;
  const saved =
    feedback.kind === "turn"
      ? await store.saveTurnFeedback({
          sessionId: feedback.sessionId,
          turnIndex: feedback.turnIndex,
          verdict: feedback.verdict,
          reasons: feedback.reasons,
          comment: feedback.comment || undefined,
        })
      : await store.saveSessionFeedback({
          sessionId: feedback.sessionId,
          rating: feedback.rating,
          helped: feedback.helped,
          comment: feedback.comment || undefined,
        });

  return saved
    ? Response.json({ ok: true }, { headers: PRIVATE_HEADERS })
    : Response.json({ error: "not_saved" }, { status: 503, headers: PRIVATE_HEADERS });
}
