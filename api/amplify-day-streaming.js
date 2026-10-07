import { syncKitSubscriberEvent, tagKitSubscriber } from "../src/lib/kit-events.js";

const CORE_TAGS = [
  "amplify-day-2026-streaming",
  "amplify-day-2026-interesse",
  "amplify-day-2026-palco-amplify",
];

const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const slug = (value) => clean(value, 100)
  .toLocaleLowerCase("pt-BR")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 64);

function sendJson(response, payload, status = 200) {
  if (!response) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  if (typeof request.json === "function") return request.json();
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

export default async function handler(request, response) {
  if (String(request.method || "POST").toUpperCase() !== "POST") {
    return sendJson(response, { ok: false, error: "method_not_allowed" }, 405);
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    return sendJson(response, { ok: false, error: "invalid_body" }, 400);
  }

  if (clean(body.website)) return sendJson(response, { ok: true, captured: true });

  const name = clean(body.name, 160);
  const email = clean(body.email, 254).toLowerCase();
  const school = clean(body.school, 200);
  const role = clean(body.role, 200);

  if (name.length < 2 || !isValidEmail(email) || school.length < 2 || role.length < 2) {
    return sendJson(response, { ok: false, error: "invalid_fields" }, 422);
  }

  try {
    const subscriber = await syncKitSubscriberEvent({
      source: "amplify-day-streaming",
      eventName: "amplify_day_streaming_registration",
      name,
      email,
      company: school,
      role,
      registrationStatus: "registered",
      registrationOrigin: "streaming_page",
      targetStage: "amplify",
      amplifyDayStage: "Palco Amplify",
    });

    if (!subscriber?.ok) {
      console.warn("Kit streaming subscriber falhou:", JSON.stringify(subscriber));
      return sendJson(response, { ok: false, captured: false, error: "kit_error" }, 502);
    }

    const coreTags = await Promise.all(CORE_TAGS.map((tag) => tagKitSubscriber(email, tag)));
    if (coreTags.some((result) => !result?.ok)) {
      console.warn("Kit streaming tags falharam:", JSON.stringify(coreTags));
      return sendJson(response, { ok: false, captured: false, error: "kit_tag_error" }, 502);
    }

    const attribution = [
      ["utm-source", body.utm_source],
      ["utm-medium", body.utm_medium],
      ["utm-campaign", body.utm_campaign],
      ["utm-content", body.utm_content],
    ]
      .map(([key, value]) => [key, slug(value)])
      .filter(([, value]) => value)
      .map(([key, value]) => `amplify-day:${key}:${value}`);

    const attributionResults = await Promise.all(
      attribution.map((tag) => tagKitSubscriber(email, tag)),
    );

    return sendJson(response, {
      ok: true,
      captured: true,
      attributionSynced: attributionResults.every((result) => result?.ok),
    });
  } catch (error) {
    console.error("Cadastro do streaming no Kit:", error);
    return sendJson(response, { ok: false, captured: false, error: "kit_unreachable" }, 502);
  }
}
