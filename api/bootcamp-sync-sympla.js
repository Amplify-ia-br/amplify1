import { fetchBootcampOrdersAndParticipants } from "../src/lib/sympla.js";
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

function cleanSecret(value) {
  return clean(value)
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function isAuthorized(request, body = {}) {
  const configuredSecret = cleanSecret(process.env.BOOTCAMP_SYNC_SECRET);
  if (!configuredSecret) return true;

  const headerSecret = cleanSecret(request.headers.get("x-bootcamp-sync-secret"));
  const bodySecret = cleanSecret(body.secret);
  return headerSecret === configuredSecret || bodySecret === configuredSecret;
}

function getParticipantEmail(participant) {
  return clean(participant.email || participant.participant_email || participant.buyer_email).toLowerCase();
}

function getParticipantName(participant) {
  return clean(
    participant.name ||
      [participant.first_name || participant.participant_first_name, participant.last_name || participant.participant_last_name]
        .map(clean)
        .filter(Boolean)
        .join(" "),
  );
}

function getParticipantId(participant) {
  return clean(participant.id || participant.participant_id || participant.ticket_id);
}

function getTicketNumber(participant) {
  return clean(participant.ticket_number || participant.ticketNumber || participant.ticket_num_qr_code);
}

function getCheckinStatus(participant) {
  const checkin = participant.checkin || participant.check_in || {};
  const checked = checkin.check_in === true || participant.check_in === true;
  if (checked) return "checked_in";
  return "not_checked_in";
}

function indexOrdersById(orders = []) {
  const map = new Map();
  orders.forEach((order) => {
    const id = clean(order.id || order.order_id);
    if (id) map.set(id, order);
  });
  return map;
}

async function persistBootcampPayload(payload) {
  const scoring = scoreLead(payload, { source: "bootcamp" });
  const database = await persistLeadEvent({ ...payload, leadScoring: scoring }, { source: "bootcamp" });
  return { scoring, database };
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

  if (!isAuthorized(request, body)) {
    return jsonResponse({ error: "Não autorizado." }, 401);
  }

  const slug = clean(body.slug).toLowerCase();
  if (!slug) return jsonResponse({ error: "Slug é obrigatório." }, 400);

  const sync = await fetchBootcampOrdersAndParticipants(slug);
  if (!sync.ok) {
    return jsonResponse({ ok: false, error: sync.error || "Erro ao sincronizar Sympla.", details: sync.errors }, 502);
  }

  const ordersById = indexOrdersById(sync.orders);
  const results = [];

  for (const order of sync.orders) {
    const email = clean(order.buyer_email).toLowerCase();
    if (!isEmail(email)) continue;

    const orderId = clean(order.id || order.order_id);
    const payload = {
      source: "bootcamp",
      eventName: "bootcamp_order_approved",
      email,
      name: clean([order.buyer_first_name, order.buyer_last_name].filter(Boolean).join(" ")),
      bootcampSlug: sync.event.slug,
      bootcampEventId: sync.event.symplaEventId,
      bootcampCity: sync.event.city,
      bootcampDate: sync.event.date,
      bootcampOrderId: orderId,
      bootcampWhatsappUrl: sync.event.whatsappGroupUrl,
      orderId,
      transactionType: order.transaction_type,
      orderTotalSalePrice: order.order_total_sale_price,
      idempotencyKey: `bootcamp_order_approved:${sync.event.slug}:${orderId || email}`,
    };

    const persisted = await persistBootcampPayload(payload).catch((error) => ({
      error: error.message || "Erro ao persistir pedido.",
    }));
    results.push({ type: "order", email, orderId, ...persisted });
  }

  for (const participant of sync.participants) {
    const email = getParticipantEmail(participant);
    if (!isEmail(email)) continue;

    const orderId = clean(participant.order_id || participant.orderId);
    const order = ordersById.get(orderId) || {};
    const participantId = getParticipantId(participant);
    const ticketNumber = getTicketNumber(participant);
    const checkinStatus = getCheckinStatus(participant);
    const eventName = checkinStatus === "checked_in"
      ? "bootcamp_attended"
      : body.markAbsences === true
        ? "bootcamp_missed"
        : "bootcamp_participant_confirmed";
    const payload = {
      source: "bootcamp",
      eventName,
      email,
      name: getParticipantName(participant) || clean([order.buyer_first_name, order.buyer_last_name].filter(Boolean).join(" ")),
      bootcampSlug: sync.event.slug,
      bootcampEventId: sync.event.symplaEventId,
      bootcampCity: sync.event.city,
      bootcampDate: sync.event.date,
      bootcampOrderId: orderId,
      bootcampTicketNumber: ticketNumber,
      bootcampCheckinStatus: checkinStatus,
      bootcampWhatsappUrl: sync.event.whatsappGroupUrl,
      participantId,
      ticketNumber,
      ticketName: participant.ticket_name,
      sectorName: participant.sector_name,
      idempotencyKey: `${eventName}:${sync.event.slug}:${participantId || ticketNumber || email}`,
    };

    const persisted = await persistBootcampPayload(payload).catch((error) => ({
      error: error.message || "Erro ao persistir participante.",
    }));
    results.push({ type: "participant", email, participantId, ticketNumber, eventName, ...persisted });
  }

  return jsonResponse({
    ok: true,
    slug,
    orders: sync.orders.length,
    participants: sync.participants.length,
    persisted: results.length,
    results: results.map((result) => ({
      type: result.type,
      email: result.email,
      eventName: result.eventName,
      ok: result.database?.ok || false,
      skipped: result.database?.skipped || false,
      error: result.error,
    })),
  });
}
