import {
  createQualificationState,
  evaluateQualification,
} from "../src/lib/ana/qualification.js";
import { updateAnaInternalEnrichment } from "../src/lib/ana/store.js";
import {
  completeAnaEnrichmentSync,
  failAnaEnrichmentSync,
  queueAnaEnrichmentSync,
} from "../src/lib/ana/enrichment-outbox.js";
import { hasDatabaseUrl } from "../src/lib/lead-scoring/db.js";
import { createGhlClient, ghlConfigFromEnv } from "../src/lib/ghl/index.ts";

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{12,128}$/;
const REPUTATION_VALUES = new Set(["alta", "media", "baixa", "nao_avaliada"]);

function clean(value) {
  return String(value ?? "").trim();
}

function enabled(value) {
  return ["1", "true", "yes", "on"].includes(clean(value).toLowerCase());
}

function comparable(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function bearerToken(request) {
  return clean(request.headers.get("authorization")).replace(/^Bearer\s+/i, "");
}

function safeEqual(left, right) {
  const a = clean(left);
  const b = clean(right);
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

function enrichmentFields(body) {
  const fields = {};
  const reputation = comparable(body.reputacao_escola);
  const hasReputationPayload = [
    "reputacao_escola",
    "reputacao_escola_justificativa",
    "reputacao_escola_fonte",
    "reputacao_escola_responsavel",
  ].some((field) => Object.hasOwn(body, field));

  if (hasReputationPayload) {
    if (!REPUTATION_VALUES.has(reputation)) {
      throw new Error("reputacao_escola deve ser alta, media, baixa ou nao_avaliada");
    }
    const justification = clean(body.reputacao_escola_justificativa);
    const source = clean(body.reputacao_escola_fonte);
    const responsible = clean(body.reputacao_escola_responsavel);
    if (reputation !== "nao_avaliada" && (!justification || !source || !responsible)) {
      throw new Error("Reputação avaliada exige justificativa, fonte e responsável");
    }
    fields.reputacao_escola = reputation;
    fields.reputacao_escola_justificativa = justification;
    fields.reputacao_escola_fonte = source;
    fields.reputacao_escola_responsavel = responsible;
  }

  if (Object.hasOwn(body, "next_action")) fields.next_action = clean(body.next_action);
  if (Object.hasOwn(body, "engagement_status")) fields.engagement_status = clean(body.engagement_status);
  if (Object.keys(fields).length === 0) throw new Error("Nenhum campo interno permitido foi informado");
  return fields;
}

function storedState(value) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function parseCustomFieldIds(raw) {
  if (!clean(raw)) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed;
}

async function enrichmentIdentity(sessionId, fields) {
  const source = new TextEncoder().encode(`${sessionId}:${JSON.stringify(fields)}`);
  const digest = await crypto.subtle.digest("SHA-256", source);
  const hash = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
  return { enrichmentId: hash, marker: `[ANA_ENRICHMENT_ID:${hash}]` };
}

async function syncEnrichmentToGhl({ client, session, evaluation, fields, env, marker }) {
  const contactId = clean(session.ghl_contact_id);
  if (!contactId) return { status: "pending_initial_handoff" };

  const ids = parseCustomFieldIds(env.GHL_ANA_CUSTOM_FIELD_IDS);
  const accountScore = evaluation.accountScore ?? evaluation.icpScore;
  const values = {
    ana_score_total: evaluation.total,
    ana_score_conta: accountScore,
    ana_score_icp: accountScore,
    ana_score_oportunidade: evaluation.opportunityScore,
    ana_reputacao_escola: evaluation.fields.reputacao_escola,
    ana_reputacao_escola_justificativa: evaluation.fields.reputacao_escola_justificativa,
    ana_reputacao_escola_fonte: evaluation.fields.reputacao_escola_fonte,
    ana_reputacao_escola_responsavel: evaluation.fields.reputacao_escola_responsavel,
    ana_next_action: evaluation.fields.next_action,
  };
  const customFields = Object.entries(values).flatMap(([key, fieldValue]) => {
    const id = clean(ids[key]);
    if (!id || fieldValue === null || fieldValue === undefined || clean(fieldValue) === "") return [];
    return [{ id, fieldValue }];
  });
  if (customFields.length) await client.upsertContact({ id: contactId, customFields });

  const notes = await client.listContactNotes(contactId);
  if (!notes.some((note) => String(note.body || "").includes(marker))) {
    const lines = [
      "Atualização interna da qualificação da ANA",
      `Score: ${evaluation.total}/100 (conta ${accountScore}; oportunidade ${evaluation.opportunityScore})`,
      ...Object.entries(fields).map(([field, value]) => `${field}: ${clean(value) || "não informado"}`),
      marker,
    ];
    await client.createContactNote(contactId, lines.join("\n"));
  }
  return { status: "synced", contactId, customFieldsUpdated: customFields.length };
}

export function createAnaEnrichmentHandler(dependencies = {}) {
  const env = dependencies.env || process.env;
  const databaseAvailable = dependencies.hasDatabaseUrl || hasDatabaseUrl;
  const updateEnrichment = dependencies.updateEnrichment || updateAnaInternalEnrichment;
  const queueEnrichment = dependencies.queueEnrichment || queueAnaEnrichmentSync;
  const completeEnrichment = dependencies.completeEnrichment || completeAnaEnrichmentSync;
  const failEnrichment = dependencies.failEnrichment || failAnaEnrichmentSync;
  const makeGhlClient = dependencies.createGhlClient || createGhlClient;
  const configFromEnv = dependencies.ghlConfigFromEnv || ghlConfigFromEnv;

  return async function anaEnrichmentHandler(request) {
    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
    }
    const configuredToken = clean(env.ANA_INTERNAL_ENRICHMENT_TOKEN);
    if (!configuredToken) {
      return jsonResponse({ ok: false, error: "Enriquecimento interno indisponível." }, 503);
    }
    if (!safeEqual(bearerToken(request), configuredToken)) {
      return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
    }
    if (!databaseAvailable()) {
      return jsonResponse({ ok: false, error: "Persistência indisponível." }, 503);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: "Payload JSON inválido." }, 400);
    }
    const sessionId = clean(body.sessionId);
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      return jsonResponse({ ok: false, error: "sessionId inválido." }, 400);
    }

    let fields;
    try {
      fields = enrichmentFields(body);
    } catch (error) {
      return jsonResponse({ ok: false, error: error.message }, 422);
    }

    try {
      const result = await updateEnrichment({ sessionKey: sessionId, fields });
      if (!result?.ok || !result.session) {
        return jsonResponse({ ok: false, error: "Sessão não encontrada." }, 404);
      }
      const stored = storedState(result.session.qualification_state);
      const state = createQualificationState(stored || {});
      const evaluation = evaluateQualification(state);
      let ghl = { status: "disabled" };
      if (enabled(env.ANA_GHL_SYNC_ENABLED)) {
        const identity = await enrichmentIdentity(sessionId, fields);
        let claimVersion = null;
        try {
          if (clean(result.session.ghl_contact_id)) {
            const queued = await queueEnrichment({
              enrichmentId: identity.enrichmentId,
              sessionKey: sessionId,
              contactId: result.session.ghl_contact_id,
              payload: { fields },
            });
            if (queued?.outbox?.status === "completed") {
              ghl = {
                status: "already_synced",
                contactId: clean(queued.outbox.ghl_contact_id || result.session.ghl_contact_id),
              };
            } else if (!queued?.claimed) {
              return jsonResponse(
                {
                  ok: false,
                  error: "A atualização do CRM já está em processamento.",
                  code: "enrichment_crm_sync_in_progress",
                  sessionId,
                },
                409,
              );
            } else {
              claimVersion = queued.claimVersion;
            }
          }

          if (ghl.status === "already_synced") {
            // O marcador determinístico torna a repetição da mesma atualização idempotente.
          } else {
            ghl = await syncEnrichmentToGhl({
              client: makeGhlClient(configFromEnv(env)),
              session: result.session,
              evaluation,
              fields,
              env,
              marker: identity.marker,
            });
            if (ghl.status === "synced" && claimVersion !== null) {
              const completed = await completeEnrichment({
                enrichmentId: identity.enrichmentId,
                claimVersion,
                contactId: ghl.contactId,
              });
              if (!completed?.ok) {
                return jsonResponse(
                  {
                    ok: false,
                    error: "A atualização foi enviada, mas a confirmação interna ficou pendente.",
                    code: "enrichment_persistence_pending",
                    sessionId,
                  },
                  503,
                );
              }
            }
          }
        } catch (error) {
          console.error("Enriquecimento salvo, mas não sincronizado no GoHighLevel:", error);
          if (claimVersion !== null) {
            try {
              await failEnrichment({
                enrichmentId: identity.enrichmentId,
                claimVersion,
                error: error instanceof Error ? error.message : String(error),
              });
            } catch (outboxError) {
              console.error("Falha ao registrar retry do enriquecimento:", outboxError);
            }
          }
          return jsonResponse(
            {
              ok: false,
              error: "O enriquecimento foi salvo, mas a atualização do CRM ficou pendente.",
              code: "enrichment_crm_sync_failed",
              sessionId,
              retryable: true,
            },
            502,
          );
        }
      }
      return jsonResponse({
        ok: true,
        sessionId,
        updatedFields: Object.keys(fields),
        score: {
          modelVersion: evaluation.modelVersion,
          account: evaluation.accountScore ?? evaluation.icpScore,
          icp: evaluation.accountScore ?? evaluation.icpScore,
          opportunity: evaluation.opportunityScore,
          total: evaluation.total,
          completeness: evaluation.completeness,
        },
        integrations: { ghl },
      });
    } catch (error) {
      console.error("Erro no enriquecimento interno da Ana:", error);
      return jsonResponse({ ok: false, error: "Não foi possível salvar o enriquecimento." }, 503);
    }
  };
}

export default createAnaEnrichmentHandler();
