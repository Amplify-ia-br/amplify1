import { persistLeadEvent } from "../src/lib/lead-scoring/store.js";

export const config = { runtime: "edge" };

const PRICE_ENV_BY_TIER = {
  full: "STRIPE_PRICE_NEXIALISTA_127",
  partial: "STRIPE_PRICE_NEXIALISTA_67",
  advanced: "STRIPE_PRICE_NEXIALISTA_37",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clean(value) {
  return String(value || "").trim();
}

function getBaseUrl(request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${protocol}://${host}` : "http://localhost:4321";
}

function encodeFormBody(payload) {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });

  return params;
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

  const tier = clean(body.tier);
  const priceEnvName = PRICE_ENV_BY_TIER[tier];
  const priceId = priceEnvName ? process.env[priceEnvName] : "";
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!priceEnvName || tier === "free") {
    return jsonResponse({ error: "Este perfil não precisa de checkout." }, 400);
  }

  if (!stripeSecretKey || !priceId) {
    return jsonResponse(
      {
        error: "Stripe não configurado para esta faixa.",
        missing: !stripeSecretKey ? "STRIPE_SECRET_KEY" : priceEnvName,
      },
      500
    );
  }

  const baseUrl = getBaseUrl(request);
  const successUrl = `${baseUrl}/nexialista/obrigado?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/nexialista?checkout=cancel`;

  const checkoutBody = encodeFormBody({
    mode: "payment",
    allow_promotion_codes: "true",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": 1,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: clean(body.email).toLowerCase(),
    "metadata[produto]": "profissional_nexialista",
    "metadata[nome]": clean(body.name),
    "metadata[email]": clean(body.email).toLowerCase(),
    "metadata[tier]": tier,
    "metadata[score]": clean(body.score),
    "metadata[nivel]": clean(body.level),
    "metadata[preco_final]": clean(body.price),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: checkoutBody,
    });

    const payload = await response.json();

    if (!response.ok) {
      return jsonResponse({ error: "Stripe não criou o checkout.", details: payload }, response.status);
    }

    const eventPayload = {
      ...body,
      source: "nexialista",
      eventName: "nexialista_checkout_started",
      formStatus: "checkout_started",
      tags: ["checkout_iniciado", "ebook_nexialista"],
      stripeSessionId: payload.id,
    };

    const databaseResult = await persistLeadEvent(eventPayload, { source: "nexialista" }).catch(() => ({ ok: false }));

    return jsonResponse({
      ok: true,
      url: payload.url,
      tracking: {
        database: databaseResult,
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "Erro ao criar checkout." }, 500);
  } finally {
    clearTimeout(timeout);
  }
}
