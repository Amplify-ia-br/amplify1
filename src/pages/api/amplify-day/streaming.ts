import type { APIRoute } from "astro";
import { syncKitSubscriberEvent, tagKitSubscriber } from "../../../lib/kit-events.js";

export const prerender = false;

const CORE_TAGS = [
  "amplify-day-2026-streaming",
  "amplify-day-2026-interesse",
  "amplify-day-2026-palco-amplify",
];

const clean = (value: unknown, max = 200) => String(value ?? "").trim().slice(0, max);
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const slug = (value: unknown) => clean(value, 100)
  .toLocaleLowerCase("pt-BR")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 64);

const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

function syncKitEnv() {
  if (!process.env.KIT_API_KEY && import.meta.env?.KIT_API_KEY) {
    process.env.KIT_API_KEY = import.meta.env.KIT_API_KEY as string;
  }
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  if (clean(body.website)) return json({ ok: true, captured: true });

  const name = clean(body.name, 160);
  const email = clean(body.email, 254).toLowerCase();
  const school = clean(body.school, 200);
  const role = clean(body.role, 200);

  if (name.length < 2 || !isValidEmail(email) || school.length < 2 || role.length < 2) {
    return json({ ok: false, error: "invalid_fields" }, 422);
  }

  syncKitEnv();

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
      return json({ ok: false, captured: false, error: "kit_error" }, 502);
    }

    const coreTags = await Promise.all(CORE_TAGS.map((tag) => tagKitSubscriber(email, tag)));
    if (coreTags.some((result) => !result?.ok)) {
      console.warn("Kit streaming tags falharam:", JSON.stringify(coreTags));
      return json({ ok: false, captured: false, error: "kit_tag_error" }, 502);
    }

    const attribution = [
      ["utm-source", body.utm_source],
      ["utm-medium", body.utm_medium],
      ["utm-campaign", body.utm_campaign],
      ["utm-content", body.utm_content],
    ]
      .map(([key, value]) => [key, slug(value)] as const)
      .filter(([, value]) => value)
      .map(([key, value]) => `amplify-day:${key}:${value}`);

    const attributionResults = await Promise.all(
      attribution.map((tag) => tagKitSubscriber(email, tag)),
    );

    return json({
      ok: true,
      captured: true,
      attributionSynced: attributionResults.every((result) => result?.ok),
    });
  } catch (error) {
    console.error("Cadastro do streaming no Kit:", error);
    return json({ ok: false, captured: false, error: "kit_unreachable" }, 502);
  }
};
