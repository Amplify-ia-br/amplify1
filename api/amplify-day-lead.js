import { getSql, hasDatabaseUrl } from "../src/lib/lead-scoring/db.js";
import { persistLeadEvent } from "../src/lib/lead-scoring/store.js";

export const config = { runtime: "edge" };

const ALLOWED_EVENTS = new Set([
  "amplify_day_interest_captured",
  "amplify_day_qualification_updated",
  "amplify_day_profile_completed",
  "amplify_day_calendar_added",
  "amplify_day_content_opted_in",
  "amplify_day_whatsapp_clicked",
]);

const STATUS_RANK = {
  prelaunch_interest: 1,
  qualification_partial: 2,
  profile_complete: 3,
  em_analise: 4,
  convidado: 5,
  lista_espera: 5,
  nao_selecionado: 5,
  rsvp_confirmado: 6,
};

const EVENT_STATUS = {
  amplify_day_interest_captured: "prelaunch_interest",
  amplify_day_qualification_updated: "qualification_partial",
  amplify_day_profile_completed: "profile_complete",
  amplify_day_calendar_added: "profile_complete",
  amplify_day_content_opted_in: "profile_complete",
  amplify_day_whatsapp_clicked: "profile_complete",
};

function clean(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isLinkedIn(value) {
  if (!value) return true;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ["linkedin.com", "www.linkedin.com", "br.linkedin.com"].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getEnvironment() {
  const explicit = clean(process.env.AMPLIFY_DAY_ENV, 20).toLowerCase();
  if (explicit === "production") return "production";
  return process.env.VERCEL_ENV === "production" ? "production" : "test";
}

function getWhatsappUrl() {
  const value = clean(process.env.AMPLIFY_DAY_WHATSAPP_URL, 500);
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

async function getCurrentStatus(email) {
  if (!hasDatabaseUrl()) return "";
  const sql = getSql();
  const rows = await sql`
    SELECT last_payload->>'amplifyDayStatus' AS status
    FROM leads
    WHERE email = ${email}
    LIMIT 1
  `;
  return clean(rows[0]?.status, 40);
}

function keepMostAdvancedStatus(currentStatus, incomingStatus) {
  const currentRank = STATUS_RANK[currentStatus] || 0;
  const incomingRank = STATUS_RANK[incomingStatus] || 0;
  return currentRank > incomingRank ? currentStatus : incomingStatus;
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_body" }, 400);
  }

  // Honeypot: accept silently so bots do not learn how the filter works.
  if (clean(body.website, 120)) {
    return jsonResponse({ ok: true, captured: true, ignored: true });
  }

  const eventName = clean(body.eventName, 80);
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.organization || body.company, 180);
  const role = clean(body.role, 180);
  const linkedin = clean(body.linkedin, 400);
  const idempotencyKey = clean(body.idempotencyKey, 120);
  const hasMarketingConsent = typeof body.marketingConsent === "boolean";
  const marketingConsent = body.marketingConsent === true;

  if (!ALLOWED_EVENTS.has(eventName)) {
    return jsonResponse({ ok: false, error: "invalid_event" }, 422);
  }
  if (!name || !isEmail(email) || !idempotencyKey) {
    return jsonResponse({ ok: false, error: "invalid_identity" }, 422);
  }
  if (eventName === "amplify_day_profile_completed" && (!company || !role)) {
    return jsonResponse({ ok: false, error: "incomplete_profile" }, 422);
  }
  if (!isLinkedIn(linkedin)) {
    return jsonResponse({ ok: false, error: "invalid_linkedin" }, 422);
  }

  if (process.env.AMPLIFY_DAY_CAPTURE_MODE === "mock") {
    const whatsappUrl = eventName === "amplify_day_profile_completed" ? getWhatsappUrl() : "";
    return jsonResponse({ ok: true, captured: true, synced: false, environment: "test", actions: whatsappUrl ? { whatsappUrl } : {} });
  }

  const environment = getEnvironment();
  const currentStatus = await getCurrentStatus(email).catch(() => "");
  const amplifyDayStatus = keepMostAdvancedStatus(currentStatus, EVENT_STATUS[eventName]);
  const isComplete = amplifyDayStatus === "profile_complete" || (STATUS_RANK[amplifyDayStatus] || 0) > 3;
  const tags = [];

  if (eventName === "amplify_day_interest_captured") {
    tags.push(environment === "production" ? "amplify_day_interest_production" : "amplify_day_interest_test");
  }
  if (marketingConsent) tags.push("amplify_day_content_optin");

  const eventPayload = {
    source: "amplify_day",
    eventName,
    formStatus: isComplete ? "completed" : "in_progress",
    completedStep:
      eventName === "amplify_day_interest_captured" ? "identity" :
      eventName === "amplify_day_qualification_updated" ? "qualification_partial" :
      eventName === "amplify_day_profile_completed" ? "qualification" : eventName,
    idempotencyKey,
    name,
    email,
    company,
    role,
    linkedin,
    marketingConsent: hasMarketingConsent ? marketingConsent : undefined,
    amplifyDayStatus,
    environment,
    profileCompletedAt:
      eventName === "amplify_day_profile_completed"
        ? clean(body.profileCompletedAt, 40) || new Date().toISOString()
        : undefined,
    page: "/amplify-day",
    tags,
    removeTags: isComplete ? ["amplify-day:2026:perfil_incompleto"] : [],
  };

  try {
    const result = await persistLeadEvent(eventPayload, { source: "amplify_day" });
    const databaseCaptured = result?.ok === true;
    const kitSynced = result?.kit?.ok === true;
    const captured = databaseCaptured || kitSynced;

    if (!captured) {
      console.warn("Amplify Day lead não persistido:", JSON.stringify({ eventName, result }));
      return jsonResponse({ ok: false, captured: false, synced: false, error: "capture_unavailable" }, 503);
    }

    const whatsappUrl = eventName === "amplify_day_profile_completed" ? getWhatsappUrl() : "";
    return jsonResponse({
      ok: true,
      captured: true,
      synced: kitSynced,
      environment,
      status: amplifyDayStatus,
      actions: whatsappUrl ? { whatsappUrl } : {},
    }, kitSynced ? 200 : 202);
  } catch (error) {
    console.warn("Erro ao registrar lead do Amplify Day:", error);
    return jsonResponse({ ok: false, captured: false, synced: false, error: "capture_error" }, 503);
  }
}
