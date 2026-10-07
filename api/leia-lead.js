import { readJsonBody, sendJson } from "../src/lib/amplify-day/http.js";
import { captureLeiaLeadConversion } from "../src/lib/leia/conversion.js";
import { cleanLeiaLeadValue, normalizeLeiaLead, validateLeiaLead } from "../src/lib/leia/lead.js";

export default async function handler(request, response) {
  if (String(request.method || "POST").toUpperCase() !== "POST") {
    return sendJson(response, { ok: false, error: "Método não permitido." }, 405);
  }

  try {
    const body = await readJsonBody(request);
    if (cleanLeiaLeadValue(body.website)) return sendJson(response, { ok: true });

    const lead = normalizeLeiaLead(body, "/leia");
    const validationError = validateLeiaLead(lead);
    if (validationError) return sendJson(response, { ok: false, error: validationError }, 400);

    const result = await captureLeiaLeadConversion(lead);
    if (!result.ok) {
      console.error("Falha ao registrar ou notificar interesse no L.E.I.A.", result);
      return sendJson(response, { ok: false, error: "Não foi possível enviar agora. Tente novamente." }, 502);
    }

    return sendJson(response, { ok: true });
  } catch (error) {
    console.error("Erro no formulário do L.E.I.A.", error);
    return sendJson(response, { ok: false, error: "Não foi possível enviar agora. Tente novamente." }, 500);
  }
}
