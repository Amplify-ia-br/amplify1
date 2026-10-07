function clean(value) {
  return String(value || "").trim();
}

export function buildAmplifyDayKitPayload(body = {}) {
  const targetStage = normalizeAmplifyDayStage(body.targetStage || body.target_stage || body.palco);
  return {
    source: "amplify-day",
    eventName: clean(body.eventName || body.event_name || "amplify_day_interest_captured"),
    name: clean(body.name),
    email: clean(body.email).toLowerCase(),
    company: clean(body.organization || body.company),
    role: clean(body.role),
    // The current qualification form keeps WhatsApp under the legacy `linkedin`
    // field name so old sessions and the already-published bundle keep working.
    phone: clean(body.whatsapp || body.linkedin || body.phone),
    registrationStatus: "pending_review",
    registrationOrigin: "open_application",
    targetStage,
    amplifyDayStage: getAmplifyDayStageLabel(targetStage),
  };
}
import { getAmplifyDayStageLabel, normalizeAmplifyDayStage } from "./stages.js";
