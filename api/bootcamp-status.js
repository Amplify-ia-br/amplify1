import { getBootcampSymplaStatus } from "../src/lib/sympla.js";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=120, stale-while-revalidate=300",
    },
  });
}

function sendJson(response, payload, status = 200) {
  if (!response) return jsonResponse(payload, status);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  response.end(JSON.stringify(payload));
}

function clean(value) {
  return String(value || "").trim();
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, { error: "Método não permitido." }, 405);
  }

  const url = new URL(request.url, "https://amplify.ia.br");
  const slug = clean(url.searchParams.get("slug")).toLowerCase();

  if (!slug) {
    return sendJson(response, { error: "Slug é obrigatório." }, 400);
  }

  try {
    const status = await getBootcampSymplaStatus(slug);
    return sendJson(response, status, status.status === "not_found" ? 404 : 200);
  } catch (error) {
    return sendJson(response, { ok: false, error: error.message || "Erro ao consultar status do Bootcamp." }, 500);
  }
}
