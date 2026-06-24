import { getBootcampSymplaStatus } from "../src/lib/sympla.js";

export const config = { runtime: "edge" };

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=120, stale-while-revalidate=300",
    },
  });
}

function clean(value) {
  return String(value || "").trim();
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  const url = new URL(request.url);
  const slug = clean(url.searchParams.get("slug")).toLowerCase();

  if (!slug) {
    return jsonResponse({ error: "Slug é obrigatório." }, 400);
  }

  try {
    const status = await getBootcampSymplaStatus(slug);
    return jsonResponse(status, status.status === "not_found" ? 404 : 200);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "Erro ao consultar status do Bootcamp." }, 500);
  }
}
