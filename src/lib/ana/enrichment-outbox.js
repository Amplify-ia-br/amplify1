import { getSql, hasDatabaseUrl } from "../lead-scoring/db.js";

function clean(value) {
  return String(value || "").trim();
}

function json(value) {
  return JSON.stringify(value || {});
}

function validClaimVersion(value) {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error("claimVersion inválido");
  }
  return version;
}

export async function queueAnaEnrichmentSync({ enrichmentId, sessionKey, contactId, payload }) {
  const id = clean(enrichmentId);
  const key = clean(sessionKey);
  if (!id || !key) throw new Error("enrichment_id e session_key são obrigatórios");
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };

  const sql = getSql();
  const payloadJson = json(payload);
  const rows = await sql`
    INSERT INTO ana_enrichment_outbox (
      enrichment_id, session_key, status, payload, attempt_count, ghl_contact_id
    ) VALUES (
      ${id}, ${key}, 'processing', ${payloadJson}::jsonb, 1, ${clean(contactId) || null}
    )
    ON CONFLICT (enrichment_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      ghl_contact_id = COALESCE(EXCLUDED.ghl_contact_id, ana_enrichment_outbox.ghl_contact_id),
      attempt_count = ana_enrichment_outbox.attempt_count + 1,
      status = 'processing',
      last_error = null,
      updated_at = now()
    WHERE ana_enrichment_outbox.status IN ('pending', 'failed')
      OR (
        ana_enrichment_outbox.status = 'processing'
        AND ana_enrichment_outbox.updated_at < now() - interval '15 minutes'
      )
    RETURNING enrichment_id, status, attempt_count, ghl_contact_id
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
    SELECT enrichment_id, status, attempt_count, ghl_contact_id
    FROM ana_enrichment_outbox
    WHERE enrichment_id = ${id}
    LIMIT 1
  `;
  return {
    ok: true,
    claimed: false,
    claimVersion: existing[0] ? Number(existing[0].attempt_count) : null,
    outbox: existing[0] || null,
  };
}

export async function completeAnaEnrichmentSync({ enrichmentId, claimVersion, contactId }) {
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };
  const sql = getSql();
  const version = validClaimVersion(claimVersion);
  const rows = await sql`
    UPDATE ana_enrichment_outbox
    SET status = 'completed',
      ghl_contact_id = COALESCE(${clean(contactId) || null}, ghl_contact_id),
      last_error = null,
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
    WHERE enrichment_id = ${clean(enrichmentId)}
      AND status = 'processing'
      AND attempt_count = ${version}
    RETURNING enrichment_id
  `;
  return rows[0]
    ? { ok: true }
    : { ok: false, staleClaim: true, reason: "posse do enriquecimento expirou" };
}

export async function failAnaEnrichmentSync({ enrichmentId, claimVersion, error }) {
  if (!hasDatabaseUrl()) return { ok: false, skipped: true, reason: "DATABASE_URL ausente" };
  const sql = getSql();
  const version = validClaimVersion(claimVersion);
  const rows = await sql`
    UPDATE ana_enrichment_outbox
    SET status = 'failed',
      last_error = ${clean(error).slice(0, 1000)},
      updated_at = now()
    WHERE enrichment_id = ${clean(enrichmentId)}
      AND status = 'processing'
      AND attempt_count = ${version}
    RETURNING enrichment_id
  `;
  return rows[0]
    ? { ok: true }
    : { ok: false, staleClaim: true, reason: "posse do enriquecimento expirou" };
}
