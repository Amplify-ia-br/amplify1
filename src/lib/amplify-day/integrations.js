import { syncKitSubscriberEvent, tagKitSubscriber } from "../kit-events.js";
import { sendAmplifyDayConfirmation } from "./mailer.js";
import { getAmplifyDayStageLabel, getAmplifyDayStageTag } from "./stages.js";

function clean(value) {
  return String(value || "").trim();
}

function findProviderMessage(value, seen = new Set()) {
  if (!value || seen.has(value)) return "";
  if (typeof value === "string") return clean(value);
  if (typeof value !== "object") return "";
  seen.add(value);

  if (Array.isArray(value.errors) && value.errors.length) {
    return value.errors.map(clean).filter(Boolean).join("; ");
  }

  for (const key of ["reason", "error", "message", "body", "credentials", "subscriber"]) {
    const message = findProviderMessage(value[key], seen);
    if (message) return message;
  }
  return "";
}

export function summarizeIntegrationError(provider, result) {
  const rawMessage = findProviderMessage(result);
  const status = Number(result?.status || result?.body?.status || result?.credentials?.status || result?.subscriber?.status || result?.subscriber?.subscriber?.status || 0);
  const normalized = rawMessage.toLowerCase();

  if (provider === "kit") {
    if (status === 401 || normalized.includes("api key is invalid") || normalized.includes("invalid api key")) {
      return "Credencial do Kit inválida (HTTP 401).";
    }
    if (normalized.includes("kit_api_key ausente")) return "KIT_API_KEY não configurada.";
    return clean(rawMessage || "Falha ao sincronizar com o Kit.").slice(0, 500);
  }

  if (normalized.includes("configuração do resend ausente")) return "Configuração do Resend ausente.";
  if (status) return clean(`${rawMessage || "Falha no envio pelo Resend"} (HTTP ${status}).`).slice(0, 500);
  return clean(rawMessage || "Falha ao enviar o e-mail de confirmação.").slice(0, 500);
}

export async function syncAmplifyDayKit(invitation) {
  let subscriber;
  try {
    subscriber = await syncKitSubscriberEvent({
      source: "amplify-day",
      eventName: "amplify_day_2026_confirmed",
      name: invitation.guest_name,
      email: invitation.guest_email,
      company: invitation.guest_company,
      registrationCode: invitation.code,
      registrationStatus: "confirmed",
      registrationOrigin: invitation.registration_origin || "nominal_invite",
      amplifyDayStage: getAmplifyDayStageLabel(invitation.target_stage),
    });
  } catch (error) {
    return { ok: false, error: summarizeIntegrationError("kit", error) };
  }

  if (!subscriber.ok) {
    return { ok: false, error: summarizeIntegrationError("kit", subscriber), subscriber };
  }

  let tags;
  try {
    tags = await Promise.all([
      tagKitSubscriber(invitation.guest_email, "amplify-day-2026-confirmado"),
      tagKitSubscriber(invitation.guest_email, getAmplifyDayStageTag(invitation.target_stage)),
    ]);
  } catch (error) {
    return { ok: false, error: summarizeIntegrationError("kit", error), subscriber };
  }

  const failedTag = tags.find((tag) => !tag.ok);
  if (failedTag) return { ok: false, error: summarizeIntegrationError("kit", failedTag), subscriber, tags };
  return { ok: true, subscriber, tags };
}

export async function sendAmplifyDayConfirmationEmail(invitation) {
  try {
    const result = await sendAmplifyDayConfirmation(invitation);
    return result.ok
      ? result
      : { ...result, error: summarizeIntegrationError("email", result) };
  } catch (error) {
    return { ok: false, error: summarizeIntegrationError("email", error) };
  }
}

export async function runAmplifyDayIntegrations(invitation, requested = ["email", "kit"]) {
  const selected = new Set(requested);
  const [email, kit] = await Promise.all([
    selected.has("email") ? sendAmplifyDayConfirmationEmail(invitation) : Promise.resolve(null),
    selected.has("kit") ? syncAmplifyDayKit(invitation) : Promise.resolve(null),
  ]);
  return { email, kit };
}

export function buildIntegrationStatusUpdate(results) {
  const update = {};
  if (results.email) {
    update.confirmation_email_status = results.email.ok ? "sent" : "failed";
    update.confirmation_email_id = results.email.id || null;
    update.confirmation_email_error = results.email.ok ? null : summarizeIntegrationError("email", results.email);
  }
  if (results.kit) {
    update.kit_sync_status = results.kit.ok ? "synced" : "failed";
    update.kit_sync_error = results.kit.ok ? null : summarizeIntegrationError("kit", results.kit);
  }
  return update;
}
