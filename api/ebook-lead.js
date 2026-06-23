import { syncKitSubscriberEvent } from "../src/lib/kit-events.js";

const EBOOK = {
  slug: "executivo-x0",
  title: "Executivo X.0 - Sem Barreiras",
  url: "/materiais/executivo-x0-amplify.pdf",
};

function json(response, data, status = 200) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(data));
}

function emailValido(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body);

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, { ok: false, error: "method_not_allowed" }, 405);
  }

  let payload;

  try {
    payload = await readJsonBody(request);
  } catch (_error) {
    return json(response, { ok: false, error: "invalid_body" }, 400);
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const site = String(payload.site || "").trim();

  if (!name || !emailValido(email)) {
    return json(response, { ok: false, error: "invalid_fields" }, 422);
  }

  try {
    const result = await syncKitSubscriberEvent({
      source: "ebook_executivo_x0",
      eventName: "ebook_executivo_x0_lead_captured",
      name,
      email,
      site,
      ebookSlug: EBOOK.slug,
      ebookTitle: EBOOK.title,
      ebookUrl: EBOOK.url,
      tags: ["ebook_executivo_x0", "ebook_download", "lead_ebook"],
    });

    if (result?.skipped) {
      return json(response, { ok: false, error: "kit_not_configured", captured: false });
    }

    if (!result?.ok) {
      console.warn("Kit subscribe (ebook) falhou:", JSON.stringify(result));
      return json(response, { ok: false, error: "kit_error", captured: false });
    }

    return json(response, { ok: true, captured: true });
  } catch (error) {
    console.warn("Erro ao chamar Kit (ebook):", error);
    return json(response, { ok: false, error: "kit_unreachable", captured: false });
  }
}
