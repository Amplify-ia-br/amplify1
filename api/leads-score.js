import { persistLeadEvent } from "../src/lib/lead-scoring/store.js";
import { scoreLead } from "../src/lib/lead-scoring/engine.js";

export const config = { runtime: "edge" };

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clean(value) {
  return String(value || "").trim();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  let body;

  try {
    body = await request.json();
  } catch (_error) {
    return jsonResponse({ error: "Payload JSON inválido." }, 400);
  }

  const payload = body.payload && typeof body.payload === "object" ? body.payload : body;
  const source = clean(body.source || payload.source || payload.origin || "generic_form");
  const email = clean(payload.email).toLowerCase();

  if (!isEmail(email)) {
    return jsonResponse({ error: "Email válido é obrigatório para pontuar o lead." }, 400);
  }

  const enrichedPayload = { ...payload, email, source };
  const score = scoreLead(enrichedPayload, { source });

  try {
    const database = await persistLeadEvent({ ...enrichedPayload, leadScoring: score }, { source });
    return jsonResponse({ ok: true, leadScoring: score, database });
  } catch (error) {
    return jsonResponse({ error: error.message || "Erro ao registrar lead score.", leadScoring: score }, 500);
  }
}
