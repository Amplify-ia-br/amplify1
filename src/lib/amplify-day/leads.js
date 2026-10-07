import { getAmplifyDayServerClient, isValidEmail, normalizeEmail } from "./invitations.js";
import { normalizeAmplifyDayStage } from "./stages.js";

function clean(value) {
  return String(value || "").trim();
}

export function getLeadStage(eventName) {
  if (eventName === "amplify_day_profile_completed") return "complete";
  if (eventName === "amplify_day_qualification_updated") return "qualification_partial";
  return "identity";
}

export function sanitizeLeadInput(input = {}) {
  const eventName = clean(input.eventName || input.event_name || "amplify_day_interest_captured");
  return {
    name: clean(input.name),
    email: normalizeEmail(input.email),
    organization: clean(input.organization || input.company) || null,
    role: clean(input.role) || null,
    whatsapp: clean(input.whatsapp || input.linkedin) || null,
    target_stage: normalizeAmplifyDayStage(input.targetStage || input.target_stage || input.palco),
    marketing_consent: input.marketingConsent === true || input.marketingConsent === "true",
    source: "amplify-day",
    stage: getLeadStage(eventName),
    last_event_name: eventName,
  };
}

export function validateLeadInput(input = {}) {
  const lead = sanitizeLeadInput(input);
  const errors = [];
  if (lead.name.length < 2 || lead.name.length > 160) errors.push("Informe seu nome.");
  if (!isValidEmail(lead.email)) errors.push("Informe um email válido.");
  if ((lead.organization || "").length > 200) errors.push("Organização muito longa.");
  if ((lead.role || "").length > 200) errors.push("Cargo muito longo.");
  if ((lead.whatsapp || "").length > 40) errors.push("WhatsApp muito longo.");
  return { lead, errors };
}

export async function saveAmplifyDayLead(input = {}) {
  const { lead, errors } = validateLeadInput(input);
  if (errors.length) return { ok: false, status: 400, errors };

  const now = new Date().toISOString();
  const payload = {
    ...lead,
    last_event_at: now,
    completed_at: lead.stage === "complete" ? now : null,
    kit_sync_status: "pending",
    kit_sync_error: null,
  };
  const supabase = getAmplifyDayServerClient();
  const save = (nextPayload) => supabase
    .from("amplify_day_leads")
    .upsert(nextPayload, { onConflict: "email" })
    .select("id, email, stage")
    .single();

  let { data, error } = await save(payload);
  // Compatibility while the production database receives the stage-routing
  // migration. Kit still receives targetStage from the request payload, so the
  // correct stage tag is applied without interrupting public registrations.
  if (error && /target_stage/i.test(String(error.message || ""))) {
    const { target_stage: _targetStage, ...legacyPayload } = payload;
    ({ data, error } = await save(legacyPayload));
  }

  if (error || !data) {
    console.error("Amplify Day lead no Supabase:", error);
    return { ok: false, status: 500, error: "Não foi possível registrar seus dados agora." };
  }
  return { ok: true, lead: data };
}

export async function updateLeadKitStatus(email, { ok, error } = {}) {
  const supabase = getAmplifyDayServerClient();
  const { error: updateError } = await supabase
    .from("amplify_day_leads")
    .update({
      kit_sync_status: ok ? "synced" : "failed",
      kit_sync_error: ok ? null : clean(error || "Falha ao sincronizar com o Kit").slice(0, 500),
    })
    .eq("email", normalizeEmail(email));
  if (updateError) console.error("Amplify Day status do Kit:", updateError);
}
