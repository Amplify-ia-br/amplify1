import { getSql, hasDatabaseUrl } from "./db.js";
import { scoreLead } from "./engine.js";
import { handleNexialistaAutomationEvent } from "../nexialista-email-automation/store.js";
import { syncKitSubscriberEvent } from "../kit-events.js";

function clean(value) {
  return String(value || "").trim();
}

function mergeTags(...tagLists) {
  return [...new Set(tagLists.flat().filter(Boolean))];
}

function getEventName(payload, score) {
  const explicitEventName = clean(payload.eventName || payload.event_name);
  if (explicitEventName) return explicitEventName;

  if (clean(payload.formStatus) === "in_progress") return `${score.source}_form_progress`;
  return `${score.source}_form_completed`;
}

export async function persistLeadEvent(payload = {}, options = {}) {
  const email = clean(payload.email).toLowerCase();
  if (!email) {
    return { ok: false, skipped: true, reason: "email ausente" };
  }

  const source = clean(options.source || payload.source || payload.origin || "unknown");
  const score = scoreLead(payload, { source });

  if (!hasDatabaseUrl()) {
    const lead = {
      total_score: score.totalScore,
      fit_score: score.fitScore,
      intent_score: score.intentScore,
      maturity_score: score.maturityScore,
      engagement_score: score.engagementScore,
      lead_stage: score.leadStage,
      score_reason: score.scoreReason,
      tags: mergeTags(score.tags, Array.isArray(payload.tags) ? payload.tags : []),
    };
    const kit = await syncKitSubscriberEvent(payload, lead).catch((error) => ({
      ok: false,
      error: error.message || "Erro ao sincronizar lead no Kit.",
    }));

    return { ok: false, skipped: true, reason: "DATABASE_URL ausente", score, kit };
  }

  const sql = getSql();
  const payloadJson = JSON.stringify(payload);
  const scoreJson = JSON.stringify(score);
  const eventName = getEventName(payload, score);
  const incomingTags = Array.isArray(payload.tags) ? payload.tags : [];
  const tags = mergeTags(score.tags, incomingTags);
  const idempotencyKey = clean(payload.idempotencyKey || payload.idempotency_key);

  if (idempotencyKey) {
    const existingRows = await sql`
      SELECT id
      FROM lead_events
      WHERE email = ${email}
        AND source = ${source}
        AND event_name = ${eventName}
        AND payload->>'idempotencyKey' = ${idempotencyKey}
      LIMIT 1
    `;

    if (existingRows.length) {
      const leadRows = await sql`
        SELECT id, total_score, fit_score, intent_score, maturity_score, engagement_score, lead_stage, tags, score_reason
        FROM leads
        WHERE email = ${email}
        LIMIT 1
      `;

      const lead = leadRows[0] || null;
      const kit = await syncKitSubscriberEvent(payload, lead || {}).catch((error) => ({
        ok: false,
        error: error.message || "Erro ao sincronizar lead no Kit.",
      }));

      return { ok: true, skipped: true, reason: "evento já registrado", lead, score, kit };
    }
  }

  const rows = await sql`
    INSERT INTO leads (
      email,
      name,
      phone,
      company,
      first_source,
      last_source,
      total_score,
      fit_score,
      intent_score,
      maturity_score,
      engagement_score,
      lead_stage,
      score_reason,
      tags,
      last_payload
    )
    VALUES (
      ${email},
      ${clean(payload.name)},
      ${clean(payload.phone)},
      ${clean(payload.company)},
      ${source},
      ${source},
      ${score.totalScore},
      ${score.fitScore},
      ${score.intentScore},
      ${score.maturityScore},
      ${score.engagementScore},
      ${score.leadStage},
      ${score.scoreReason},
      ${tags},
      ${payloadJson}::jsonb
    )
    ON CONFLICT (email) DO UPDATE SET
      name = COALESCE(NULLIF(EXCLUDED.name, ''), leads.name),
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), leads.phone),
      company = COALESCE(NULLIF(EXCLUDED.company, ''), leads.company),
      last_source = EXCLUDED.last_source,
      total_score = GREATEST(leads.total_score, EXCLUDED.total_score),
      fit_score = GREATEST(leads.fit_score, EXCLUDED.fit_score),
      intent_score = GREATEST(leads.intent_score, EXCLUDED.intent_score),
      maturity_score = GREATEST(leads.maturity_score, EXCLUDED.maturity_score),
      engagement_score = GREATEST(leads.engagement_score, EXCLUDED.engagement_score),
      lead_stage = CASE
        WHEN GREATEST(leads.total_score, EXCLUDED.total_score) >= 80 THEN 'oportunidade'
        WHEN GREATEST(leads.total_score, EXCLUDED.total_score) >= 65 THEN 'lead_quente'
        WHEN GREATEST(leads.total_score, EXCLUDED.total_score) >= 45 THEN 'lead_qualificado'
        WHEN GREATEST(leads.total_score, EXCLUDED.total_score) >= 20 THEN 'lead_em_descoberta'
        ELSE 'lead_frio'
      END,
      score_reason = EXCLUDED.score_reason,
      tags = (SELECT ARRAY(SELECT DISTINCT unnest(leads.tags || EXCLUDED.tags))),
      last_payload = EXCLUDED.last_payload,
      updated_at = now()
    RETURNING id, total_score, fit_score, intent_score, maturity_score, engagement_score, lead_stage, tags, score_reason
  `;

  const lead = rows[0];

  await sql`
    INSERT INTO lead_events (lead_id, email, source, event_name, form_status, completed_step, payload, score_snapshot)
    VALUES (
      ${lead.id},
      ${email},
      ${source},
      ${eventName},
      ${clean(payload.formStatus)},
      ${clean(payload.completedStep)},
      ${payloadJson}::jsonb,
      ${scoreJson}::jsonb
    )
  `;

  await sql`
    INSERT INTO lead_scores (
      lead_id,
      email,
      source,
      total_score,
      fit_score,
      intent_score,
      maturity_score,
      engagement_score,
      lead_stage,
      score_reason,
      tags
    )
    VALUES (
      ${lead.id},
      ${email},
      ${source},
      ${lead.total_score},
      ${lead.fit_score},
      ${lead.intent_score},
      ${lead.maturity_score},
      ${lead.engagement_score},
      ${lead.lead_stage},
      ${lead.score_reason},
      ${lead.tags}
    )
  `;

  const automation = await handleNexialistaAutomationEvent(payload, lead).catch((error) => ({
    ok: false,
    error: error.message || "Erro ao avaliar automação de email.",
  }));

  const kit = await syncKitSubscriberEvent(payload, lead).catch((error) => ({
    ok: false,
    error: error.message || "Erro ao sincronizar lead no Kit.",
  }));

  return { ok: true, lead, score, automation, kit };
}
