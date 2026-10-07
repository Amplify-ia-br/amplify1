import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { GILSON_CAMPAIGN_KEY, GILSON_CAMPAIGN_EXPECTED } from "../src/lib/amplify-day/campaign.js";
import { buildInvitationCc, buildInvitationMaterials } from "../src/lib/amplify-day/invitations.js";
import {
  buildInstitutionalCampaignLink,
  sendAmplifyDayInstitutionalInvitation,
  sendAmplifyDayInvitation,
} from "../src/lib/amplify-day/mailer.js";

function loadEnv(filename) {
  if (!fs.existsSync(filename)) return;
  for (const line of fs.readFileSync(filename, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function compactError(value) {
  return (typeof value === "string" ? value : JSON.stringify(value || {})).slice(0, 2000);
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

loadEnv(path.resolve(".env"));

if (!process.argv.slice(2).includes("good-to-go")) {
  throw new Error("Campanha bloqueada. Execute novamente apenas após a autorização explícita: good-to-go");
}
const missingConfig = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "AMPLIFY_DAY_EMAIL_FROM", "AMPLIFY_DAY_EMAIL_REPLY_TO"]
  .filter((key) => !String(process.env[key] || "").trim());
if (missingConfig.length) {
  throw new Error(`Configuração ausente: ${missingConfig.join(", ")}. A campanha permanece bloqueada.`);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const campaignResult = await supabase
  .from("amplify_day_campaigns")
  .select("*, inviter:amplify_day_inviters(*)")
  .eq("campaign_key", GILSON_CAMPAIGN_KEY)
  .maybeSingle();
if (campaignResult.error) throw campaignResult.error;
const campaign = campaignResult.data;
if (!campaign?.inviter) throw new Error("Campanha ou convidador não encontrado.");
const inviterEmail = String(campaign.inviter.email || "").trim().toLowerCase();
if (!inviterEmail) throw new Error("O convidador da campanha não possui e-mail; nada foi enviado.");

// O Reply-To acompanha o convidador da campanha. Isso impede que uma configuracao
// global desatualizada encaminhe respostas para outra pessoa.
process.env.AMPLIFY_DAY_EMAIL_REPLY_TO = inviterEmail;
const isFirstAuthorization = campaign.send_locked && campaign.status === "ready_locked";
const isAuthorizedResume = !campaign.send_locked && campaign.status === "sending" && campaign.authorized_at;
if (!isFirstAuthorization && !isAuthorizedResume) throw new Error("A campanha não está pronta para autorização ou retomada; nada foi alterado.");
if (!campaign.scheduled_for) throw new Error("A campanha não possui horário preparado.");
if (new Date(campaign.scheduled_for).getTime() <= Date.now()) {
  throw new Error("O horário preparado já passou. Defina um novo horário antes de autorizar.");
}

const recipientsResult = await supabase
  .from("amplify_day_campaign_recipients")
  .select("*")
  .eq("campaign_id", campaign.id)
  .in("status", isAuthorizedResume ? ["ready", "failed"] : ["ready"])
  .in("recipient_type", ["nominal", "institutional"])
  .order("recipient_type", { ascending: true })
  .order("created_at", { ascending: true });
if (recipientsResult.error) throw recipientsResult.error;
const recipients = recipientsResult.data || [];
const expectedReady = GILSON_CAMPAIGN_EXPECTED.nominal + GILSON_CAMPAIGN_EXPECTED.institutional;
if (isFirstAuthorization && recipients.length !== expectedReady) {
  throw new Error(`Esperados ${expectedReady} destinatários prontos; encontrados ${recipients.length}. Nada foi alterado.`);
}

const now = new Date().toISOString();
if (isFirstAuthorization) {
  const unlockCampaign = await supabase
    .from("amplify_day_campaigns")
    .update({ send_locked: false, status: "sending", authorized_at: now, authorized_by: campaign.created_by })
    .eq("id", campaign.id)
    .eq("send_locked", true)
    .eq("status", "ready_locked")
    .select("id")
    .maybeSingle();
  if (unlockCampaign.error || !unlockCampaign.data) throw unlockCampaign.error || new Error("A campanha já foi alterada por outra sessão.");

  const unlockInvitations = await supabase
    .from("amplify_day_invitations")
    .update({ send_locked: false })
    .eq("campaign_id", campaign.id)
    .eq("send_locked", true);
  if (unlockInvitations.error) throw unlockInvitations.error;
}

const siteOrigin = String(process.env.AMPLIFY_DAY_SITE_URL || "https://amplify.ia.br").replace(/\/$/, "");
const siteUrl = new URL(siteOrigin);
if (["localhost", "127.0.0.1", "0.0.0.0"].includes(siteUrl.hostname)) {
  throw new Error(`Origem insegura para campanha: ${siteOrigin}. Use a URL publica antes de enviar.`);
}
let scheduled = 0;
let failed = 0;

for (const recipient of recipients) {
  const attemptAt = new Date().toISOString();
  const claimed = await supabase
    .from("amplify_day_campaign_recipients")
    .update({
      status: "sending",
      last_attempt_at: attemptAt,
      send_attempt_count: Number(recipient.send_attempt_count || 0) + 1,
      delivery_error: null,
    })
    .eq("id", recipient.id)
    .in("status", isAuthorizedResume ? ["ready", "failed"] : ["ready"])
    .select("*")
    .maybeSingle();
  if (claimed.error || !claimed.data) {
    failed += 1;
    continue;
  }

  const current = claimed.data;
  const cc = buildInvitationCc({ guest_email: current.recipient_email }, campaign.inviter);
  let result;
  let invitation = null;
  try {
    if (current.recipient_type === "nominal") {
      const invitationResult = await supabase
        .from("amplify_day_invitations")
        .select("*")
        .eq("id", current.invitation_id)
        .maybeSingle();
      if (invitationResult.error || !invitationResult.data) throw invitationResult.error || new Error("Convite nominal não encontrado.");
      invitation = invitationResult.data;
      const invitationClaim = await supabase.from("amplify_day_invitations").update({
        invite_email_status: "sending",
        invite_email_cc: cc,
        invite_email_error: null,
        invite_email_last_attempt_at: attemptAt,
        invite_email_attempt_count: Number(invitation.invite_email_attempt_count || 0) + 1,
      }).eq("id", invitation.id).in("invite_email_status", isAuthorizedResume ? ["not_sent", "failed"] : ["not_sent"]);
      if (invitationClaim.error) throw invitationClaim.error;
      const materials = buildInvitationMaterials(invitation, campaign.inviter, siteOrigin);
      result = await sendAmplifyDayInvitation(invitation, campaign.inviter, materials.link, cc, { scheduledAt: campaign.scheduled_for });
    } else {
      const link = buildInstitutionalCampaignLink(`${siteOrigin}/amplify-day`, current.id, current.target_stage);
      result = await sendAmplifyDayInstitutionalInvitation(current, campaign.inviter, link, cc, { scheduledAt: campaign.scheduled_for });
    }
  } catch (error) {
    result = { ok: false, error: error?.message || "Falha inesperada ao agendar." };
  }

  const deliveryError = result.ok ? null : compactError(result.reason || result.error);
  await supabase.from("amplify_day_campaign_recipients").update({
    status: result.ok ? "scheduled" : "failed",
    provider_email_id: result.id || null,
    scheduled_for: result.ok ? campaign.scheduled_for : null,
    delivery_error: deliveryError,
  }).eq("id", current.id).eq("status", "sending");
  if (invitation) {
    await supabase.from("amplify_day_invitations").update({
      invite_email_status: result.ok ? "scheduled" : "failed",
      invite_email_id: result.id || null,
      invite_email_error: deliveryError,
    }).eq("id", invitation.id).eq("invite_email_status", "sending");
  }
  if (result.ok) scheduled += 1;
  else failed += 1;

  // Mantém a taxa de requisições conservadora e permite retomada segura por idempotência.
  await pause(550);
}

await supabase.from("amplify_day_campaigns").update({
  status: failed === 0 ? "scheduled" : "sending",
}).eq("id", campaign.id);

console.log(JSON.stringify({
  campaign: campaign.campaign_key,
  scheduledFor: campaign.scheduled_for,
  timezone: campaign.schedule_timezone,
  scheduled,
  failed,
}, null, 2));
