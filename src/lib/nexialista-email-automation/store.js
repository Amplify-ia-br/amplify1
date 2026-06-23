import { getSql, hasDatabaseUrl } from "../lead-scoring/db.js";
import { tagKitSubscriber } from "../kit-events.js";
import { getWorkflow, listWorkflows } from "./flows.js";
import { personalizeStep, sendAutomationEmail } from "./mailer.js";

function clean(value) {
  return String(value || "").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getTags(payload = {}, lead = {}) {
  return unique([...(Array.isArray(payload.tags) ? payload.tags : []), ...(Array.isArray(lead.tags) ? lead.tags : [])]);
}

function hasTag(tags, tag) {
  return tags.includes(tag);
}

function isNexialistaEvent(payload = {}) {
  return clean(payload.source) === "nexialista" || clean(payload.eventName).startsWith("nexialista_");
}

function selectWorkflowKeys(payload = {}, lead = {}) {
  const eventName = clean(payload.eventName || payload.event_name);
  const tags = getTags(payload, lead);
  const leadStage = clean(lead.lead_stage || lead.leadStage || payload.leadStage);
  const accessType = clean(payload.accessType);
  const keys = [];

  if (clean(payload.formStatus) === "in_progress" || eventName === "nexialista_form_progress") {
    keys.push("diagnosis_abandoned");
    return keys;
  }

  if (eventName === "nexialista_free_access_granted" || hasTag(tags, "acesso_gratuito_liberado")) {
    keys.push("free_access");
  }

  if (
    eventName === "nexialista_ebook_downloaded" &&
    (accessType === "paid" || (hasTag(tags, "pagamento_concluido") && hasTag(tags, "ebook_baixado")))
  ) {
    keys.push("purchased_downloaded");
  }

  if (eventName === "nexialista_checkout_started" || hasTag(tags, "checkout_iniciado")) {
    keys.push("checkout_abandoned");
  }

  if (["oportunidade", "lead_quente"].includes(leadStage) || hasTag(tags, "oportunidade") || hasTag(tags, "lead_quente")) {
    keys.push("hot_lead");
  } else if (["lead_qualificado", "lead_em_descoberta"].includes(leadStage) || hasTag(tags, "lead_qualificado") || hasTag(tags, "lead_em_descoberta")) {
    keys.push("discovery");
  }

  return unique(keys);
}

async function cancelConflictingAutomations(sql, email, payload, lead) {
  const tags = getTags(payload, lead);
  const eventName = clean(payload.eventName || payload.event_name);
  const cancellations = [];

  if (clean(payload.formStatus) === "completed" || eventName === "nexialista_form_completed") {
    cancellations.push("diagnosis_abandoned");
  }

  if (hasTag(tags, "pagamento_concluido") || eventName === "nexialista_payment_completed") {
    cancellations.push("diagnosis_abandoned", "checkout_abandoned");
  }

  if (hasTag(tags, "acesso_gratuito_liberado") || eventName === "nexialista_free_access_granted") {
    cancellations.push("diagnosis_abandoned", "checkout_abandoned", "purchased_downloaded");
  }

  if (hasTag(tags, "oportunidade") || hasTag(tags, "lead_quente") || ["oportunidade", "lead_quente"].includes(clean(lead.lead_stage))) {
    cancellations.push("discovery");
  }

  if (!cancellations.length) return;

  await sql`
    UPDATE email_automation_enrollments
    SET status = 'cancelled', cancelled_at = now(), updated_at = now(), last_error = NULL
    WHERE email = ${email}
      AND workflow_key = ANY(${unique(cancellations)})
      AND status = 'active'
  `;
}

async function enrollWorkflow(sql, workflowKey, email, lead, payload) {
  const workflow = getWorkflow(workflowKey);
  if (!workflow) return { ok: false, skipped: true, reason: `workflow inválido: ${workflowKey}` };

  const nextRunRows = await sql`
    SELECT now() + (${workflow.initialDelayHours}::text || ' hours')::interval AS next_run_at
  `;

  const rows = await sql`
    INSERT INTO email_automation_enrollments (
      lead_id,
      email,
      source,
      workflow_key,
      status,
      current_step,
      next_run_at,
      metadata
    )
    VALUES (
      ${lead.id || null},
      ${email},
      'nexialista',
      ${workflowKey},
      'active',
      0,
      ${nextRunRows[0].next_run_at},
      ${JSON.stringify({ workflowName: workflow.name, eventName: payload.eventName, payload })}::jsonb
    )
    ON CONFLICT DO NOTHING
    RETURNING id, workflow_key, next_run_at
  `;

  return rows[0] ? { ok: true, enrollment: rows[0] } : { ok: true, skipped: true, reason: "já inscrito" };
}

export async function handleNexialistaAutomationEvent(payload = {}, lead = {}) {
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };
  if (!isNexialistaEvent(payload)) return { ok: true, skipped: true, reason: "evento fora do escopo" };

  const email = clean(payload.email).toLowerCase();
  if (!email) return { ok: false, skipped: true, reason: "email ausente" };

  const sql = getSql();
  await cancelConflictingAutomations(sql, email, payload, lead);

  const workflowKeys = selectWorkflowKeys(payload, lead);
  const results = [];

  for (const workflowKey of workflowKeys) {
    results.push(await enrollWorkflow(sql, workflowKey, email, lead, payload));
  }

  return { ok: true, workflowKeys, results };
}

export async function runDueNexialistaEmails({ limit = 20 } = {}) {
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };

  const sql = getSql();
  const enrollments = await sql`
    SELECT e.*, l.name, l.company, l.tags AS lead_tags
    FROM email_automation_enrollments e
    LEFT JOIN leads l ON l.email = e.email
    WHERE e.status = 'active'
      AND e.next_run_at IS NOT NULL
      AND e.next_run_at <= now()
    ORDER BY e.next_run_at ASC
    LIMIT ${limit}
  `;

  const results = [];

  for (const enrollment of enrollments) {
    results.push(await processEnrollment(sql, enrollment));
  }

  return { ok: true, processed: results.length, results };
}

async function processEnrollment(sql, enrollment) {
  const workflow = getWorkflow(enrollment.workflow_key);
  if (!workflow) {
    await markEnrollmentError(sql, enrollment, "Workflow não encontrado.");
    return { ok: false, enrollmentId: enrollment.id, error: "Workflow não encontrado." };
  }

  const step = workflow.steps[enrollment.current_step];
  if (!step) {
    await completeEnrollment(sql, enrollment, workflow);
    return { ok: true, enrollmentId: enrollment.id, completed: true };
  }

  const personalized = personalizeStep(step, enrollment);
  const sendResult = await sendAutomationEmail({
    to: enrollment.email,
    subject: personalized.subject,
    html: personalized.html,
    text: personalized.text,
  });

  if (!sendResult.ok) {
    const error = sendResult.reason || JSON.stringify(sendResult.error || sendResult);
    await recordSend(sql, enrollment, personalized, sendResult, "error", error);
    await markEnrollmentError(sql, enrollment, error);
    return { ok: false, enrollmentId: enrollment.id, workflow: workflow.key, step: step.key, error };
  }

  await recordSend(sql, enrollment, personalized, sendResult, "sent");

  const isLastStep = enrollment.current_step >= workflow.steps.length - 1;

  if (isLastStep) {
    await completeEnrollment(sql, enrollment, workflow);
  } else {
    const delayAfterHours = Number(step.delayAfterHours || 24);
    await sql`
      UPDATE email_automation_enrollments
      SET current_step = current_step + 1,
          next_run_at = now() + (${delayAfterHours}::text || ' hours')::interval,
          retry_count = 0,
          last_error = NULL,
          updated_at = now()
      WHERE id = ${enrollment.id}
    `;
  }

  return { ok: true, enrollmentId: enrollment.id, workflow: workflow.key, step: step.key, messageId: sendResult.id };
}

async function recordSend(sql, enrollment, step, sendResult, status, error = null) {
  await sql`
    INSERT INTO email_automation_sends (
      enrollment_id,
      email,
      workflow_key,
      step_key,
      subject,
      provider,
      provider_message_id,
      status,
      scheduled_at,
      sent_at,
      error,
      payload
    )
    VALUES (
      ${enrollment.id},
      ${enrollment.email},
      ${enrollment.workflow_key},
      ${step.key},
      ${step.subject},
      'resend',
      ${sendResult.id || null},
      ${status},
      ${enrollment.next_run_at},
      ${status === "sent" ? new Date().toISOString() : null},
      ${error},
      ${JSON.stringify({ preview: step.preview, provider: sendResult })}::jsonb
    )
    ON CONFLICT (enrollment_id, step_key) DO NOTHING
  `;
}

async function markEnrollmentError(sql, enrollment, error) {
  await sql`
    UPDATE email_automation_enrollments
    SET retry_count = retry_count + 1,
        last_error = ${clean(error)},
        next_run_at = now() + interval '1 hour',
        updated_at = now()
    WHERE id = ${enrollment.id}
  `;
}

async function completeEnrollment(sql, enrollment, workflow) {
  await sql`
    UPDATE email_automation_enrollments
    SET status = 'completed', completed_at = now(), next_run_at = NULL, updated_at = now()
    WHERE id = ${enrollment.id}
  `;

  await tagKitSubscriber(enrollment.email, `nexialista:${workflow.completionTag}`).catch(() => null);
}

export function getNexialistaWorkflowSummary() {
  return listWorkflows().map((workflow) => ({
    key: workflow.key,
    name: workflow.name,
    completionTag: workflow.completionTag,
    steps: workflow.steps.map((step) => ({ key: step.key, subject: step.subject, preview: step.preview })),
  }));
}
