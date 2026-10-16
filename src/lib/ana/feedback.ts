import { z } from "zod";
import { getSql, hasDatabaseUrl } from "../lead-scoring/db.js";

const PRIVATE_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
};

export const anaFeedbackSchema = z.object({
  sessionId: z.string().trim().min(8).max(80),
  messageId: z.string().trim().min(1).max(120),
  rating: z.enum(["up", "down"]),
  comment: z.string().trim().max(2000).optional(),
  question: z.string().trim().max(4000).optional(),
  answer: z.string().trim().max(8000).optional(),
  model: z.string().trim().max(120).optional(),
  mode: z.string().trim().max(20).optional(),
  intent: z.string().trim().max(60).optional(),
  sources: z.array(z.object({ id: z.string().max(200), title: z.string().max(300) })).max(20).optional(),
  generationId: z.string().trim().max(200).optional(),
});

export type AnaFeedbackInput = z.infer<typeof anaFeedbackSchema>;

export async function saveAnaFeedback(input: AnaFeedbackInput, userAgent: string | null) {
  const sql = getSql();
  await sql`
    INSERT INTO ana_feedback (
      session_id, message_id, rating, comment, question, answer,
      model, mode, intent, sources, generation_id, user_agent
    ) VALUES (
      ${input.sessionId}, ${input.messageId}, ${input.rating}, ${input.comment || null},
      ${input.question ?? null}, ${input.answer ?? null}, ${input.model ?? null},
      ${input.mode ?? null}, ${input.intent ?? null}, ${JSON.stringify(input.sources ?? [])}::jsonb,
      ${input.generationId ?? null}, ${userAgent?.slice(0, 300) ?? null}
    )
    ON CONFLICT (session_id, message_id) DO UPDATE SET
      rating = EXCLUDED.rating,
      comment = COALESCE(EXCLUDED.comment, ana_feedback.comment),
      updated_at = now()
  `;
}

export async function handleAnaFeedback(request: Request) {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: PRIVATE_HEADERS });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const parsed = anaFeedbackSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  if (!hasDatabaseUrl()) {
    return Response.json({ error: "storage_not_configured" }, { status: 503, headers: PRIVATE_HEADERS });
  }

  try {
    await saveAnaFeedback(parsed.data, request.headers.get("user-agent"));
  } catch (error) {
    console.error("[Ana Lab] Falha ao salvar feedback", error);
    return Response.json({ error: "storage_error" }, { status: 500, headers: PRIVATE_HEADERS });
  }

  return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
}
