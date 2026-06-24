import { getBootcampEventBySlug, getBootcampPublicConfig } from "./bootcamp-events.js";

const SYMPLA_EVENT_API_BASE_URL = "https://api.sympla.com.br/public/v4";
const SYMPLA_COLLECTION_API_BASE_URL = "https://api.sympla.com.br/public/v3";
const REQUEST_TIMEOUT_MS = 7000;

function clean(value) {
  return String(value || "").trim();
}

function cleanToken(value) {
  return clean(value)
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function toBooleanFlag(value) {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

function parseSymplaDate(value) {
  const dateText = clean(value);
  if (!dateText) return null;
  const normalized = dateText.includes("T") ? dateText : dateText.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getToken() {
  return cleanToken(process.env.SYMPLA_TOKEN);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text };
  }
}

export async function symplaRequest(path, { query = {}, baseUrl = SYMPLA_COLLECTION_API_BASE_URL } = {}) {
  const token = getToken();

  if (!token) {
    return { ok: false, skipped: true, reason: "SYMPLA_TOKEN ausente" };
  }

  const url = new URL(`${baseUrl}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && clean(value) !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        s_token: token,
      },
    });
    const body = await readJson(response);
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

function getItems(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.body?.data)) return payload.body.data;
  return [];
}

function getItem(payload) {
  return payload?.data || payload?.body?.data || null;
}

export async function getBootcampSymplaStatus(slug) {
  const event = getBootcampEventBySlug(slug);
  const publicConfig = getBootcampPublicConfig(event);

  if (!event) {
    return { ok: false, status: "not_found", error: "Turma não encontrada." };
  }

  const eventId = clean(event.symplaEventId);
  if (!eventId) {
    return {
      ok: true,
      status: "configured_without_sympla",
      source: "config",
      event: publicConfig,
      availability: {
        isAvailable: Boolean(clean(event.symplaCheckoutUrl)),
        label: "Inscrições via Sympla",
        reason: "Evento ainda sem symplaEventId configurado.",
      },
      sympla: { ok: false, skipped: true, reason: "symplaEventId ausente" },
    };
  }

  const eventResult = await symplaRequest(`/events/${encodeURIComponent(eventId)}`, {
    baseUrl: SYMPLA_EVENT_API_BASE_URL,
  });

  if (!eventResult.ok) {
    return {
      ok: true,
      status: "sympla_unavailable",
      source: "config",
      event: publicConfig,
      availability: {
        isAvailable: Boolean(clean(event.symplaCheckoutUrl)),
        label: "Ver disponibilidade na Sympla",
        reason: eventResult.reason || "A API da Sympla não respondeu com sucesso.",
      },
      sympla: eventResult,
    };
  }

  const symplaEvent = getItem(eventResult.body);
  const published = toBooleanFlag(symplaEvent?.published);
  const cancelled = toBooleanFlag(symplaEvent?.cancelled);
  const eventStart = parseSymplaDate(symplaEvent?.start_date);
  const futureEvent = eventStart ? eventStart.getTime() >= Date.now() : true;
  const isAvailable = published && !cancelled && futureEvent;

  return {
    ok: true,
    status: "sympla",
    source: "sympla",
    event: {
      ...publicConfig,
      symplaName: symplaEvent?.name,
      symplaUrl: symplaEvent?.url,
      symplaImage: symplaEvent?.image,
      symplaStartDate: symplaEvent?.start_date,
      symplaEndDate: symplaEvent?.end_date,
      symplaAddress: symplaEvent?.address,
    },
    availability: {
      isAvailable,
      label: isAvailable ? "Inscrições abertas" : "Ver disponibilidade na Sympla",
      reason: isAvailable
        ? "Evento publicado e futuro na Sympla."
        : "Evento indisponível, cancelado ou encerrado.",
    },
    sympla: {
      event: { ok: eventResult.ok, status: eventResult.status },
    },
  };
}

async function fetchAllPages(path, query = {}) {
  const items = [];
  let page = 1;
  let hasNext = true;
  let lastResult = null;

  while (hasNext && page <= 50) {
    const result = await symplaRequest(path, { query: { page_size: 200, ...query, page } });
    lastResult = result;

    if (!result.ok) return { ok: false, result, items };

    items.push(...getItems(result.body));
    const pagination = result.body?.pagination || {};
    hasNext = Boolean(pagination.has_next);
    page += 1;
  }

  return { ok: true, result: lastResult, items };
}

export async function fetchBootcampOrdersAndParticipants(slug) {
  const event = getBootcampEventBySlug(slug);
  if (!event) return { ok: false, error: "Turma não encontrada." };

  const eventId = clean(event.symplaEventId);
  if (!eventId) return { ok: false, error: "symplaEventId ausente." };

  const [orders, participants] = await Promise.all([
    fetchAllPages(`/events/${encodeURIComponent(eventId)}/orders`, { status: false }),
    fetchAllPages(`/events/${encodeURIComponent(eventId)}/participants`, { cancelled: "none" }),
  ]);

  return {
    ok: orders.ok && participants.ok,
    event,
    orders: orders.items,
    participants: participants.items,
    errors: {
      orders: orders.ok ? null : orders.result,
      participants: participants.ok ? null : participants.result,
    },
  };
}
