import { readJsonBody, sendJson } from "../src/lib/amplify-day/http.js";
import { normalizeBrazilianWhatsapp, sendZapiMediaSequence } from "../src/lib/amplify-day/whatsapp-reminder.js";

function clean(value) {
  return String(value || "").trim();
}

function bearerToken(request) {
  const value = typeof request?.headers?.get === "function"
    ? request.headers.get("authorization")
    : request?.headers?.authorization;
  return clean(value).replace(/^Bearer\s+/i, "");
}

export default async function handler(request, response) {
  if (String(request.method || "POST").toUpperCase() !== "POST") {
    return sendJson(response, { error: "Método não permitido." }, 405);
  }

  const expectedSecret = clean(process.env.WHATSAPP_DISPATCH_SECRET);
  if (!expectedSecret || bearerToken(request) !== expectedSecret) {
    return sendJson(response, { error: "Não autorizado." }, 401);
  }

  try {
    const body = await readJsonBody(request);
    if (body.action === "queue-status") {
      const instanceId = clean(process.env.ZAPI_INSTANCE_ID);
      const instanceToken = clean(process.env.ZAPI_INSTANCE_TOKEN);
      const clientToken = clean(process.env.ZAPI_CLIENT_TOKEN);
      if (!instanceId || !instanceToken || !clientToken) {
        return sendJson(response, { error: "Credenciais da Z-API indisponíveis." }, 500);
      }
      let pagingState = "";
      let hasMore = false;
      let queued = 0;
      let trialMessages = 0;
      let oldestCreatedAt = null;
      let newestCreatedAt = null;
      do {
        const queueResponse = await fetch(
          `https://api.z-api.io/instances/${encodeURIComponent(instanceId)}/token/${encodeURIComponent(instanceToken)}/queue`,
          {
            method: "POST",
            headers: { "Client-Token": clientToken, "Content-Type": "application/json" },
            body: JSON.stringify({ pageSize: 30, ...(pagingState ? { pagingState } : {}) }),
          },
        );
        const queue = await queueResponse.json().catch(() => ({}));
        if (!queueResponse.ok) {
          return sendJson(response, { error: clean(queue.error || queue.message || "Falha ao consultar a fila.") }, queueResponse.status);
        }
        const messages = Array.isArray(queue.messages) ? queue.messages : [];
        queued += messages.length;
        trialMessages += messages.filter((item) => item.IsTrial).length;
        newestCreatedAt ||= messages[0]?.CreatedAt || null;
        oldestCreatedAt = messages.at(-1)?.CreatedAt || oldestCreatedAt;
        hasMore = Boolean(queue.hasMore);
        pagingState = clean(queue.pagingState);
      } while (hasMore && pagingState && queued < 1_000);
      return sendJson(response, {
        ok: true,
        queued,
        hasMore,
        oldestCreatedAt,
        newestCreatedAt,
        trialMessages,
      });
    }

    const phone = normalizeBrazilianWhatsapp(body.phone);
    const audience = clean(body.audience).toLowerCase();
    const message = clean(body.message);
    if (!phone || !["amplify", "teia"].includes(audience) || !message || message.length > 4096) {
      return sendJson(response, { error: "Payload inválido." }, 400);
    }

    const results = await sendZapiMediaSequence({
      phone,
      audience,
      message,
      baseUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://amplify.ia.br",
      mediaIntervalMs: 1_000,
    });
    return sendJson(response, { ok: true, messageIds: results.map((item) => item.messageId) });
  } catch (error) {
    console.error("Amplify Day WhatsApp:", error);
    return sendJson(response, { error: clean(error?.message) || "Falha no envio." }, 502);
  }
}
