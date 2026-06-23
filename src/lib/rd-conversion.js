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
    (token, index, tokens) => token && tokens.indexOf(token) === index
  );
}

export async function sendRdConversionEvent({ email, name, phone, company, conversionIdentifier, tags = [], fields = {} }) {
  const keys = getConversionApiKeys();
  const normalizedEmail = clean(email).toLowerCase();

  if (!keys.length || !normalizedEmail || !conversionIdentifier) {
    return { ok: false, skipped: true };
  }

  const payload = {
    event_type: "CONVERSION",
    event_family: "CDP",
    payload: {
      conversion_identifier: conversionIdentifier,
      email: normalizedEmail,
      name: clean(name),
      mobile_phone: clean(phone),
      company_name: clean(company),
      tags: [...new Set(tags.filter(Boolean))],
      ...fields,
    },
  };

  for (const apiKey of keys) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

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
        }
      );

      const responseText = await response.text();
      let responseBody = {};

      try {
        responseBody = responseText ? JSON.parse(responseText) : {};
      } catch (_error) {
        responseBody = { raw: responseText };
      }

      if (response.ok) {
        return { ok: true, status: response.status, body: responseBody };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false };
}
