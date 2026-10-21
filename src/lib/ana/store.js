import { getSql, hasDatabaseUrl } from "../lead-scoring/db.js";

function clean(value) {
  return String(value || "").trim();
}

function json(value) {
  return JSON.stringify(value || {});
}

function parseClaimVersion(value) {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error("claim_version invalido");
  }
  return version;
}

export async function loadAnaSession(sessionKey) {
  const key = clean(sessionKey);
  if (!key || !hasDatabaseUrl()) return null;

  const sql = getSql();
  const rows = await sql`
    SELECT session_key, channel, mode, status, qualification_state,
      email, phone, ghl_contact_id, ghl_opportunity_id, last_handoff_id
    FROM ana_qualification_sessions
    WHERE session_key = ${key}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function saveAnaSession({ sessionKey, state, eventName, payload = {} }) {
  const key = clean(sessionKey);
  if (!key) throw new Error("session_key ausente");
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };

  const sql = getSql();
  const fields = state?.fields || {};
  const stateJson = json(state);
  const payloadJson = json(payload);
  const rows = eventName
    ? await sql`
        WITH saved AS (
          INSERT INTO ana_qualification_sessions (
            session_key, channel, mode, status, qualification_state, email, phone
          ) VALUES (
            ${key},
            ${clean(state?.channel) || "web"},
            ${clean(state?.mode) || "inbound"},
            ${clean(state?.status) || "collecting"},
            ${stateJson}::jsonb,
            ${clean(fields.email).toLowerCase() || null},
            ${clean(fields.phone) || null}
          )
          ON CONFLICT (session_key) DO UPDATE SET
            channel = EXCLUDED.channel,
            mode = EXCLUDED.mode,
            status = CASE
              WHEN ana_qualification_sessions.status = 'handed_off' THEN ana_qualification_sessions.status
              ELSE EXCLUDED.status
            END,
            qualification_state = jsonb_set(
              EXCLUDED.qualification_state,
              '{fields}',
              COALESCE(EXCLUDED.qualification_state->'fields', '{}'::jsonb)
                || jsonb_strip_nulls(jsonb_build_object(
                  'reputacao_escola', ana_qualification_sessions.qualification_state#>'{fields,reputacao_escola}',
                  'reputacao_escola_justificativa', ana_qualification_sessions.qualification_state#>'{fields,reputacao_escola_justificativa}',
                  'reputacao_escola_fonte', ana_qualification_sessions.qualification_state#>'{fields,reputacao_escola_fonte}',
                  'reputacao_escola_responsavel', ana_qualification_sessions.qualification_state#>'{fields,reputacao_escola_responsavel}',
                  'next_action', ana_qualification_sessions.qualification_state#>'{fields,next_action}',
                  'engagement_status', ana_qualification_sessions.qualification_state#>'{fields,engagement_status}'
                )),
              true
            ),
            email = COALESCE(EXCLUDED.email, ana_qualification_sessions.email),
            phone = COALESCE(EXCLUDED.phone, ana_qualification_sessions.phone),
            updated_at = now()
          RETURNING id, session_key, status
        ), logged AS (
          INSERT INTO ana_qualification_events (session_id, event_name, payload)
          SELECT id, ${clean(eventName)}, ${payloadJson}::jsonb
          FROM saved
          RETURNING id
        )
        SELECT id, session_key, status,
          EXISTS (SELECT 1 FROM logged) AS event_logged
        FROM saved
      `
    : await sql`
        INSERT INTO ana_qualification_sessions (
          session_key, channel, mode, status, qualification_state, email, phone
        ) VALUES (
          ${key},
          ${clean(state?.channel) || "web"},
          ${clean(state?.mode) || "inbound"},
          ${clean(state?.status) || "collecting"},
          ${stateJson}::jsonb,
          ${clean(fields.email).toLowerCase() || null},
          ${clean(fields.phone) || null}
        )
        ON CONFLICT (session_key) DO UPDATE SET
          channel = EXCLUDED.channel,
          mode = EXCLUDED.mode,
          status = CASE
            WHEN ana_qualification_sessions.status = 'handed_off' THEN ana_qualification_sessions.status
            ELSE EXCLUDED.status
          END,
          qualification_state = jsonb_set(
            EXCLUDED.qualification_state,
            '{fields}',
            COALESCE(EXCLUDED.qualification_state->'fields', '{}'::jsonb)
              || jsonb_strip_nulls(jsonb_build_object(
                'reputacao_escola', ana_qualification_sessions.qualification_state#>'{fields,reputacao_escola}',
                'reputacao_escola_justificativa', ana_qualification_sessions.qualification_state#>'{fields,reputacao_escola_justificativa}',
                'reputacao_escola_fonte', ana_qualification_sessions.qualification_state#>'{fields,reputacao_escola_fonte}',
                'reputacao_escola_responsavel', ana_qualification_sessions.qualification_state#>'{fields,reputacao_escola_responsavel}',
                'next_action', ana_qualification_sessions.qualification_state#>'{fields,next_action}',
                'engagement_status', ana_qualification_sessions.qualification_state#>'{fields,engagement_status}'
              )),
            true
          ),
          email = COALESCE(EXCLUDED.email, ana_qualification_sessions.email),
          phone = COALESCE(EXCLUDED.phone, ana_qualification_sessions.phone),
          updated_at = now()
        RETURNING id, session_key, status
      `;

  return { ok: true, session: rows[0] };
}

export async function appendAnaSessionEvent({ sessionKey, eventName, payload = {} }) {
  const key = clean(sessionKey);
  const name = clean(eventName);
  if (!key || !name) throw new Error("session_key e event_name são obrigatórios");
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };

  const sql = getSql();
  const payloadJson = json(payload);
  const rows = await sql`
    INSERT INTO ana_qualification_events (session_id, event_name, payload)
    SELECT id, ${name}, ${payloadJson}::jsonb
    FROM ana_qualification_sessions
    WHERE session_key = ${key}
    RETURNING id, event_name, occurred_at
  `;

  return rows[0]
    ? { ok: true, event: rows[0] }
    : { ok: false, skipped: true, reason: "sessão não encontrada" };
}

export async function updateAnaInternalEnrichment({ sessionKey, fields }) {
  const key = clean(sessionKey);
  if (!key) throw new Error("session_key ausente");
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    throw new Error("fields de enriquecimento inválidos");
  }
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };

  const sql = getSql();
  const fieldsJson = json(fields);
  const payloadJson = json({ fields: Object.keys(fields) });
  const rows = await sql`
    WITH updated AS (
      UPDATE ana_qualification_sessions
      SET qualification_state = jsonb_set(
          qualification_state,
          '{fields}',
          COALESCE(qualification_state->'fields', '{}'::jsonb) || ${fieldsJson}::jsonb,
          true
        ),
        updated_at = now()
      WHERE session_key = ${key}
      RETURNING id, session_key, qualification_state, status, ghl_contact_id, ghl_opportunity_id
    ), logged AS (
      INSERT INTO ana_qualification_events (session_id, event_name, payload)
      SELECT id, 'internal_enrichment_updated', ${payloadJson}::jsonb
      FROM updated
      RETURNING id
    )
    SELECT session_key, qualification_state, status, ghl_contact_id, ghl_opportunity_id,
      EXISTS (SELECT 1 FROM logged) AS event_logged
    FROM updated
  `;

  return rows[0]
    ? { ok: true, session: rows[0] }
    : { ok: false, skipped: true, reason: "sessão não encontrada" };
}

export async function recordAnaCrmContact({ sessionKey, contactId }) {
  const key = clean(sessionKey);
  const crmContactId = clean(contactId);
  if (!key || !crmContactId) {
    throw new Error("session_key e contact_id são obrigatórios");
  }
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };

  const sql = getSql();
  const payloadJson = json({ contactId: crmContactId });
  const rows = await sql`
    WITH updated AS (
      UPDATE ana_qualification_sessions
      SET ghl_contact_id = ${crmContactId},
        updated_at = now()
      WHERE session_key = ${key}
      RETURNING id, session_key, ghl_contact_id
    ), logged AS (
      INSERT INTO ana_qualification_events (session_id, event_name, payload)
      SELECT id, 'crm_contact_linked', ${payloadJson}::jsonb
      FROM updated
      RETURNING id
    )
    SELECT session_key, ghl_contact_id,
      EXISTS (SELECT 1 FROM logged) AS event_logged
    FROM updated
  `;

  return rows[0]
    ? { ok: true, session: rows[0] }
    : { ok: false, skipped: true, reason: "sessão não encontrada" };
}

export async function queueAnaHandoff({ handoffId, sessionKey, payload }) {
  const id = clean(handoffId);
  const key = clean(sessionKey);
  if (!id || !key) throw new Error("handoff_id e session_key são obrigatórios");
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };

  const sql = getSql();
  const payloadJson = json(payload);
  const rows = await sql`
    INSERT INTO ana_handoff_outbox (handoff_id, session_key, status, payload, attempt_count)
    VALUES (${id}, ${key}, 'processing', ${payloadJson}::jsonb, 1)
    ON CONFLICT (handoff_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      attempt_count = ana_handoff_outbox.attempt_count + 1,
      status = 'processing',
      last_error = null,
      updated_at = now()
    WHERE ana_handoff_outbox.status IN ('pending', 'failed')
      OR (
        ana_handoff_outbox.status = 'processing'
        AND ana_handoff_outbox.updated_at < now() - interval '15 minutes'
      )
    RETURNING handoff_id, status, attempt_count, ghl_contact_id, ghl_opportunity_id
  `;
  if (rows[0]) {
    return {
      ok: true,
      claimed: true,
      claimVersion: Number(rows[0].attempt_count),
      outbox: rows[0],
    };
  }

  const existing = await sql`
    SELECT handoff_id, status, attempt_count, ghl_contact_id, ghl_opportunity_id
    FROM ana_handoff_outbox
    WHERE handoff_id = ${id}
    LIMIT 1
  `;
  return { ok: true, claimed: false, claimVersion: null, outbox: existing[0] || null };
}

export async function completeAnaHandoff({
  handoffId,
  sessionKey,
  claimVersion,
  contactId,
  opportunityId,
}) {
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };
  const sql = getSql();
  const id = clean(handoffId);
  const key = clean(sessionKey);
  if (!id || !key) throw new Error("handoff_id e session_key sao obrigatorios");
  const version = parseClaimVersion(claimVersion);
  const rows = await sql`
    WITH target_session AS (
      SELECT id
      FROM ana_qualification_sessions
      WHERE session_key = ${key}
    ), completed_handoff AS (
      UPDATE ana_handoff_outbox
      SET status = 'completed',
        ghl_contact_id = COALESCE(${clean(contactId) || null}, ghl_contact_id),
        ghl_opportunity_id = COALESCE(${clean(opportunityId) || null}, ghl_opportunity_id),
        last_error = null,
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
      WHERE handoff_id = ${id}
        AND EXISTS (SELECT 1 FROM target_session)
        AND attempt_count = ${version}
        AND status IN ('processing', 'completed')
      RETURNING ghl_contact_id, ghl_opportunity_id
    ), completed_session AS (
      UPDATE ana_qualification_sessions
      SET status = 'handed_off',
        ghl_contact_id = COALESCE(
          (SELECT ghl_contact_id FROM completed_handoff LIMIT 1),
          ana_qualification_sessions.ghl_contact_id
        ),
        ghl_opportunity_id = COALESCE(
          (SELECT ghl_opportunity_id FROM completed_handoff LIMIT 1),
          ana_qualification_sessions.ghl_opportunity_id
        ),
        last_handoff_id = ${id},
        updated_at = now()
      WHERE session_key = ${key}
        AND EXISTS (SELECT 1 FROM completed_handoff)
      RETURNING id
    )
    SELECT
      EXISTS (SELECT 1 FROM completed_handoff) AS handoff_completed,
      EXISTS (SELECT 1 FROM completed_session) AS session_completed
  `;
  if (!rows[0]?.handoff_completed || !rows[0]?.session_completed) {
    throw new Error("handoff ou sessão não encontrados para conclusão atômica");
  }
  return { ok: true };
}

export async function failAnaHandoff({ handoffId, claimVersion, error }) {
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };
  const sql = getSql();
  const id = clean(handoffId);
  if (!id) throw new Error("handoff_id ausente");
  const version = parseClaimVersion(claimVersion);
  const rows = await sql`
    UPDATE ana_handoff_outbox
    SET status = 'failed', last_error = ${clean(error).slice(0, 1000)}, updated_at = now()
    WHERE handoff_id = ${id}
      AND status = 'processing'
      AND attempt_count = ${version}
    RETURNING handoff_id
  `;
  return rows[0]
    ? { ok: true }
    : { ok: false, skipped: true, reason: "handoff_claim_not_owned" };
}

