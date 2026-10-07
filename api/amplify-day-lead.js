import { readJsonBody, sendJson } from "../src/lib/amplify-day/http.js";
import { saveAmplifyDayLead, updateLeadKitStatus } from "../src/lib/amplify-day/leads.js";
import { summarizeIntegrationError } from "../src/lib/amplify-day/integrations.js";
import { buildAmplifyDayKitPayload } from "../src/lib/amplify-day/kit-payload.js";
import { syncKitSubscriberEvent, tagKitSubscriber } from "../src/lib/kit-events.js";
import { getAmplifyDayStageTag } from "../src/lib/amplify-day/stages.js";
import { detectAmplifyDayStageFromTracking } from "../src/lib/amplify-day/stages.js";

function clean(value) {
  return String(value || "").trim();
}

function getRequestReferrer(request) {
  if (typeof request?.headers?.get === "function") return request.headers.get("referer") || request.headers.get("referrer") || "";
  return request?.headers?.referer || request?.headers?.referrer || "";
}

export default async function handler(request, response) {
  if (String(request.method || "POST").toUpperCase() !== "POST") {
    return sendJson(response, { error: "Método não permitido." }, 405);
  }
  try {
    const body = await readJsonBody(request);
    if (!clean(body.targetStage || body.target_stage || body.palco)) {
      const trackedStage = detectAmplifyDayStageFromTracking(getRequestReferrer(request));
      if (trackedStage) body.targetStage = trackedStage;
    }
    if (clean(body.website)) {
      return sendJson(response, { ok: true, captured: true });
    }
    const saved = await saveAmplifyDayLead(body);
    if (!saved.ok) {
      return sendJson(response, { ok: false, captured: false, error: saved.error || saved.errors?.[0] }, saved.status || 500);
    }
    const payload = buildAmplifyDayKitPayload(body);
    const email = payload.email;
    let kitSynced = false;
    try {
      const [subscriber, interestTag, stageTag] = await Promise.all([
        syncKitSubscriberEvent(payload),
        tagKitSubscriber(email, "amplify-day-2026-interesse"),
        tagKitSubscriber(email, getAmplifyDayStageTag(payload.targetStage)),
      ]);
      // A sincronização só está completa quando o contato e a tag existem no Kit.
      // Marcar sucesso parcial como `synced` escondia falhas reais no painel.
      kitSynced = Boolean(subscriber.ok && interestTag.ok && stageTag.ok);
      await updateLeadKitStatus(email, {
        ok: kitSynced,
        error: kitSynced ? null : summarizeIntegrationError("kit", { subscriber, interestTag, stageTag }),
      });
    } catch (kitError) {
      console.error("Amplify Day sincronização com Kit:", kitError);
      await updateLeadKitStatus(email, { ok: false, error: summarizeIntegrationError("kit", kitError) });
    }
    return sendJson(response, { ok: true, captured: true, kitSynced });
  } catch (error) {
    console.error("Amplify Day interesse:", error);
    return sendJson(response, { ok: false, captured: false, error: "Não foi possível registrar agora." }, 500);
  }
}
