import { persistLeadEvent } from "../src/lib/lead-scoring/store.js";
import { scoreLead } from "../src/lib/lead-scoring/engine.js";

export const config = { runtime: "edge" };

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clean(value) {
  return String(value || "").trim();
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

  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();

  if (!name || !isEmail(email)) {
    return jsonResponse({ error: "Nome e email válido são obrigatórios." }, 400);
  }

  try {
    const scoring = scoreLead({ ...body, email, source: "nexialista" }, { source: "nexialista" });
    const enrichedBody = { ...body, email, source: "nexialista", leadScoring: scoring };
    let databasePersist = { ok: false, skipped: true };

    try {
      databasePersist = await persistLeadEvent(enrichedBody, { source: "nexialista" });
    } catch (databaseError) {
      databasePersist = { ok: false, error: databaseError.message };
    }

    return jsonResponse({
      ok: true,
      mode: "kit",
      payload: "kit_v4",
      leadScoring: scoring,
      database: databasePersist,
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "Erro ao registrar o lead." }, 500);
  }
}
