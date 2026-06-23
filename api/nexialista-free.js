import { createAccessToken } from "../src/lib/nexialista-access-utils.js";
import { persistLeadEvent } from "../src/lib/lead-scoring/store.js";

function sendJson(response, payload, status = 200) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function clean(value) {
  return String(value || "").trim();
}

function getBaseUrl(request) {
  const origin = request.headers.origin;
  if (origin) return origin;

  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] || "https";
  return host ? `${protocol}://${host}` : "http://localhost:4321";
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, { error: "Método não permitido." }, 405);
  }

  let body;

  try {
    body = await readJsonBody(request);
  } catch (_error) {
    return sendJson(response, { error: "Payload JSON inválido." }, 400);
  }

  if (clean(body.tier) !== "free") {
    return sendJson(response, { error: "Este perfil precisa passar pelo checkout." }, 400);
  }

  const email = clean(body.email).toLowerCase();

  if (!email) {
    return sendJson(response, { error: "Email obrigatório." }, 400);
  }

  try {
    const token = createAccessToken({
      email,
      tier: "free",
      source: "diagnostico",
      ttlSeconds: 60 * 60 * 24 * 30,
    });
    const accessPath = `/nexialista/obrigado?access_token=${encodeURIComponent(token)}`;
    const accessUrl = new URL(accessPath, getBaseUrl(request)).toString();

    const eventPayload = {
      ...body,
      source: "nexialista",
      eventName: "nexialista_free_access_granted",
      formStatus: "free_access_granted",
      email,
      name: clean(body.name),
      accessUrl,
      tags: ["acesso_gratuito_liberado", "ebook_nexialista"],
    };

    await persistLeadEvent(eventPayload, { source: "nexialista" }).catch(() => null);

    return sendJson(response, {
      ok: true,
      url: accessPath,
    });
  } catch (error) {
    return sendJson(
      response,
      { error: error.message || "Acesso gratuito indisponível." },
      500,
    );
  }
}
