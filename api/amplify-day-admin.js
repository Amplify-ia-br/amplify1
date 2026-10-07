import {
  AMPLIFY_DAY_EVENT_KEY,
  buildInvitationCc,
  buildInvitationMaterials,
  createInvitationCode,
  createInvitationId,
  getAmplifyDayServerClient,
  hashInvitationToken,
  isValidEmail,
  normalizeEmail,
  parseEmailList,
  requireAmplifyDayEditor,
  sanitizeInvitationInput,
  signInvitationToken,
  validateInvitationInput,
} from "../src/lib/amplify-day/invitations.js";
import { getRequestOrigin, readJsonBody, sendJson } from "../src/lib/amplify-day/http.js";
import { buildInstitutionalCampaignLink, renderInstitutionalInvitationEmail, renderInvitationEmail, sendAmplifyDayInvitation } from "../src/lib/amplify-day/mailer.js";
import { buildIntegrationStatusUpdate, runAmplifyDayIntegrations, summarizeIntegrationError } from "../src/lib/amplify-day/integrations.js";
import { syncKitSubscriberEvent, tagKitSubscriber, untagKitSubscriber } from "../src/lib/kit-events.js";
import { getAmplifyDayStageLabel, getAmplifyDayStageTag, isValidAmplifyDayStage, normalizeAmplifyDayStage } from "../src/lib/amplify-day/stages.js";

function clean(value) {
  return String(value || "").trim();
}

function validateInviter(input = {}) {
  const requestedCcEmails = parseEmailList(input.additionalCcEmails ?? input.additional_cc_emails);
  const invalidCcEmails = requestedCcEmails.filter((email) => !isValidEmail(email));
  const inviterEmail = normalizeEmail(input.email);
  const inviter = {
    name: clean(input.name),
    email: inviterEmail,
    role: clean(input.role),
    company: clean(input.company),
    signature: clean(input.signature),
    base_message: clean(input.baseMessage || input.base_message),
    additional_cc_emails: requestedCcEmails.filter((email) => email !== inviterEmail),
  };
  const errors = [];
  if (inviter.name.length < 2) errors.push("Nome do convidante é obrigatório.");
  if (inviter.name.length > 160) errors.push("Nome do convidante deve ter no máximo 160 caracteres.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviter.email)) errors.push("Email do convidante é inválido.");
  if (inviter.role.length < 2) errors.push("Cargo do convidante é obrigatório.");
  if (inviter.role.length > 160) errors.push("Cargo do convidante deve ter no máximo 160 caracteres.");
  if (inviter.company.length < 2) errors.push("Empresa do convidante é obrigatória.");
  if (inviter.company.length > 160) errors.push("Empresa do convidante deve ter no máximo 160 caracteres.");
  if (inviter.signature.length < 2 || inviter.signature.length > 400) errors.push("Assinatura deve ter entre 2 e 400 caracteres.");
  if (inviter.base_message.length < 2 || inviter.base_message.length > 2400) errors.push("Mensagem-base deve ter entre 2 e 2.400 caracteres.");
  if (invalidCcEmails.length) errors.push(`Emails em cópia inválidos: ${invalidCcEmails.join(", ")}.`);
  if (inviter.additional_cc_emails.length > 5) errors.push("Use no máximo cinco pessoas adicionais em cópia.");
  return { inviter, errors };
}

function compactError(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value || {});
  return text.slice(0, 2000);
}

async function listDashboard(supabase, origin) {
  const [
    { data: inviters, error: invitersError },
    { data: invitations, error: invitationsError },
    { data: leads, error: leadsError },
    { data: campaigns, error: campaignsError },
    { data: campaignRecipients, error: campaignRecipientsError },
  ] = await Promise.all([
    supabase.from("amplify_day_inviters").select("*").order("created_at", { ascending: false }),
    supabase
      .from("amplify_day_invitations")
      .select("*")
      .eq("event_key", AMPLIFY_DAY_EVENT_KEY)
      .order("created_at", { ascending: false }),
    supabase
      .from("amplify_day_leads")
      .select("*")
      .eq("stage", "complete")
      .order("completed_at", { ascending: false }),
    supabase
      .from("amplify_day_campaigns")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("amplify_day_campaign_recipients")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);
  if (invitersError || invitationsError || leadsError || campaignsError || campaignRecipientsError) {
    throw new Error(invitersError?.message || invitationsError?.message || leadsError?.message || campaignsError?.message || campaignRecipientsError?.message || "Erro ao carregar convites.");
  }
  const inviterById = new Map((inviters || []).map((inviter) => [inviter.id, inviter]));
  return {
    inviters: inviters || [],
    invitations: (invitations || []).map((invitation) => {
      const inviter = inviterById.get(invitation.inviter_id);
      const materials = inviter ? buildInvitationMaterials(invitation, inviter, origin) : {};
      return { ...invitation, link: materials.link, subject: materials.subject, message: materials.message };
    }),
    leads: (leads || []).map((lead) => ({ ...lead, target_stage: lead.target_stage || "amplify" })),
    campaigns: (campaigns || []).map((campaign) => ({ ...campaign, target_stage: campaign.target_stage || "amplify" })),
    campaignRecipients: (campaignRecipients || []).map((recipient) => ({ ...recipient, target_stage: recipient.target_stage || "amplify" })),
  };
}

async function previewCampaignEmail(supabase, body, origin) {
  const recipientId = clean(body.recipientId || body.id);
  if (!recipientId) return { ok: false, status: 400, error: "Destinatário da campanha inválido." };
  const { data: recipient, error } = await supabase
    .from("amplify_day_campaign_recipients")
    .select("*")
    .eq("id", recipientId)
    .maybeSingle();
  if (error || !recipient) return { ok: false, status: 404, error: "Destinatário da campanha não encontrado." };
  const { data: campaign, error: campaignError } = await supabase
    .from("amplify_day_campaigns")
    .select("*, inviter:amplify_day_inviters(*)")
    .eq("id", recipient.campaign_id)
    .maybeSingle();
  if (campaignError || !campaign?.inviter) return { ok: false, status: 404, error: "Campanha ou convidante não encontrado." };

  const siteOrigin = clean(origin || process.env.AMPLIFY_DAY_SITE_URL || "https://amplify.ia.br").replace(/\/$/, "");
  let email;
  let landingPage = null;
  if (recipient.recipient_type === "nominal" && recipient.invitation_id) {
    const { data: invitation, error: invitationError } = await supabase
      .from("amplify_day_invitations")
      .select("*")
      .eq("id", recipient.invitation_id)
      .maybeSingle();
    if (invitationError || !invitation) return { ok: false, status: 404, error: "Convite nominal não encontrado." };
    const materials = buildInvitationMaterials(invitation, campaign.inviter, siteOrigin);
    landingPage = materials.link;
    email = renderInvitationEmail(invitation, campaign.inviter, materials.link);
  } else if (recipient.recipient_type === "institutional") {
    landingPage = buildInstitutionalCampaignLink(`${siteOrigin}/amplify-day`, recipient.id, recipient.target_stage);
    email = renderInstitutionalInvitationEmail(recipient, campaign.inviter, landingPage);
  } else {
    return { ok: false, status: 409, error: "Este registro está bloqueado e não possui preview de envio." };
  }
  return {
    ok: true,
    preview: {
      recipientType: recipient.recipient_type,
      to: recipient.recipient_email,
      cc: buildInvitationCc({ guest_email: recipient.recipient_email }, campaign.inviter),
      from: `${campaign.inviter.name} | Ampl_IA Day by X-Via <convites@amplify.ia.br>`,
      landingPage,
      ...email,
    },
  };
}

async function findLead(supabase, leadId) {
  const { data, error } = await supabase
    .from("amplify_day_leads")
    .select("*")
    .eq("id", leadId)
    .eq("stage", "complete")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function approveLead(supabase, user, body) {
  const leadId = clean(body.leadId || body.id);
  if (!leadId) return { ok: false, status: 400, error: "Interessado inválido." };
  const lead = await findLead(supabase, leadId);
  if (!lead) return { ok: false, status: 404, error: "Interessado completo não encontrado." };

  if (lead.review_status === "approved" && lead.invitation_id) {
    const { data: existing } = await supabase.from("amplify_day_invitations").select("*").eq("id", lead.invitation_id).maybeSingle();
    return existing ? { ok: true, alreadyApproved: true, invitation: existing } : { ok: false, status: 409, error: "A aprovação existe, mas a inscrição vinculada não foi encontrada." };
  }
  if (lead.review_status === "not_selected") {
    return { ok: false, status: 409, error: "Este perfil já foi marcado como não selecionado." };
  }
  if (!lead.organization || !lead.role) {
    return { ok: false, status: 409, error: "O perfil precisa ter organização e cargo antes da aprovação." };
  }

  const { data: activeInvitation, error: existingError } = await supabase
    .from("amplify_day_invitations")
    .select("*")
    .eq("event_key", AMPLIFY_DAY_EVENT_KEY)
    .eq("guest_email", lead.email)
    .neq("status", "revoked")
    .maybeSingle();
  if (existingError) return { ok: false, status: 400, error: existingError.message };
  if (activeInvitation && activeInvitation.status !== "confirmed") {
    return { ok: false, status: 409, error: "Esta pessoa já possui um convite nominal em andamento." };
  }

  let invitation = activeInvitation;
  if (!invitation) {
    let insertError;
    for (let attempt = 0; attempt < 4 && !invitation; attempt += 1) {
      const id = createInvitationId();
      const token = signInvitationToken(id);
      const row = {
        id,
        event_key: AMPLIFY_DAY_EVENT_KEY,
        inviter_id: null,
        target_stage: normalizeAmplifyDayStage(lead.target_stage),
        guest_name: lead.name,
        guest_email: lead.email,
        guest_company: lead.organization,
        guest_role: lead.role,
        personal_message: null,
        code: createInvitationCode(),
        token_hash: hashInvitationToken(token),
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        registration_origin: "open_application",
        created_by: user.id,
      };
      const inserted = await supabase.from("amplify_day_invitations").insert(row).select("*").single();
      invitation = inserted.data;
      insertError = inserted.error;
      if (insertError?.code !== "23505") break;
      const { data: concurrentInvitation } = await supabase
        .from("amplify_day_invitations")
        .select("*")
        .eq("event_key", AMPLIFY_DAY_EVENT_KEY)
        .eq("guest_email", lead.email)
        .eq("status", "confirmed")
        .maybeSingle();
      if (concurrentInvitation) invitation = concurrentInvitation;
    }
    if (!invitation) return { ok: false, status: 400, error: insertError?.message || "Não foi possível gerar a inscrição." };
  }

  const reviewedAt = new Date().toISOString();
  const { data: claimedLead, error: leadUpdateError } = await supabase
    .from("amplify_day_leads")
    .update({ review_status: "approved", reviewed_at: reviewedAt, reviewed_by: user.id, invitation_id: invitation.id })
    .eq("id", lead.id)
    .eq("review_status", "pending_review")
    .select("id")
    .maybeSingle();
  if (leadUpdateError) return { ok: false, status: 500, error: "A inscrição foi criada, mas não pôde ser vinculada ao perfil." };
  if (!claimedLead) {
    const currentLead = await findLead(supabase, lead.id);
    if (currentLead?.review_status === "approved" && currentLead.invitation_id) {
      const { data: currentInvitation } = await supabase.from("amplify_day_invitations").select("*").eq("id", currentLead.invitation_id).maybeSingle();
      if (currentInvitation) return { ok: true, alreadyApproved: true, invitation: currentInvitation };
    }
    return { ok: false, status: 409, error: "O perfil já foi analisado em outra sessão." };
  }

  const integrations = await runAmplifyDayIntegrations(invitation);
  const statusUpdate = buildIntegrationStatusUpdate(integrations);
  const { data: updated, error: integrationSaveError } = await supabase
    .from("amplify_day_invitations")
    .update(statusUpdate)
    .eq("id", invitation.id)
    .select("*")
    .single();
  if (integrationSaveError) return { ok: false, status: 500, error: "A aprovação foi concluída, mas os status das integrações não puderam ser salvos." };
  await supabase.from("amplify_day_leads").update({
    kit_sync_status: integrations.kit.ok ? "synced" : "failed",
    kit_sync_error: integrations.kit.ok ? null : summarizeIntegrationError("kit", integrations.kit),
  }).eq("id", lead.id);

  return {
    ok: true,
    invitation: updated,
    integrations: {
      email: { ok: integrations.email.ok, error: integrations.email.error || null },
      kit: { ok: integrations.kit.ok, error: integrations.kit.error || null },
    },
  };
}

async function rejectLead(supabase, user, body) {
  const leadId = clean(body.leadId || body.id);
  if (!leadId) return { ok: false, status: 400, error: "Interessado inválido." };
  const lead = await findLead(supabase, leadId);
  if (!lead) return { ok: false, status: 404, error: "Interessado completo não encontrado." };
  if (lead.review_status === "approved") return { ok: false, status: 409, error: "Uma inscrição aprovada não pode ser rejeitada." };
  if (lead.review_status === "not_selected") return { ok: true, alreadyRejected: true, lead };

  const { data, error } = await supabase
    .from("amplify_day_leads")
    .update({ review_status: "not_selected", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", lead.id)
    .eq("review_status", "pending_review")
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, status: 400, error: error.message };
  if (!data) return { ok: false, status: 409, error: "O perfil já foi analisado em outra sessão." };
  try {
    const kit = await syncKitSubscriberEvent({
      source: "amplify-day",
      eventName: "amplify_day_2026_not_selected",
      name: data.name,
      email: data.email,
      company: data.organization,
      registrationStatus: "not_selected",
      registrationOrigin: "open_application",
      amplifyDayStage: getAmplifyDayStageLabel(data.target_stage),
    });
    if (kit.ok) await tagKitSubscriber(data.email, getAmplifyDayStageTag(data.target_stage));
    await supabase.from("amplify_day_leads").update({
      kit_sync_status: kit.ok ? "synced" : "failed",
      kit_sync_error: kit.ok ? null : summarizeIntegrationError("kit", kit),
    }).eq("id", data.id);
  } catch (kitError) {
    await supabase.from("amplify_day_leads").update({ kit_sync_status: "failed", kit_sync_error: summarizeIntegrationError("kit", kitError) }).eq("id", data.id);
  }
  return { ok: true, lead: data };
}

async function createInviter(supabase, user, input) {
  const { inviter, errors } = validateInviter(input);
  if (errors.length) return { ok: false, status: 400, error: errors.join(" ") };
  const { data, error } = await supabase
    .from("amplify_day_inviters")
    .insert({ ...inviter, created_by: user.id })
    .select("*")
    .single();
  if (error) return { ok: false, status: 400, error: error.message };
  return { ok: true, inviter: data };
}

async function updateInviter(supabase, input) {
  const id = clean(input.id);
  const { inviter, errors } = validateInviter(input);
  if (!id || errors.length) return { ok: false, status: 400, error: errors.join(" ") || "Convidante inválido." };
  const { data, error } = await supabase
    .from("amplify_day_inviters")
    .update(inviter)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, status: 400, error: error.message };
  return { ok: true, inviter: data };
}

async function createInvitations(supabase, user, body, origin) {
  const inviterId = clean(body.inviterId || body.inviter_id);
  const rawTargetStage = clean(body.targetStage || body.target_stage).toLowerCase();
  if (!isValidAmplifyDayStage(rawTargetStage)) {
    return { ok: false, status: 400, error: "Selecione Palco Amplify ou Palco TEIA." };
  }
  const targetStage = normalizeAmplifyDayStage(rawTargetStage);
  const guests = Array.isArray(body.guests) ? body.guests : [];
  if (!inviterId) return { ok: false, status: 400, error: "Selecione um convidante." };
  if (!guests.length || guests.length > 250) return { ok: false, status: 400, error: "Envie entre 1 e 250 convidados." };

  const { data: inviter, error: inviterError } = await supabase
    .from("amplify_day_inviters")
    .select("*")
    .eq("id", inviterId)
    .maybeSingle();
  if (inviterError || !inviter) return { ok: false, status: 404, error: "Convidante não encontrado." };

  const validated = guests.map(validateInvitationInput);
  const validationErrors = validated.flatMap((item, index) => item.errors.map((error) => `Linha ${index + 1}: ${error}`));
  if (validationErrors.length) return { ok: false, status: 400, error: validationErrors.slice(0, 8).join(" ") };

  const normalizedGuests = validated.map(({ guest }) => guest);
  const emails = normalizedGuests.map(({ guest_email }) => guest_email);
  if (new Set(emails).size !== emails.length) {
    return { ok: false, status: 409, error: "A lista contém emails duplicados." };
  }

  const { data: existing } = await supabase
    .from("amplify_day_invitations")
    .select("guest_email")
    .eq("event_key", AMPLIFY_DAY_EVENT_KEY)
    .neq("status", "revoked")
    .in("guest_email", emails);
  if (existing?.length) {
    return { ok: false, status: 409, error: `Já existe convite ativo para: ${existing.map((item) => item.guest_email).join(", ")}.` };
  }

  const rows = normalizedGuests.map((guest) => {
    const id = createInvitationId();
    const token = signInvitationToken(id);
    return {
      id,
      event_key: AMPLIFY_DAY_EVENT_KEY,
      inviter_id: inviterId,
      target_stage: targetStage,
      ...guest,
      code: createInvitationCode(),
      token_hash: hashInvitationToken(token),
      created_by: user.id,
    };
  });

  const { data, error } = await supabase.from("amplify_day_invitations").insert(rows).select("*");
  if (error) {
    const duplicate = error.code === "23505" ? "Um email ou código já possui convite ativo." : error.message;
    return { ok: false, status: error.code === "23505" ? 409 : 400, error: duplicate };
  }
  return {
    ok: true,
    invitations: (data || []).map((invitation) => ({
      ...invitation,
      ...buildInvitationMaterials(invitation, inviter, origin),
    })),
  };
}

async function sendInvitationEmail(supabase, invitation, inviter, origin) {
  if (invitation.send_locked) {
    return { id: invitation.id, ok: false, error: "Este convite pertence a uma campanha bloqueada aguardando good to go." };
  }
  if (!["ready", "copied", "visited"].includes(invitation.status)) {
    return { id: invitation.id, ok: false, error: "Este convite não pode mais ser enviado." };
  }
  if (!["not_sent", "failed"].includes(invitation.invite_email_status)) {
    return { id: invitation.id, ok: false, error: "Este convite já foi enviado ou está em processamento." };
  }

  const cc = buildInvitationCc(invitation, inviter);
  if (!cc.includes(normalizeEmail(inviter.email))) {
    return { id: invitation.id, ok: false, error: "O email do convidante precisa ser válido para entrar em cópia." };
  }

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("amplify_day_invitations")
    .update({
      invite_email_status: "sending",
      invite_email_cc: cc,
      invite_email_error: null,
      invite_email_last_attempt_at: now,
      invite_email_attempt_count: Number(invitation.invite_email_attempt_count || 0) + 1,
    })
    .eq("id", invitation.id)
    .in("invite_email_status", ["not_sent", "failed"])
    .select("*")
    .maybeSingle();

  if (claimError) return { id: invitation.id, ok: false, error: claimError.message };
  if (!claimed) return { id: invitation.id, ok: false, error: "O envio já foi iniciado em outra sessão." };

  const materials = buildInvitationMaterials(claimed, inviter, origin);
  let emailResult;
  try {
    emailResult = await sendAmplifyDayInvitation(claimed, inviter, materials.link, cc);
  } catch (error) {
    emailResult = { ok: false, error: error?.message || "Falha inesperada no Resend." };
  }

  const emailError = emailResult.ok ? null : compactError(emailResult.reason || emailResult.error);
  const { error: saveError } = await supabase
    .from("amplify_day_invitations")
    .update({
      invite_email_status: emailResult.ok ? "sent" : "failed",
      invite_email_id: emailResult.id || null,
      invite_email_sent_at: emailResult.ok ? new Date().toISOString() : null,
      invite_email_error: emailError,
    })
    .eq("id", invitation.id)
    .eq("invite_email_status", "sending");

  if (saveError) {
    return { id: invitation.id, ok: false, error: "O Resend respondeu, mas o status não pôde ser salvo." };
  }
  return {
    id: invitation.id,
    ok: Boolean(emailResult.ok),
    emailId: emailResult.id || null,
    cc,
    error: emailError,
  };
}

async function sendInvitationEmails(supabase, body, origin) {
  const invitationIds = [...new Set((Array.isArray(body.invitationIds) ? body.invitationIds : [])
    .map(clean)
    .filter(Boolean))];
  if (!invitationIds.length || invitationIds.length > 50) {
    return { ok: false, status: 400, error: "Selecione entre 1 e 50 convites." };
  }

  const { data: invitations, error } = await supabase
    .from("amplify_day_invitations")
    .select("*, inviter:amplify_day_inviters(*)")
    .eq("event_key", AMPLIFY_DAY_EVENT_KEY)
    .in("id", invitationIds);
  if (error) return { ok: false, status: 400, error: error.message };

  const byId = new Map((invitations || []).map((invitation) => [invitation.id, invitation]));
  const results = [];
  for (const invitationId of invitationIds) {
    const invitation = byId.get(invitationId);
    if (!invitation?.inviter) {
      results.push({ id: invitationId, ok: false, error: "Convite não encontrado." });
      continue;
    }
    results.push(await sendInvitationEmail(supabase, invitation, invitation.inviter, origin));
  }
  const sent = results.filter((result) => result.ok).length;
  return { ok: true, results, sent, failed: results.length - sent };
}

async function updateInvitationStatus(supabase, body) {
  const invitationId = clean(body.invitationId || body.id);
  if (!invitationId) return { ok: false, status: 400, error: "Convite inválido." };
  if (body.action === "mark_copied") {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("amplify_day_invitations")
      .update({ status: "copied", copied_at: now })
      .eq("id", invitationId)
      .eq("status", "ready")
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, status: 400, error: error.message };
    return { ok: true, invitation: data };
  }

  if (body.action === "revoke") {
    const { data, error } = await supabase
      .from("amplify_day_invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", invitationId)
      .neq("status", "confirmed")
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, status: 400, error: error.message };
    if (!data) return { ok: false, status: 409, error: "Presenças confirmadas não podem ser revogadas." };
    return { ok: true, invitation: data };
  }
  return { ok: false, status: 400, error: "Ação inválida." };
}

async function syncChangedStageWithKit(record, previousStage, targetStage) {
  const registrationStatus = record.status === "confirmed"
    ? "confirmed"
    : record.review_status === "not_selected"
      ? "not_selected"
      : record.review_status === "approved"
        ? "confirmed"
        : "pending_review";
  const [subscriber, addedTag, removedTag] = await Promise.all([
    syncKitSubscriberEvent({
      source: "amplify-day",
      eventName: "amplify_day_2026_stage_reassigned",
      name: record.guest_name || record.name,
      email: record.guest_email || record.email,
      company: record.guest_company || record.organization,
      registrationCode: record.code,
      registrationStatus,
      registrationOrigin: record.registration_origin || "open_application",
      amplifyDayStage: getAmplifyDayStageLabel(targetStage),
    }),
    tagKitSubscriber(record.guest_email || record.email, getAmplifyDayStageTag(targetStage)),
    untagKitSubscriber(record.guest_email || record.email, getAmplifyDayStageTag(previousStage)),
  ]);
  const ok = Boolean(subscriber.ok && addedTag.ok && removedTag.ok);
  return { ok, error: ok ? null : summarizeIntegrationError("kit", { subscriber, addedTag, removedTag }) };
}

async function updateTargetStage(supabase, body) {
  const invitationId = clean(body.invitationId || body.invitation_id);
  const leadId = clean(body.leadId || body.lead_id);
  const requestedStage = clean(body.targetStage || body.target_stage).toLowerCase();
  if (!isValidAmplifyDayStage(requestedStage)) {
    return { ok: false, status: 400, error: "Selecione Palco Amplify ou Palco TEIA." };
  }
  if (!invitationId && !leadId) return { ok: false, status: 400, error: "Convidado inválido." };
  const targetStage = normalizeAmplifyDayStage(requestedStage);

  if (invitationId) {
    const { data: invitation, error } = await supabase
      .from("amplify_day_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("event_key", AMPLIFY_DAY_EVENT_KEY)
      .maybeSingle();
    if (error) return { ok: false, status: 400, error: error.message };
    if (!invitation) return { ok: false, status: 404, error: "Convite não encontrado." };
    const previousStage = normalizeAmplifyDayStage(invitation.target_stage);
    if (previousStage === targetStage) return { ok: true, invitation, kit: { ok: true, skipped: true } };

    const { data: updated, error: updateError } = await supabase
      .from("amplify_day_invitations")
      .update({ target_stage: targetStage })
      .eq("id", invitation.id)
      .select("*")
      .single();
    if (updateError) return { ok: false, status: 400, error: updateError.message };

    const [{ error: leadError }, { error: recipientError }] = await Promise.all([
      supabase.from("amplify_day_leads").update({ target_stage: targetStage }).eq("invitation_id", invitation.id),
      supabase.from("amplify_day_campaign_recipients").update({ target_stage: targetStage }).eq("invitation_id", invitation.id),
    ]);
    if (leadError || recipientError) {
      await supabase.from("amplify_day_invitations").update({ target_stage: previousStage }).eq("id", invitation.id);
      return { ok: false, status: 500, error: "O palco não pôde ser atualizado em todos os registros vinculados." };
    }

    const kit = await syncChangedStageWithKit(updated, previousStage, targetStage);
    if (updated.status === "confirmed") {
      await supabase.from("amplify_day_invitations").update({
        kit_sync_status: kit.ok ? "synced" : "failed",
        kit_sync_error: kit.error,
      }).eq("id", updated.id);
      await supabase.from("amplify_day_leads").update({
        kit_sync_status: kit.ok ? "synced" : "failed",
        kit_sync_error: kit.error,
      }).eq("invitation_id", updated.id);
    }
    return { ok: true, invitation: { ...updated, kit_sync_status: kit.ok ? "synced" : "failed", kit_sync_error: kit.error }, kit };
  }

  const { data: lead, error } = await supabase
    .from("amplify_day_leads")
    .select("*")
    .eq("id", leadId)
    .eq("stage", "complete")
    .maybeSingle();
  if (error) return { ok: false, status: 400, error: error.message };
  if (!lead) return { ok: false, status: 404, error: "Interessado não encontrado." };
  if (lead.invitation_id) return updateTargetStage(supabase, { invitationId: lead.invitation_id, targetStage });
  const previousStage = normalizeAmplifyDayStage(lead.target_stage);
  if (previousStage === targetStage) return { ok: true, lead, kit: { ok: true, skipped: true } };

  const { data: updatedLead, error: leadUpdateError } = await supabase
    .from("amplify_day_leads")
    .update({ target_stage: targetStage })
    .eq("id", lead.id)
    .select("*")
    .single();
  if (leadUpdateError) return { ok: false, status: 400, error: leadUpdateError.message };
  const kit = await syncChangedStageWithKit(updatedLead, previousStage, targetStage);
  await supabase.from("amplify_day_leads").update({
    kit_sync_status: kit.ok ? "synced" : "failed",
    kit_sync_error: kit.error,
  }).eq("id", updatedLead.id);
  return { ok: true, lead: { ...updatedLead, kit_sync_status: kit.ok ? "synced" : "failed", kit_sync_error: kit.error }, kit };
}

async function retryConfirmationIntegrations(supabase, body) {
  const invitationId = clean(body.invitationId || body.id);
  if (!invitationId) return { ok: false, status: 400, error: "Convite inválido." };

  const { data: invitation, error } = await supabase
    .from("amplify_day_invitations")
    .select("*, inviter:amplify_day_inviters(*)")
    .eq("id", invitationId)
    .eq("event_key", AMPLIFY_DAY_EVENT_KEY)
    .eq("status", "confirmed")
    .maybeSingle();
  if (error) return { ok: false, status: 400, error: error.message };
  if (!invitation) return { ok: false, status: 404, error: "Convite confirmado não encontrado." };

  const requested = [
    invitation.confirmation_email_status === "failed" ? "email" : null,
    invitation.kit_sync_status === "failed" ? "kit" : null,
  ].filter(Boolean);
  if (!requested.length) return { ok: false, status: 409, error: "Este convite não possui integrações com falha." };

  const results = await runAmplifyDayIntegrations(invitation, requested);
  const update = buildIntegrationStatusUpdate(results);
  const { data: updated, error: updateError } = await supabase
    .from("amplify_day_invitations")
    .update(update)
    .eq("id", invitation.id)
    .select("*")
    .single();
  if (updateError) return { ok: false, status: 500, error: "As integrações responderam, mas o resultado não pôde ser salvo." };

  return {
    ok: true,
    invitation: updated,
    integrations: {
      email: results.email ? { ok: results.email.ok, error: results.email.error || null } : null,
      kit: results.kit ? { ok: results.kit.ok, error: results.kit.error || null } : null,
    },
  };
}

async function retryLeadKitIntegration(supabase, body) {
  const leadId = clean(body.leadId || body.id);
  if (!leadId) return { ok: false, status: 400, error: "Interessado inválido." };

  const { data: lead, error } = await supabase
    .from("amplify_day_leads")
    .select("*")
    .eq("id", leadId)
    .eq("stage", "complete")
    .maybeSingle();
  if (error) return { ok: false, status: 400, error: error.message };
  if (!lead) return { ok: false, status: 404, error: "Interessado completo não encontrado." };
  if (lead.kit_sync_status !== "failed") {
    return { ok: false, status: 409, error: "Este cadastro não possui sincronização do Kit com falha." };
  }

  let subscriber;
  let tag;
  let stageTag;
  try {
    [subscriber, tag, stageTag] = await Promise.all([
      syncKitSubscriberEvent({
        source: "amplify-day",
        eventName: lead.review_status === "not_selected"
          ? "amplify_day_2026_not_selected"
          : "amplify_day_2026_interest",
        name: lead.name,
        email: lead.email,
        company: lead.organization,
        registrationStatus: lead.review_status === "not_selected" ? "not_selected" : "pending_review",
        registrationOrigin: "open_application",
        amplifyDayStage: getAmplifyDayStageLabel(lead.target_stage),
      }),
      tagKitSubscriber(lead.email, "amplify-day-2026-interesse"),
      tagKitSubscriber(lead.email, getAmplifyDayStageTag(lead.target_stage)),
    ]);
  } catch (kitError) {
    const message = summarizeIntegrationError("kit", kitError);
    await supabase.from("amplify_day_leads").update({ kit_sync_status: "failed", kit_sync_error: message }).eq("id", lead.id);
    return { ok: true, integration: { ok: false, error: message } };
  }

  const ok = Boolean(subscriber.ok && tag.ok && stageTag.ok);
  const message = ok ? null : summarizeIntegrationError("kit", { subscriber, tag, stageTag });
  await supabase.from("amplify_day_leads").update({
    kit_sync_status: ok ? "synced" : "failed",
    kit_sync_error: message,
  }).eq("id", lead.id);
  return { ok: true, integration: { ok, error: message } };
}

export default async function handler(request, response) {
  const auth = await requireAmplifyDayEditor(request);
  if (!auth.ok) return sendJson(response, { error: auth.error }, auth.status);
  const method = String(request.method || "GET").toUpperCase();
  const origin = getRequestOrigin(request);

  try {
    if (method === "GET") {
      return sendJson(response, { ok: true, ...(await listDashboard(auth.supabase, origin)) });
    }
    if (method !== "POST") return sendJson(response, { error: "Método não permitido." }, 405);
    const body = await readJsonBody(request);
    let result;
    if (body.action === "create_inviter") result = await createInviter(auth.supabase, auth.user, body.inviter);
    else if (body.action === "update_inviter") result = await updateInviter(auth.supabase, body.inviter);
    else if (body.action === "create_invitations") result = await createInvitations(auth.supabase, auth.user, body, origin);
    else if (body.action === "preview_campaign_email") result = await previewCampaignEmail(auth.supabase, body, origin);
    else if (body.action === "send_invitations") result = await sendInvitationEmails(auth.supabase, body, origin);
    else if (body.action === "approve_lead") result = await approveLead(auth.supabase, auth.user, body);
    else if (body.action === "reject_lead") result = await rejectLead(auth.supabase, auth.user, body);
    else if (body.action === "retry_confirmation_integrations") result = await retryConfirmationIntegrations(auth.supabase, body);
    else if (body.action === "retry_lead_integrations") result = body.leadId
      ? await retryLeadKitIntegration(auth.supabase, body)
      : await retryConfirmationIntegrations(auth.supabase, body);
    else if (body.action === "update_target_stage") result = await updateTargetStage(auth.supabase, body);
    else result = await updateInvitationStatus(auth.supabase, body);
    if (!result.ok) return sendJson(response, { error: result.error }, result.status);
    return sendJson(response, result);
  } catch (error) {
    console.error("Amplify Day admin:", error);
    return sendJson(response, { error: error.message || "Erro interno." }, 500);
  }
}
