import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertGilsonCampaignCounts, classifyGilsonCampaignCsv, GILSON_CAMPAIGN_KEY } from "../src/lib/amplify-day/campaign.js";
import { createInvitationCode, createInvitationId, hashInvitationToken, signInvitationToken } from "../src/lib/amplify-day/invitations.js";

function loadEnv(filename) {
  if (!fs.existsSync(filename)) return;
  for (const line of fs.readFileSync(filename, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

async function insertChunks(supabase, table, rows, size = 100) {
  for (let index = 0; index < rows.length; index += size) {
    const { error } = await supabase.from(table).insert(rows.slice(index, index + size));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

loadEnv(path.resolve(".env"));
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Informe o caminho do CSV de prospecção.");
const source = fs.readFileSync(path.resolve(sourcePath), "utf8");
const classified = classifyGilsonCampaignCsv(source);
assertGilsonCampaignCounts(classified.counts);
const scheduledFor = "2026-09-15T11:00:00.000Z";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
if (usersError) throw usersError;
const owner = users.users.find((user) => user.email?.toLowerCase() === "leonardo.camacho@amplify.ia.br");
if (!owner) throw new Error("Administrador responsável não encontrado.");

let { data: inviters, error: inviterLookupError } = await supabase
  .from("amplify_day_inviters")
  .select("*")
  .eq("email", "gilson.leal@amplify.ia.br");
if (inviterLookupError) throw inviterLookupError;
let inviter = inviters?.[0];
const inviterProfile = {
  name: "Gilson Leal",
  email: "gilson.leal@amplify.ia.br",
  role: "CEO",
  company: "Shock Wave Academy",
  signature: "Gilson Leal\nCEO da Shock Wave Academy",
  base_message: "Sua experiência pode enriquecer muito essa conversa.",
  additional_cc_emails: [],
};
if (!inviter) {
  const created = await supabase.from("amplify_day_inviters").insert({ ...inviterProfile, created_by: owner.id }).select("*").single();
  if (created.error) throw created.error;
  inviter = created.data;
} else {
  const updated = await supabase.from("amplify_day_inviters").update(inviterProfile).eq("id", inviter.id).select("*").single();
  if (updated.error) throw updated.error;
  inviter = updated.data;
}

const existingCampaign = await supabase.from("amplify_day_campaigns").select("*").eq("campaign_key", GILSON_CAMPAIGN_KEY).maybeSingle();
if (existingCampaign.error) throw existingCampaign.error;
if (existingCampaign.data) {
  const { count, error } = await supabase
    .from("amplify_day_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", existingCampaign.data.id)
    .eq("status", "sent");
  if (error) throw error;
  if (count) throw new Error("A campanha já possui envios e não pode ser reconstruída.");
  const removeRecipients = await supabase.from("amplify_day_campaign_recipients").delete().eq("campaign_id", existingCampaign.data.id);
  if (removeRecipients.error) throw removeRecipients.error;
  const removeInvitations = await supabase.from("amplify_day_invitations").delete().eq("campaign_id", existingCampaign.data.id).eq("invite_email_status", "not_sent");
  if (removeInvitations.error) throw removeInvitations.error;
}

const campaignPayload = {
  campaign_key: GILSON_CAMPAIGN_KEY,
  name: "Palco Amplify · Gilson Leal · Base Educação",
  inviter_id: inviter.id,
  target_stage: "amplify",
  status: "preparing",
  send_locked: true,
  scheduled_for: scheduledFor,
  schedule_timezone: "America/Sao_Paulo",
  authorized_at: null,
  authorized_by: null,
  nominal_count: classified.counts.nominal,
  institutional_count: classified.counts.institutional,
  blocked_count: classified.counts.blocked,
  missing_email_count: classified.counts.missingEmail,
  created_by: owner.id,
};
const campaignResult = existingCampaign.data
  ? await supabase.from("amplify_day_campaigns").update(campaignPayload).eq("id", existingCampaign.data.id).select("*").single()
  : await supabase.from("amplify_day_campaigns").insert(campaignPayload).select("*").single();
if (campaignResult.error) throw campaignResult.error;
const campaign = campaignResult.data;

const nominal = classified.recipients.filter((recipient) => recipient.type === "nominal");
const nominalEmails = nominal.map((recipient) => recipient.email);
const conflicts = await supabase
  .from("amplify_day_invitations")
  .select("guest_email")
  .eq("event_key", "amplify-day-2026")
  .neq("status", "revoked")
  .in("guest_email", nominalEmails);
if (conflicts.error) throw conflicts.error;
if (conflicts.data.length) throw new Error(`Existem ${conflicts.data.length} convites ativos conflitantes; nenhum rascunho foi criado.`);

const invitationRows = nominal.map((recipient) => {
  const id = createInvitationId();
  const token = signInvitationToken(id);
  return {
    id,
    event_key: "amplify-day-2026",
    inviter_id: inviter.id,
    target_stage: "amplify",
    guest_name: recipient.name,
    guest_email: recipient.email,
    guest_company: recipient.company,
    guest_role: recipient.role,
    personal_message: "Sua experiência pode enriquecer muito essa conversa.",
    code: createInvitationCode(),
    token_hash: hashInvitationToken(token),
    status: "ready",
    registration_origin: "nominal_invite",
    invite_email_status: "not_sent",
    campaign_id: campaign.id,
    send_locked: true,
    created_by: owner.id,
  };
});
await insertChunks(supabase, "amplify_day_invitations", invitationRows);
const invitationByEmail = new Map(invitationRows.map((row) => [row.guest_email, row.id]));
const metadata = (recipient) => recipient.sourceRecords.map((record) => ({
  source_id: record.sourceId,
  record_type: record.recordType,
  email_type: record.emailType,
  priority: record.priority,
}));
const recipientRows = classified.recipients.map((recipient) => ({
  campaign_id: campaign.id,
  target_stage: "amplify",
  recipient_type: recipient.type,
  status: recipient.status,
  recipient_email: recipient.email,
  recipient_name: recipient.name,
  company: recipient.company,
  role: recipient.role,
  source_ids: recipient.sourceIds,
  source_metadata: metadata(recipient),
  block_reason: recipient.reason || null,
  invitation_id: invitationByEmail.get(recipient.email) || null,
  subject: recipient.type === "nominal"
    ? "Gilson Leal reservou um convite para você — Ampl_IA Day by X-Via"
    : recipient.type === "institutional"
      ? "Convite para a liderança da sua instituição — Ampl_IA Day by X-Via"
      : "",
}));
for (const record of classified.missingEmail) {
  recipientRows.push({
    campaign_id: campaign.id,
    target_stage: "amplify",
    recipient_type: "missing_email",
    status: "excluded",
    recipient_email: null,
    recipient_name: record.name || null,
    company: record.company || null,
    role: record.role || null,
    source_ids: [record.sourceId],
    source_metadata: metadata({ sourceRecords: [record] }),
    block_reason: "Registro sem e-mail válido.",
    invitation_id: null,
    subject: "",
  });
}
await insertChunks(supabase, "amplify_day_campaign_recipients", recipientRows);
const finished = await supabase.from("amplify_day_campaigns").update({ status: "ready_locked", prepared_at: new Date().toISOString() }).eq("id", campaign.id);
if (finished.error) throw finished.error;

const [{ count: readyCount }, { count: lockedInvitationCount }, { count: sentCount }] = await Promise.all([
  supabase.from("amplify_day_campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("status", "ready"),
  supabase.from("amplify_day_invitations").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("send_locked", true),
  supabase.from("amplify_day_campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("status", "sent"),
]);
if (readyCount !== 167 || lockedInvitationCount !== 19 || sentCount !== 0) throw new Error("A verificação final da campanha falhou.");
console.log(JSON.stringify({ campaign: GILSON_CAMPAIGN_KEY, ready: readyCount, nominalLocked: lockedInvitationCount, sent: sentCount, scheduledFor, scheduleTimezone: "America/Sao_Paulo", sendLocked: true }, null, 2));
