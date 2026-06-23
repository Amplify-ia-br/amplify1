function clean(value) {
  return String(value || "").trim();
}

function cleanSecret(value) {
  return clean(value)
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function getConversionApiKeys() {
  return [cleanSecret(process.env.RD_TOKEN_PRIVADO), cleanSecret(process.env.RD_TOKEN_PUBLICO)].filter(
    (token, index, tokens) => token && tokens.indexOf(token) === index,
  );
}

function uniqueTags(tags) {
  return [...new Set((tags || []).filter(Boolean))];
}

export function isRdEnabled() {
  return clean(process.env.RD_ENABLED).toLowerCase() === "1" || clean(process.env.RD_ENABLED).toLowerCase() === "true";
}

function buildPayload(event) {
  return {
    event_type: "CONVERSION",
    event_family: "CDP",
    payload: {
      conversion_identifier: clean(event.conversionIdentifier || event.eventName || "Evento Nexialista"),
      name: clean(event.name),
      email: clean(event.email).toLowerCase(),
      mobile_phone: clean(event.phone),
      company_name: clean(event.company),
      tags: uniqueTags(event.tags),
      cf_status_diagnostico_nexialista: clean(event.formStatus),
      cf_etapa_diagnostico_nexialista: clean(event.completedStep),
      cf_score_nexialista: clean(event.score),
      cf_nivel_nexialista: clean(event.level),
      cf_incentivo_nexialista: clean(event.incentive || event.label),
      cf_preco_final_nexialista: clean(event.price),
      cf_resumo_diagnostico_nexialista: clean(event.summary),
    },
  };
}

async function sendConversion(apiKey, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(
      `https://api.rd.services/platform/conversions?api_key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const responseText = await response.text();
    let body = {};

    try {
      body = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      body = { raw: responseText };
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendRdStationConversionEvent(event = {}) {
  if (!isRdEnabled()) {
    return { ok: false, skipped: true, reason: "RD desativado" };
  }

  const email = clean(event.email).toLowerCase();

  if (!email) {
    return { ok: false, skipped: true, reason: "email ausente" };
  }

  const apiKeys = getConversionApiKeys();

  if (!apiKeys.length) {
    return { ok: false, skipped: true, reason: "RD_TOKEN_PRIVADO ou RD_TOKEN_PUBLICO ausente" };
  }

  const payload = buildPayload(event);
  let lastResult = null;

  for (const apiKey of apiKeys) {
    const result = await sendConversion(apiKey, payload);
    lastResult = result;

    if (result.ok) {
      return { ok: true, mode: "conversion", status: result.status };
    }
  }

  return {
    ok: false,
    error: "RD Station não registrou a conversão.",
    result: lastResult,
  };
}
