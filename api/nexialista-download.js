import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { persistLeadEvent } from "../src/lib/lead-scoring/store.js";
import { verifyAccessToken, verifyStripeSession } from "../src/lib/nexialista-access-utils.js";

const FILES = {
  pdf: {
    path: "profissional-nexialista.pdf",
    contentType: "application/pdf",
    filename: "profissional-nexialista.pdf",
  },
  epub: {
    path: "profissional-nexialista.epub",
    contentType: "application/epub+zip",
    filename: "profissional-nexialista.epub",
  },
};

function sendJson(response, payload, status = 200) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function getRequestUrl(request) {
  const host = request.headers["x-forwarded-host"] || request.headers.host || "localhost";
  const protocol = request.headers["x-forwarded-proto"] || "https";
  return new URL(request.url, `${protocol}://${host}`);
}

async function getAccessPayload(url) {
  const accessToken = url.searchParams.get("access_token");
  const tokenPayload = accessToken ? verifyAccessToken(accessToken) : null;

  if (tokenPayload) {
    return {
      ok: true,
      email: tokenPayload.email,
      tier: tokenPayload.tier,
      accessType: "free",
    };
  }

  const sessionId = url.searchParams.get("session_id");
  const stripeSession = sessionId ? await verifyStripeSession(sessionId) : null;

  if (stripeSession) {
    return {
      ok: true,
      email: stripeSession.customer_details?.email || stripeSession.customer_email || stripeSession.metadata?.email,
      name: stripeSession.metadata?.nome,
      tier: stripeSession.metadata?.tier,
      accessType: "paid",
      stripeSessionId: stripeSession.id,
    };
  }

  return { ok: false };
}

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendJson(response, { error: "Método não permitido." }, 405);
  }

  const url = getRequestUrl(request);
  const format = url.searchParams.get("format") || "pdf";
  const file = FILES[format];

  if (!file) {
    return sendJson(response, { error: "Formato inválido." }, 400);
  }

  const access = await getAccessPayload(url);

  if (!access.ok) {
    return sendJson(response, { error: "Acesso não autorizado." }, 403);
  }

  await persistLeadEvent(
    {
      source: "nexialista",
      eventName: "nexialista_ebook_downloaded",
      formStatus: "ebook_downloaded",
      email: access.email,
      name: access.name,
      tier: access.tier,
      format,
      accessType: access.accessType,
      accessUrl: `${url.origin}/nexialista/obrigado?${access.accessType === "paid" ? `session_id=${encodeURIComponent(access.stripeSessionId)}` : `access_token=${encodeURIComponent(url.searchParams.get("access_token") || "")}`}`,
      stripeSessionId: access.stripeSessionId,
      tags: ["ebook_baixado", access.accessType === "free" ? "acesso_gratuito_liberado" : "pagamento_concluido"],
    },
    { source: "nexialista" },
  ).catch(() => null);

  const filePath = join(process.cwd(), "private", "nexialista", file.path);
  const content = await readFile(filePath);

  response.statusCode = 200;
  response.setHeader("Content-Type", file.contentType);
  response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  response.setHeader("Cache-Control", "private, no-store");

  if (request.method === "HEAD") {
    return response.end();
  }

  return response.end(content);
}
