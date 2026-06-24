import { getBootcampEventBySlug } from "../src/lib/bootcamp-events.js";
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

  const slug = clean(body.slug).toLowerCase();
  const event = getBootcampEventBySlug(slug);

  if (!event) {
    return jsonResponse({ error: "Turma não encontrada." }, 404);
  }

  const eventName = clean(body.eventName || body.event_name || "bootcamp_checkout_clicked");
  const email = clean(body.email).toLowerCase();
  const payload = {
    ...body,
    source: "bootcamp",
    eventName,
    bootcampSlug: event.slug,
    bootcampEventId: event.symplaEventId,
    bootcampCity: event.city,
    bootcampDate: event.date,
    bootcampWhatsappUrl: event.whatsappGroupUrl,
    tags: Array.isArray(body.tags) ? body.tags : [],
  };

  if (!isEmail(email)) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "email ausente; evento registrado apenas no cliente",
      eventName,
    });
  }

  const scoring = scoreLead({ ...payload, email }, { source: "bootcamp" });

  try {
    const database = await persistLeadEvent(
      {
        ...payload,
        email,
        leadScoring: scoring,
        idempotencyKey: clean(body.idempotencyKey) || `${eventName}:${event.slug}:${email}`,
      },
      { source: "bootcamp" },
    );

    return jsonResponse({ ok: true, eventName, leadScoring: scoring, database });
  } catch (error) {
    return jsonResponse({ error: error.message || "Erro ao registrar evento do Bootcamp.", leadScoring: scoring }, 500);
  }
}
