import { syncKitSubscriberEvent } from "../src/lib/kit-events.js";

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
  const answers = {
    resposta_1: clean(body.resposta_1),
    resposta_2: clean(body.resposta_2),
    resposta_3: clean(body.resposta_3),
    resposta_4: clean(body.resposta_4),
  };

  if (!name || !isEmail(email)) {
    return jsonResponse({ error: "Nome e email válido são obrigatórios." }, 400);
  }

  if (Object.values(answers).some((answer) => !answer)) {
    return jsonResponse({ error: "As quatro respostas são obrigatórias." }, 400);
  }

  try {
    const result = await syncKitSubscriberEvent({
      source: "ana",
      eventName: "ana_lead_captured",
      name,
      email,
      tags: ["ana-amplify", "qualificacao-ia"],
      ...answers,
    });

    if (result?.skipped) {
      return jsonResponse({ ok: false, error: "kit_not_configured", captured: false });
    }

    if (!result?.ok) {
      console.warn("Kit subscribe (ana) falhou:", JSON.stringify(result));
      return jsonResponse({ ok: false, error: "kit_error", captured: false });
    }

    return jsonResponse({ ok: true, captured: true });
  } catch (error) {
    console.warn("Erro ao chamar Kit (ana):", error);
    return jsonResponse({ ok: false, error: "kit_unreachable", captured: false });
  }
}
