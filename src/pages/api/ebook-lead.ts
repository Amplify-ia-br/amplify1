import type { APIRoute } from "astro";
import { syncKitSubscriberEvent } from "../../lib/kit-events.js";

export const prerender = false;

// A integração roda 100% server-side e reutiliza o mesmo padrão do Nexialista
// (syncKitSubscriberEvent / API v4 do Kit). A KIT_API_KEY é fornecida como env
// var na Vercel; em dev local o Astro pode expor apenas via import.meta.env,
// então sincronizamos com process.env porque kit-events.js lê de process.env.
function syncKitEnv() {
  if (!process.env.KIT_API_KEY && import.meta.env?.KIT_API_KEY) {
    process.env.KIT_API_KEY = import.meta.env.KIT_API_KEY as string;
  }
}

const EBOOK = {
  slug: "executivo-x0",
  title: "Executivo X.0 - Sem Barreiras",
  url: "/materiais/executivo-x0-amplify.pdf",
};

const emailValido = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: { name?: string; email?: string; site?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim().toLowerCase();
  const site = (payload.site ?? "").trim();

  if (!name || !emailValido(email)) {
    return json({ ok: false, error: "invalid_fields" }, 422);
  }

  syncKitEnv();

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

    // Sem KIT_API_KEY (ex.: ambiente local): não bloqueia o download no client.
    if (result?.skipped) {
      return json({ ok: false, error: "kit_not_configured", captured: false });
    }

    if (!result?.ok) {
      console.warn("Kit subscribe (ebook) falhou:", JSON.stringify(result));
      return json({ ok: false, error: "kit_error", captured: false });
    }

    return json({ ok: true, captured: true });
  } catch (err) {
    console.warn("Erro ao chamar Kit (ebook):", err);
    return json({ ok: false, error: "kit_unreachable", captured: false });
  }
};
