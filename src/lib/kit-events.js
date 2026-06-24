import { getWorkflow } from "./nexialista-email-automation/flows.js";
import { personalizeStep } from "./nexialista-email-automation/mailer.js";

const KIT_API_BASE_URL = "https://api.kit.com/v4";
const REQUEST_TIMEOUT_MS = 7000;

const FIELD_LABELS = [
  "lead_score",
  "fit_score",
  "intent_score",
  "maturity_score",
  "engagement_score",
  "lead_stage",
  "score_reason",
  "source",
  "company",
  "phone_number",
  "nexialista_level",
  "nexialista_incentive",
  "nexialista_price",
  "nexialista_access_url",
  "nexialista_last_event",
  "bootcamp_slug",
  "bootcamp_event_id",
  "bootcamp_city",
  "bootcamp_date",
  "bootcamp_order_id",
  "bootcamp_ticket_number",
  "bootcamp_checkin_status",
  "bootcamp_whatsapp_url",
  "bootcamp_entry_point",
  "bootcamp_intent",
  "bootcamp_role",
  "bootcamp_company_size",
  "bootcamp_team_size",
  "bootcamp_interest_area",
  "bootcamp_source_cta",
  "bootcamp_checkout_url",
  "bootcamp_whatsapp_message",
  "bootcamp_last_event",
  "ebook_slug",
  "ebook_title",
  "ebook_url",
  "ebook_site",
  "ebook_last_event",
  "ana_resposta_1",
  "ana_resposta_2",
  "ana_resposta_3",
  "ana_resposta_4",
  "ana_last_event",
];

const EVENT_TAG_MAP = {
  nexialista_form_progress: ["nexialista:diagnostico_iniciado"],
  nexialista_form_completed: ["nexialista:diagnostico_concluido"],
  nexialista_free_access_granted: ["nexialista:acesso_gratuito"],
  nexialista_checkout_started: ["nexialista:checkout_iniciado"],
  nexialista_payment_completed: ["nexialista:pagamento_concluido"],
  nexialista_ebook_downloaded: ["nexialista:ebook_baixado"],
  bootcamp_interest_captured: ["bootcamp:interesse"],
  bootcamp_program_requested: ["bootcamp:programa_solicitado"],
  bootcamp_checkout_clicked: ["bootcamp:checkout_clicado"],
  bootcamp_checkout_started: ["bootcamp:checkout_iniciado"],
  bootcamp_corporate_lead: ["bootcamp:corporativo"],
  bootcamp_sponsor_lead: ["bootcamp:patrocinio"],
  bootcamp_waitlist_joined: ["bootcamp:lista_espera"],
  bootcamp_order_approved: ["bootcamp:pedido_aprovado"],
  bootcamp_participant_confirmed: ["bootcamp:participante_confirmado"],
  bootcamp_whatsapp_optin: ["bootcamp:whatsapp_optin"],
  bootcamp_attended: ["bootcamp:compareceu"],
  bootcamp_missed: ["bootcamp:nao_compareceu"],
  ebook_executivo_x0_lead_captured: ["ebook:executivo_x0", "ebook:download", "lead:ebook"],
  ana_lead_captured: ["ana:amplify", "lead:qualificacao_ia"],
};

const TAG_MAP = {
  ebook_nexialista: "nexialista:ebook",
  diagnostico_nexialista_iniciado: "nexialista:diagnostico_iniciado",
  diagnostico_nexialista_concluido: "nexialista:diagnostico_concluido",
  acesso_gratuito_liberado: "nexialista:acesso_gratuito",
  ebook_baixado: "nexialista:ebook_baixado",
  checkout_iniciado: "nexialista:checkout_iniciado",
  pagamento_concluido: "nexialista:pagamento_concluido",
  lead_quente: "lead:quente",
  oportunidade: "lead:oportunidade",
  lead_qualificado: "lead:qualificado",
  lead_em_descoberta: "lead:descoberta",
  interesse_diagnostico: "lead:interesse_diagnostico",
  quer_diagnostico: "lead:interesse_diagnostico",
  "bootcamp:checkout_clicado": "bootcamp:checkout_clicado",
  "bootcamp:checkout_iniciado": "bootcamp:checkout_iniciado",
  "bootcamp:interesse": "bootcamp:interesse",
  "bootcamp:programa_solicitado": "bootcamp:programa_solicitado",
  "bootcamp:corporativo": "bootcamp:corporativo",
  "bootcamp:patrocinio": "bootcamp:patrocinio",
  "bootcamp:lista_espera": "bootcamp:lista_espera",
  "bootcamp:pedido_aprovado": "bootcamp:pedido_aprovado",
  "bootcamp:participante_confirmado": "bootcamp:participante_confirmado",
  "bootcamp:whatsapp_optin": "bootcamp:whatsapp_optin",
  "bootcamp:compareceu": "bootcamp:compareceu",
  "bootcamp:nao_compareceu": "bootcamp:nao_compareceu",
  ebook_executivo_x0: "ebook:executivo_x0",
  ebook_download: "ebook:download",
  lead_ebook: "lead:ebook",
};

const NATIVE_FOLLOWUP_SEQUENCES = {
  free_access: Number(process.env.KIT_NEXIALISTA_FREE_FOLLOWUP_SEQUENCE_ID || 2787868),
  purchased_downloaded: Number(process.env.KIT_NEXIALISTA_PURCHASED_FOLLOWUP_SEQUENCE_ID || 2787869),
  bootcamp_interest: Number(process.env.KIT_BOOTCAMP_INTEREST_SEQUENCE_ID || 0),
  bootcamp_checkout_abandoned: Number(process.env.KIT_BOOTCAMP_CHECKOUT_ABANDONED_SEQUENCE_ID || 0),
  bootcamp_corporate: Number(process.env.KIT_BOOTCAMP_CORPORATE_SEQUENCE_ID || 2805401),
  bootcamp_sponsor: Number(process.env.KIT_BOOTCAMP_SPONSOR_SEQUENCE_ID || 0),
  bootcamp_waitlist: Number(process.env.KIT_BOOTCAMP_WAITLIST_SEQUENCE_ID || 0),
  bootcamp_confirmed: Number(process.env.KIT_BOOTCAMP_CONFIRMED_SEQUENCE_ID || 0),
  bootcamp_whatsapp_optin: Number(process.env.KIT_BOOTCAMP_WHATSAPP_SEQUENCE_ID || 0),
  bootcamp_attended: Number(process.env.KIT_BOOTCAMP_ATTENDED_SEQUENCE_ID || 0),
  bootcamp_missed: Number(process.env.KIT_BOOTCAMP_MISSED_SEQUENCE_ID || 0),
};

let customFieldsPromise = null;
const tagIdPromises = new Map();

function clean(value) {
  return String(value || "").trim();
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && clean(value) !== ""));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getApiKey() {
  return clean(process.env.KIT_API_KEY)
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

async function kitRequest(path, { method = "GET", body } = {}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return { ok: false, skipped: true, reason: "KIT_API_KEY ausente" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${KIT_API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    let payload = {};

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      payload = { raw: responseText };
    }

    return { ok: response.ok, status: response.status, body: payload };
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureCustomFields() {
  if (customFieldsPromise) return customFieldsPromise;

  customFieldsPromise = Promise.all(
    FIELD_LABELS.map((label) => kitRequest("/custom_fields", { method: "POST", body: { label } })),
  );

  return customFieldsPromise;
}

function extractTagId(result) {
  return result?.body?.tag?.id || result?.body?.id || result?.body?.data?.id || null;
}

function extractSubscriberId(result) {
  return result?.body?.subscriber?.id || result?.body?.id || result?.body?.data?.id || null;
}

async function ensureTag(label) {
  if (tagIdPromises.has(label)) return tagIdPromises.get(label);

  const promise = kitRequest("/tags", { method: "POST", body: { name: label } }).then((result) => {
    if (!result.ok) return { ...result, label };
    return { ok: true, label, id: extractTagId(result), result };
  });

  tagIdPromises.set(label, promise);
  return promise;
}

async function tagSubscriberByEmail(tagId, email) {
  if (!tagId) return { ok: false, skipped: true, reason: "tag_id ausente" };
  return kitRequest(`/tags/${encodeURIComponent(tagId)}/subscribers`, {
    method: "POST",
    body: { email_address: email },
  });
}

async function untagSubscriberById(tagId, subscriberId) {
  if (!tagId) return { ok: false, skipped: true, reason: "tag_id ausente" };
  if (!subscriberId) return { ok: false, skipped: true, reason: "subscriber_id ausente" };
  return kitRequest(`/tags/${encodeURIComponent(tagId)}/subscribers/${encodeURIComponent(subscriberId)}`, {
    method: "DELETE",
  });
}

async function addSubscriberToSequenceByEmail(sequenceId, email) {
  if (!sequenceId) return { ok: false, skipped: true, reason: "sequence_id ausente" };
  return kitRequest(`/sequences/${encodeURIComponent(sequenceId)}/subscribers`, {
    method: "POST",
    body: { email_address: email },
  });
}

function getEventName(payload = {}) {
  return clean(payload.eventName || payload.event_name);
}

function getAllTags(payload = {}, lead = {}) {
  const payloadTags = Array.isArray(payload.tags) ? payload.tags : [];
  const leadTags = Array.isArray(lead.tags) ? lead.tags : [];
  return unique([...payloadTags, ...leadTags]);
}

function mapTags(payload = {}, lead = {}) {
  const tags = getAllTags(payload, lead);
  const eventName = getEventName(payload);
  const leadStage = clean(lead.lead_stage || lead.leadStage || payload.leadStage);
  const mapped = [];

  if (eventName && EVENT_TAG_MAP[eventName]) mapped.push(...EVENT_TAG_MAP[eventName]);

  for (const tag of tags) {
    if (TAG_MAP[tag]) mapped.push(TAG_MAP[tag]);
  }

  if (leadStage === "oportunidade") mapped.push("lead:oportunidade");
  if (leadStage === "lead_quente") mapped.push("lead:quente");
  if (leadStage === "lead_qualificado") mapped.push("lead:qualificado");
  if (leadStage === "lead_em_descoberta") mapped.push("lead:descoberta");

  return unique(mapped);
}

function mapSequences(payload = {}, lead = {}) {
  const eventName = getEventName(payload);
  const tags = getAllTags(payload, lead);
  const leadStage = clean(lead.lead_stage || lead.leadStage || payload.leadStage);
  const accessType = clean(payload.accessType);
  const resultTier = clean(payload.result?.tier || payload.tier);
  const formStatus = clean(payload.formStatus);
  const sequences = [];

  if (formStatus === "in_progress" || eventName === "nexialista_form_progress") {
    sequences.push("diagnosis_abandoned");
    return sequences;
  }

  if (eventName === "nexialista_free_access_granted" || tags.includes("acesso_gratuito_liberado")) {
    sequences.push("free_access");
    return sequences;
  }

  if (
    eventName === "nexialista_ebook_downloaded" &&
    (accessType === "paid" || (tags.includes("pagamento_concluido") && tags.includes("ebook_baixado")))
  ) {
    sequences.push("purchased_downloaded");
    return sequences;
  }

  if (eventName === "nexialista_checkout_started" || tags.includes("checkout_iniciado")) {
    sequences.push("checkout_abandoned");
    return sequences;
  }

  if (eventName === "nexialista_form_completed" && resultTier === "free") {
    return sequences;
  }

  if (eventName === "bootcamp_order_approved" || eventName === "bootcamp_participant_confirmed") {
    sequences.push("bootcamp_confirmed");
    return sequences;
  }

  if (eventName === "bootcamp_checkout_started" || eventName === "bootcamp_checkout_clicked") {
    sequences.push("bootcamp_checkout_abandoned");
    return sequences;
  }

  if (eventName === "bootcamp_corporate_lead") {
    sequences.push("bootcamp_corporate");
    return sequences;
  }

  if (eventName === "bootcamp_sponsor_lead") {
    sequences.push("bootcamp_sponsor");
    return sequences;
  }

  if (eventName === "bootcamp_waitlist_joined") {
    sequences.push("bootcamp_waitlist");
    return sequences;
  }

  if (eventName === "bootcamp_program_requested" || eventName === "bootcamp_interest_captured") {
    sequences.push("bootcamp_interest");
    return sequences;
  }

  if (eventName === "bootcamp_whatsapp_optin") {
    sequences.push("bootcamp_whatsapp_optin");
    return sequences;
  }

  if (eventName === "bootcamp_attended") {
    sequences.push("bootcamp_attended");
    return sequences;
  }

  if (eventName === "bootcamp_missed") {
    sequences.push("bootcamp_missed");
    return sequences;
  }

  if (["oportunidade", "lead_quente"].includes(leadStage) || tags.includes("oportunidade") || tags.includes("lead_quente")) {
    sequences.push("hot_lead");
  } else if (["lead_qualificado", "lead_em_descoberta"].includes(leadStage) || tags.includes("lead_qualificado") || tags.includes("lead_em_descoberta")) {
    sequences.push("discovery");
  }

  return unique(sequences);
}

function getConflictingWorkflowKeys(payload = {}, lead = {}) {
  const eventName = getEventName(payload);
  const tags = getAllTags(payload, lead);
  const leadStage = clean(lead.lead_stage || lead.leadStage || payload.leadStage);
  const conflicts = [];

  if (
    eventName === "nexialista_checkout_started" ||
    tags.includes("checkout_iniciado") ||
    eventName === "bootcamp_checkout_started" ||
    eventName === "bootcamp_checkout_clicked"
  ) {
    conflicts.push("discovery", "hot_lead");
  }

  if (eventName === "bootcamp_order_approved" || eventName === "bootcamp_participant_confirmed") {
    conflicts.push(
      "bootcamp_interest",
      "bootcamp_checkout_abandoned",
      "bootcamp_corporate",
      "bootcamp_sponsor",
      "bootcamp_waitlist",
      "discovery",
      "hot_lead",
    );
  }

  if (eventName === "bootcamp_corporate_lead") {
    conflicts.push("bootcamp_interest", "bootcamp_checkout_abandoned", "discovery", "hot_lead");
  }

  if (eventName === "bootcamp_sponsor_lead") {
    conflicts.push("bootcamp_interest", "bootcamp_checkout_abandoned", "discovery", "hot_lead");
  }

  if (
    eventName === "nexialista_payment_completed" ||
    eventName === "nexialista_ebook_downloaded" ||
    eventName === "nexialista_form_completed" ||
    tags.includes("pagamento_concluido") ||
    tags.includes("ebook_baixado") ||
    tags.includes("diagnostico_nexialista_concluido")
  ) {
    conflicts.push("diagnosis_abandoned", "checkout_abandoned", "discovery", "hot_lead");
  }

  if (
    eventName === "nexialista_free_access_granted" ||
    tags.includes("acesso_gratuito_liberado")
  ) {
    conflicts.push("diagnosis_abandoned", "checkout_abandoned", "purchased_downloaded", "discovery", "hot_lead");
  }

  if (
    ["oportunidade", "lead_quente"].includes(leadStage) ||
    tags.includes("oportunidade") ||
    tags.includes("lead_quente")
  ) {
    conflicts.push("discovery");
  }

  return unique(conflicts);
}

function getStepCtaUrl(step, workflowKey, payload = {}) {
  const accessUrl = clean(payload.accessUrl || payload.access_url);

  if (accessUrl && ["free_access_1", "purchased_1"].includes(step.key)) {
    return accessUrl;
  }

  return step.ctaUrl;
}

function getBroadcastSendAt(delayHours) {
  const delayMs = Math.max(60_000, Number(delayHours || 0) * 60 * 60 * 1000);
  return new Date(Date.now() + delayMs).toISOString();
}

async function createWorkflowBroadcast({ workflowKey, step, leadIdentity, flowTagId, delayHours, payload }) {
  const personalized = personalizeStep(
    {
      ...step,
      ctaUrl: getStepCtaUrl(step, workflowKey, payload),
    },
    leadIdentity,
  );

  return kitRequest("/broadcasts", {
    method: "POST",
    body: {
      subject: personalized.subject,
      preview_text: personalized.preview,
      content: personalized.html,
      send_at: getBroadcastSendAt(delayHours),
      subscriber_filter: [{ all: [{ type: "tag", ids: [flowTagId] }] }],
    },
  });
}

async function scheduleWorkflowBroadcasts({ workflowKey, subscriberId, email, payload }) {
  const workflow = getWorkflow(workflowKey);
  const nativeFollowupSequenceId = NATIVE_FOLLOWUP_SEQUENCES[workflowKey] || null;

  if (!workflow && nativeFollowupSequenceId) {
    const nativeSequence = await addSubscriberToSequenceByEmail(nativeFollowupSequenceId, email);
    return {
      ok: nativeSequence.ok,
      workflowKey,
      broadcasts: [],
      nativeSequence: { id: nativeFollowupSequenceId, ok: nativeSequence.ok, status: nativeSequence.status },
    };
  }

  if (!workflow) return { ok: false, skipped: true, reason: `workflow inválido: ${workflowKey}` };
  if (!subscriberId) return { ok: false, skipped: true, reason: "subscriber_id ausente" };

  const flowTagLabel = `nexialista:flow:${workflowKey}:${subscriberId}`;
  const flowTagResult = await ensureTag(flowTagLabel);

  if (!flowTagResult.id) return { ok: false, tag: flowTagResult };

  const tagResult = await tagSubscriberByEmail(flowTagResult.id, email);
  if (!tagResult.ok) return { ok: false, tag: flowTagResult, subscriberTag: tagResult };

  const leadIdentity = {
    name: payload.name || payload.firstName || payload.first_name,
    company: payload.company,
  };
  const broadcasts = [];
  let delayHours = Number(workflow.initialDelayHours || 0);
  const stepsToBroadcast = nativeFollowupSequenceId ? workflow.steps.slice(0, 1) : workflow.steps;

  for (const step of stepsToBroadcast) {
    const broadcastResult = await createWorkflowBroadcast({
      workflowKey,
      step,
      leadIdentity,
      flowTagId: flowTagResult.id,
      delayHours,
      payload,
    });

    broadcasts.push({
      step: step.key,
      ok: broadcastResult.ok,
      status: broadcastResult.status,
      broadcastId: broadcastResult.body?.broadcast?.id,
      sendAt: broadcastResult.body?.broadcast?.send_at,
    });

    delayHours += Number(step.delayAfterHours || 24);
  }

  const nativeSequence = nativeFollowupSequenceId
    ? await addSubscriberToSequenceByEmail(nativeFollowupSequenceId, email)
    : null;

  return {
    ok: broadcasts.every((broadcast) => broadcast.ok) && (!nativeSequence || nativeSequence.ok),
    workflowKey,
    flowTag: flowTagLabel,
    broadcasts,
    nativeSequence: nativeSequence
      ? { id: nativeFollowupSequenceId, ok: nativeSequence.ok, status: nativeSequence.status }
      : null,
  };
}

async function cancelWorkflowBroadcastTags({ workflowKeys, subscriberId }) {
  const results = [];

  for (const workflowKey of unique(workflowKeys)) {
    const flowTagLabel = `nexialista:flow:${workflowKey}:${subscriberId}`;
    const flowTagResult = await ensureTag(flowTagLabel);
    const removeResult = flowTagResult.id
      ? await untagSubscriberById(flowTagResult.id, subscriberId)
      : { ok: false, skipped: true, reason: "tag_id ausente" };

    results.push({
      workflowKey,
      flowTag: flowTagLabel,
      ok: removeResult.ok,
      status: removeResult.status,
    });
  }

  return results;
}

function buildCustomFields(payload = {}, lead = {}) {
  const eventName = getEventName(payload);
  const isNexialistaEvent = eventName.startsWith("nexialista_") || clean(payload.source) === "nexialista";
  const isBootcampEvent = eventName.startsWith("bootcamp_") || Boolean(payload.bootcampSlug || payload.bootcamp_slug);
  const isEbookEvent = Boolean(payload.ebookSlug || payload.ebook_slug);
  const isAnaEvent = eventName.startsWith("ana_") || clean(payload.source) === "ana";

  return compactObject({
    lead_score: lead.total_score ?? payload.totalScore ?? payload.score,
    fit_score: lead.fit_score ?? payload.fitScore,
    intent_score: lead.intent_score ?? payload.intentScore,
    maturity_score: lead.maturity_score ?? payload.maturityScore,
    engagement_score: lead.engagement_score ?? payload.engagementScore,
    lead_stage: lead.lead_stage || payload.leadStage,
    score_reason: lead.score_reason || payload.scoreReason,
    source: payload.source,
    company: payload.company,
    phone_number: payload.phone,
    nexialista_level: payload.level || payload.result?.level,
    nexialista_incentive: payload.incentive || payload.label || payload.result?.label,
    nexialista_price: payload.price || payload.result?.price,
    nexialista_access_url: payload.accessUrl || payload.access_url,
    nexialista_last_event: isNexialistaEvent ? eventName : undefined,
    bootcamp_slug: payload.bootcampSlug || payload.bootcamp_slug || payload.slug,
    bootcamp_event_id: payload.bootcampEventId || payload.bootcamp_event_id || payload.symplaEventId,
    bootcamp_city: payload.bootcampCity || payload.bootcamp_city || payload.city,
    bootcamp_date: payload.bootcampDate || payload.bootcamp_date || payload.date,
    bootcamp_order_id: payload.bootcampOrderId || payload.bootcamp_order_id || payload.orderId || payload.order_id,
    bootcamp_ticket_number: payload.bootcampTicketNumber || payload.bootcamp_ticket_number || payload.ticketNumber || payload.ticket_number,
    bootcamp_checkin_status: payload.bootcampCheckinStatus || payload.bootcamp_checkin_status || payload.checkinStatus,
    bootcamp_whatsapp_url: payload.bootcampWhatsappUrl || payload.bootcamp_whatsapp_url || payload.whatsappGroupUrl,
    bootcamp_entry_point: payload.entryPoint || payload.entry_point,
    bootcamp_intent: payload.intent,
    bootcamp_role: payload.role,
    bootcamp_company_size: payload.companySize || payload.company_size,
    bootcamp_team_size: payload.teamSize || payload.team_size,
    bootcamp_interest_area: payload.interestArea || payload.interest_area,
    bootcamp_source_cta: payload.sourceCta || payload.source_cta,
    bootcamp_checkout_url: payload.checkoutUrl || payload.checkout_url,
    bootcamp_whatsapp_message: payload.whatsappMessage || payload.whatsapp_message,
    bootcamp_last_event: isBootcampEvent ? eventName : undefined,
    ebook_slug: payload.ebookSlug || payload.ebook_slug,
    ebook_title: payload.ebookTitle || payload.ebook_title,
    ebook_url: payload.ebookUrl || payload.ebook_url,
    ebook_site: payload.site || payload.website,
    ebook_last_event: isEbookEvent ? eventName : undefined,
    ana_resposta_1: payload.resposta_1,
    ana_resposta_2: payload.resposta_2,
    ana_resposta_3: payload.resposta_3,
    ana_resposta_4: payload.resposta_4,
    ana_last_event: isAnaEvent ? eventName : undefined,
  });
}

async function upsertSubscriber(payload = {}, lead = {}) {
  const email = clean(payload.email).toLowerCase();
  const firstName = clean(payload.firstName || payload.name).split(/\s+/)[0] || undefined;
  const fields = buildCustomFields(payload, lead);

  return kitRequest("/subscribers", {
    method: "POST",
    body: compactObject({
      email_address: email,
      first_name: firstName,
      fields,
    }),
  });
}

export async function syncKitSubscriberEvent(payload = {}, lead = {}) {
  const email = clean(payload.email).toLowerCase();

  if (!email) return { ok: false, skipped: true, reason: "email ausente" };
  if (!getApiKey()) return { ok: false, skipped: true, reason: "KIT_API_KEY ausente" };

  const fieldResults = await ensureCustomFields();
  const subscriberResult = await upsertSubscriber(payload, lead);

  if (!subscriberResult.ok) {
    return { ok: false, subscriber: subscriberResult, fields: fieldResults };
  }

  const tagLabels = mapTags(payload, lead);
  const tagResults = [];
  const workflowKeys = mapSequences(payload, lead);
  const workflowResults = [];
  const subscriberId = extractSubscriberId(subscriberResult);
  const cancellationResults = subscriberId
    ? await cancelWorkflowBroadcastTags({
        workflowKeys: getConflictingWorkflowKeys(payload, lead).filter((workflowKey) => !workflowKeys.includes(workflowKey)),
        subscriberId,
      })
    : [];

  for (const tagLabel of tagLabels) {
    const tagResult = await ensureTag(tagLabel);
    const subscriberTagResult = tagResult.id ? await tagSubscriberByEmail(tagResult.id, email) : { ok: false, skipped: true, reason: "tag_id ausente" };
    tagResults.push({ tag: tagLabel, ensure: tagResult, subscriber: subscriberTagResult });
  }

  for (const workflowKey of workflowKeys) {
    const workflowResult = await scheduleWorkflowBroadcasts({
      workflowKey,
      subscriberId,
      email,
      payload,
    });
    workflowResults.push(workflowResult);
  }

  return {
    ok: true,
    subscriber: { ok: subscriberResult.ok, status: subscriberResult.status, id: subscriberId },
    tags: tagResults.map((result) => ({ tag: result.tag, ok: result.subscriber.ok, status: result.subscriber.status })),
    workflows: workflowResults.map((result) => ({
      workflow: result.workflowKey,
      ok: result.ok,
      broadcasts: result.broadcasts || [],
      nativeSequence: result.nativeSequence || null,
    })),
    cancellations: cancellationResults,
    fields: fieldResults.map((result) => ({ ok: result.ok, status: result.status })),
  };
}

export async function tagKitSubscriber(email, tagLabel) {
  const cleanEmail = clean(email).toLowerCase();
  const cleanTagLabel = clean(tagLabel);

  if (!cleanEmail) return { ok: false, skipped: true, reason: "email ausente" };
  if (!cleanTagLabel) return { ok: false, skipped: true, reason: "tag ausente" };
  if (!getApiKey()) return { ok: false, skipped: true, reason: "KIT_API_KEY ausente" };

  const tagResult = await ensureTag(cleanTagLabel);
  if (!tagResult.id) return { ok: false, tag: tagResult };

  const subscriberTagResult = await tagSubscriberByEmail(tagResult.id, cleanEmail);
  return { ok: subscriberTagResult.ok, tag: cleanTagLabel, status: subscriberTagResult.status };
}
