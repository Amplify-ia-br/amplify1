import type { APIRoute } from "astro";
import { captureLeiaLeadConversion } from "../../lib/leia/conversion.js";
import { cleanLeiaLeadValue, normalizeLeiaLead, validateLeiaLead } from "../../lib/leia/lead.js";

export const prerender = false;

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const POST: APIRoute = async ({ request, url }) => {
  if (!process.env.KIT_API_KEY && import.meta.env.KIT_API_KEY) {
    process.env.KIT_API_KEY = import.meta.env.KIT_API_KEY;
  }
  if (!process.env.RESEND_API_KEY && import.meta.env.RESEND_API_KEY) {
    process.env.RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
  }

  try {
    const body = await request.json();
    if (cleanLeiaLeadValue(body.website)) return json({ ok: true });

    const lead = normalizeLeiaLead(body, url.pathname);
    const validationError = validateLeiaLead(lead);
    if (validationError) return json({ ok: false, error: validationError }, 400);

    const result = await captureLeiaLeadConversion(lead);
    if (!result.ok) {
      console.error("Falha ao registrar ou notificar interesse no L.E.I.A.", result);
      return json({ ok: false, error: "Não foi possível enviar agora. Tente novamente." }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Erro no formulário do L.E.I.A.", error);
    return json({ ok: false, error: "Não foi possível enviar agora. Tente novamente." }, 500);
  }
};
