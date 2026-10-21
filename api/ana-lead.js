import { syncKitSubscriberEvent } from "../src/lib/kit-events.js";
import {
  QUALIFICATION_SCHEMA_VERSION,
  createQualificationState,
  evaluateQualification,
  getNextQuestion,
} from "../src/lib/ana/qualification.js";
import { toPublicQualificationEvaluation } from "../src/lib/ana/public.js";
import {
  appendAnaSessionEvent,
  completeAnaHandoff,
  failAnaHandoff,
  loadAnaSession,
  queueAnaHandoff,
  recordAnaCrmContact,
} from "../src/lib/ana/store.js";
import { createGhlClient, ghlConfigFromEnv } from "../src/lib/ghl/index.ts";
import { hasDatabaseUrl } from "../src/lib/lead-scoring/db.js";

const MAX_BODY_BYTES = 128_000;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{12,128}$/;
const INSTITUTIONAL_CLUSTERS = new Set(["school", "company", "government", "organization"]);

const FIELD_LABELS = Object.freeze({
  need: "Objetivo",
  organization_name: "Organização",
  website: "Site",
  school_type: "Tipo de escola",
  school_initiative_type: "Foco da iniciativa escolar",
  school_levels: "Etapas de ensino",
  eligible_students: "Alunos elegíveis",
  tuition_band: "Faixa de mensalidade",
  reputacao_escola: "Reputação da escola",
  reputacao_escola_justificativa: "Justificativa da reputação",
  reputacao_escola_fonte: "Fonte da reputação",
  reputacao_escola_responsavel: "Responsável pela avaliação da reputação",
  education_audience: "Público da educação",
  business_area: "Área impactada",
  government_level: "Esfera de governo",
  government_audience: "Público do órgão",
  people_impacted: "Pessoas impactadas",
  ai_stage: "Estágio de IA",
  experience_level: "Experiência com IA",
  contact_role: "Papel do contato",
  target_year: "Ano-alvo",
  timeline: "Prazo",
  uf: "UF",
  preferred_contact: "Canal preferido",
  next_step: "Próximo passo escolhido",
});

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function clean(value) {
  return String(value ?? "").trim();
}

function enabled(value) {
  return ["1", "true", "yes", "on"].includes(clean(value).toLowerCase());
}

function validSessionId(value) {
  return SESSION_ID_PATTERN.test(clean(value));
}

function requireClaimVersion(value) {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error("O outbox nao retornou uma versao de posse valida para o handoff");
  }
  return version;
}

async function readJson(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    const error = new Error("Payload excede o limite permitido.");
    error.status = 413;
    throw error;
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Payload JSON inválido.");
    error.status = 400;
    throw error;
  }
}

function storedState(row) {
  const value = row?.qualification_state;
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

function hydrateState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return createQualificationState({
    mode: value.mode,
    channel: value.channel,
    createdAt: value.createdAt,
    fields: value.fields && typeof value.fields === "object" ? value.fields : {},
    skippedFields: Array.isArray(value.skippedFields) ? value.skippedFields : [],
    attempts: value.attempts && typeof value.attempts === "object" ? value.attempts : {},
    history: Array.isArray(value.history) ? value.history.slice(-80) : [],
  });
}

function allowsStatelessFallback(env) {
  if (enabled(env.ANA_ALLOW_STATE_FALLBACK)) return true;
  return env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production";
}

function displayValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (value === null || value === undefined || clean(value) === "") return "não informado";
  return clean(value);
}

function splitName(name) {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || undefined,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

function parseCustomFieldIds(raw) {
  if (!clean(raw)) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GHL_ANA_CUSTOM_FIELD_IDS deve conter um objeto JSON válido");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("GHL_ANA_CUSTOM_FIELD_IDS deve conter um objeto JSON");
  }
  return parsed;
}

function customFieldsForGhl(evaluation, handoffId, env) {
  const ids = parseCustomFieldIds(env.GHL_ANA_CUSTOM_FIELD_IDS);
  const accountScore = evaluation.accountScore ?? evaluation.icpScore;
  const values = {
    ana_cluster: evaluation.cluster,
    ana_route: evaluation.route,
    ana_schema_version: evaluation.schemaVersion,
    ana_score_total: evaluation.total,
    ana_score_conta: accountScore,
    ana_score_icp: accountScore,
    ana_score_oportunidade: evaluation.opportunityScore,
    ana_completude: evaluation.completeness,
    ana_reputacao_escola: evaluation.fields.reputacao_escola,
    ana_reputacao_escola_justificativa: evaluation.fields.reputacao_escola_justificativa,
    ana_reputacao_escola_fonte: evaluation.fields.reputacao_escola_fonte,
    ana_reputacao_escola_responsavel: evaluation.fields.reputacao_escola_responsavel,
    ana_school_type: evaluation.fields.school_type,
    ana_school_initiative_type: evaluation.fields.school_initiative_type,
    ana_eligible_students: evaluation.fields.eligible_students,
    ana_target_year: evaluation.fields.target_year,
    ana_next_step: evaluation.fields.next_step,
    ana_next_action: evaluation.fields.next_action,
    ana_mode: evaluation.mode,
    ana_handoff_id: handoffId,
  };

  return Object.entries(values).flatMap(([key, fieldValue]) => {
    const id = clean(ids[key]);
    if (!id || fieldValue === null || fieldValue === undefined || clean(fieldValue) === "") return [];
    return [{ id, fieldValue }];
  });
}

function contactForGhl(evaluation, handoffId, env) {
  const fields = evaluation.fields;
  return {
    ...splitName(fields.name),
    name: clean(fields.name),
    email: clean(fields.email).toLowerCase() || undefined,
    phone: clean(fields.phone) || undefined,
    companyName: clean(fields.organization_name) || undefined,
    website: clean(fields.website) || undefined,
    state: clean(fields.uf) || undefined,
    country: "BR",
    source: "ANA",
    customFields: customFieldsForGhl(evaluation, handoffId, env),
  };
}

function qualificationSummary(evaluation) {
  const lines = [`Cluster: ${evaluation.cluster}`, `Rota: ${evaluation.route}`];

  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    if (!Object.hasOwn(evaluation.fields, field)) continue;
    lines.push(`${label}: ${displayValue(evaluation.fields[field])}`);
  }

  lines.push(
    `Gates: ${evaluation.gates?.status || "não aplicável"}`,
    `Score conta: ${evaluation.accountScore ?? evaluation.icpScore ?? 0}`,
    `Score oportunidade: ${evaluation.opportunityScore ?? 0}`,
    `Score total: ${evaluation.total ?? 0}/100`,
    `Completude: ${evaluation.completeness ?? 0}%`,
  );
  return lines.join("\n").slice(0, 8_000);
}

function handoffEvidence(evaluation) {
  const gateEvidence = Array.isArray(evaluation.gates?.checks)
    ? evaluation.gates.checks.map((check) => ({
        label: `Gate ${check.id}`,
        value: `${check.status}: ${check.reason}`,
      }))
    : [];
  const scoreEvidence = Array.isArray(evaluation.evidence)
    ? evaluation.evidence.map((item) => ({
        label: `${item.dimension}.${item.criterion} (${item.points}/${item.maxPoints})`,
        value: item.reason,
      }))
    : [];
  return [...gateEvidence, ...scoreEvidence];
}

function deterministicHandoffId(sessionId, evaluation) {
  return `ana:${evaluation.schemaVersion || QUALIFICATION_SCHEMA_VERSION}:${sessionId}:${evaluation.route}`;
}

function nextActionFor(evaluation) {
  const internalAction = clean(evaluation.fields.next_action);
  const labels = {
    conversa_comercial_solicitada: "Conversa com o time comercial solicitada.",
    enviar_materiais_solicitados: "Enviar os materiais solicitados pelo canal preferido.",
    retomar_contato_posteriormente: "Retomar o contato posteriormente, conforme solicitado.",
  };
  if (labels[internalAction]) return labels[internalAction];
  if (internalAction) return internalAction;
  const channel = clean(evaluation.fields.preferred_contact);
  if (channel === "email" || channel === "whatsapp") {
    return `Enviar confirmação e próximos passos por ${channel}.`;
  }
  return "Retornar pelo canal informado para combinar o próximo passo.";
}

function normalizeKitResult(result) {
  if (!result) return { ok: false, skipped: true, reason: "sem resposta" };
  return {
    ok: Boolean(result.ok),
    skipped: Boolean(result.skipped),
    ...(result.reason ? { reason: clean(result.reason) } : {}),
  };
}

async function syncKit(sync, evaluation, summary) {
  const fields = evaluation.fields;
  try {
    const result = await sync({
      source: "ana",
      eventName: "ana_lead_captured",
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      company: fields.organization_name,
      tags: ["ana-amplify", "qualificacao-ia", `ana:${evaluation.route}`],
      resposta_1: fields.need,
      resposta_2: evaluation.cluster,
      resposta_3: evaluation.route,
      resposta_4: summary.slice(0, 1_000),
      score: evaluation.total,
    });
    if (!result?.ok && !result?.skipped) {
      console.warn("Kit sync (Ana) não concluído:", JSON.stringify(normalizeKitResult(result)));
    }
    return normalizeKitResult(result);
  } catch (error) {
    console.warn("Kit sync (Ana) indisponível:", error);
    return { ok: false, skipped: false, reason: "kit_unreachable" };
  }
}

async function syncContactWithoutHandoff(client, contact, evaluation) {
  const existing = await client.findContact({ email: contact.email, phone: contact.phone });
  const upserted = await client.upsertContact(existing ? { ...contact, id: existing.id } : contact);
  const current = await client.getContact(upserted.id);
  let regionTag = null;

  if (INSTITUTIONAL_CLUSTERS.has(evaluation.cluster) && evaluation.fields.uf) {
    const regional = await client.reconcileRegionalTags(
      current.id,
      Array.isArray(current.tags) ? current.tags.map(String) : [],
      evaluation.fields.uf,
    );
    regionTag = regional.regionTag;
  }

  return {
    status: existing ? "updated" : "created",
    contactId: current.id,
    regionTag,
    readyTagAdded: false,
  };
}

function publicGhlError(error) {
  return {
    ok: false,
    error: "Não foi possível sincronizar o contato com o CRM.",
    code: "ghl_sync_failed",
    ...(Number.isFinite(error?.status) ? { upstreamStatus: error.status } : {}),
  };
}

export function createAnaLeadHandler(dependencies = {}) {
  const loadSession = dependencies.loadSession || loadAnaSession;
  const appendEvent = dependencies.appendEvent || appendAnaSessionEvent;
  const queueHandoff = dependencies.queueHandoff || queueAnaHandoff;
  const completeHandoff = dependencies.completeHandoff || completeAnaHandoff;
  const failHandoff = dependencies.failHandoff || failAnaHandoff;
  const recordCrmContact = dependencies.recordCrmContact || recordAnaCrmContact;
  const syncKitEvent = dependencies.syncKit || syncKitSubscriberEvent;
  const databaseAvailable = dependencies.hasDatabaseUrl || hasDatabaseUrl;
  const makeGhlClient = dependencies.createGhlClient || createGhlClient;
  const configFromEnv = dependencies.ghlConfigFromEnv || ghlConfigFromEnv;
  const env = dependencies.env || process.env;

  return async function anaLeadHandler(request) {
    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
    }

    let body;
    try {
      body = await readJson(request);
    } catch (error) {
      return jsonResponse(
        { ok: false, error: error.message || "Payload inválido." },
        Number(error.status) || 400,
      );
    }

    const sessionId = clean(body.sessionId);
    if (!validSessionId(sessionId)) {
      return jsonResponse({ ok: false, error: "sessionId inválido." }, 400);
    }

    const syncEnabled = enabled(env.ANA_GHL_SYNC_ENABLED);
    const handoffEnabled = enabled(env.ANA_GHL_HANDOFF_ENABLED);
    const persisted = Boolean(databaseAvailable());

    if (!persisted && !allowsStatelessFallback(env)) {
      return jsonResponse(
        { ok: false, error: "A qualificação está temporariamente indisponível.", code: "ana_store_unavailable" },
        503,
      );
    }
    if (!persisted && (syncEnabled || handoffEnabled)) {
      return jsonResponse(
        {
          ok: false,
          error: "O CRM não pode ser atualizado sem uma sessão persistida no servidor.",
          code: "persisted_session_required",
        },
        503,
      );
    }

    let row = null;
    let state = null;
    try {
      if (persisted) {
        row = await loadSession(sessionId);
        state = hydrateState(storedState(row));
        if (!state) {
          return jsonResponse(
            { ok: false, error: "Sessão de qualificação não encontrada.", code: "session_not_found" },
            404,
          );
        }
      } else {
        if (body.state?.schemaVersion !== QUALIFICATION_SCHEMA_VERSION) {
          return jsonResponse(
            { ok: false, error: "Estado local ausente ou desatualizado.", code: "state_required" },
            409,
          );
        }
        state = hydrateState(body.state);
      }
    } catch (error) {
      console.error("Erro ao carregar a sessão da Ana:", error);
      return jsonResponse(
        { ok: false, error: "Não foi possível carregar a qualificação.", code: "qualification_load_failed" },
        503,
      );
    }

    const evaluation = evaluateQualification(state);
    const publicEvaluation = toPublicQualificationEvaluation(evaluation);
    if (getNextQuestion(state)) {
      return jsonResponse(
        {
          ok: false,
          error: "A qualificação ainda não foi concluída.",
          code: "qualification_incomplete",
          evaluation: publicEvaluation,
        },
        409,
      );
    }

    if (!clean(evaluation.fields.name)) {
      return jsonResponse(
        {
          ok: false,
          error: "O nome do contato é necessário para concluir.",
          code: "name_missing",
          evaluation: publicEvaluation,
        },
        422,
      );
    }
    if (!clean(evaluation.fields.email) && !clean(evaluation.fields.phone)) {
      return jsonResponse(
        {
          ok: false,
          error: "É necessário informar e-mail ou WhatsApp para concluir.",
          code: "contact_channel_missing",
          evaluation: publicEvaluation,
        },
        422,
      );
    }

    const institutional = INSTITUTIONAL_CLUSTERS.has(evaluation.cluster);
    const readyForHandoff = institutional && evaluation.handoff.ready;
    const disposition = readyForHandoff ? "sales_handoff" : "nurture";
    const handoffId = deterministicHandoffId(sessionId, evaluation);
    const summary = qualificationSummary(evaluation);
    let ghl = { status: "disabled", readyTagAdded: false };
    let ghlError = null;
    let handoffPending = false;
    let handoffPersistenceError = null;
    let handoffClaimVersion = null;
    let crmContactPersistenceError = null;

    try {
      if (handoffEnabled && readyForHandoff) {
        if (row?.last_handoff_id === handoffId && row?.ghl_contact_id) {
          ghl = {
            status: "already_handed_off",
            replayed: true,
            contactId: row.ghl_contact_id,
            opportunityId: row.ghl_opportunity_id || undefined,
            regionTag: evaluation.regionTag,
            readyTagAdded: false,
            warnings: [],
          };
        } else {
          const contact = contactForGhl(evaluation, handoffId, env);
          const handoffPayload = {
            handoffId,
            contact,
            uf: evaluation.fields.uf,
            route: evaluation.route,
            cluster: evaluation.cluster,
            product: evaluation.route,
            scores: {
              account: evaluation.accountScore ?? evaluation.icpScore,
              icp: evaluation.accountScore ?? evaluation.icpScore,
              opportunity: evaluation.opportunityScore,
              total: evaluation.total,
              completeness: evaluation.completeness,
            },
            evidence: handoffEvidence(evaluation),
            qualificationSummary: summary,
            nextAction: nextActionFor(evaluation),
            opportunityName: `${evaluation.fields.organization_name || evaluation.fields.name} — ${evaluation.route}`,
          };
          const queued = await queueHandoff({
            handoffId,
            sessionKey: sessionId,
            payload: { schemaVersion: evaluation.schemaVersion, ...handoffPayload },
          });
          if (!queued?.ok) throw new Error("Não foi possível registrar o handoff antes do envio");
          if (queued.claimed === false) {
            if (queued.outbox?.status === "completed" && queued.outbox?.ghl_contact_id) {
              ghl = {
                status: "already_handed_off",
                replayed: true,
                contactId: queued.outbox.ghl_contact_id,
                opportunityId: queued.outbox.ghl_opportunity_id || undefined,
                regionTag: evaluation.regionTag,
                readyTagAdded: false,
                warnings: [],
              };
              await completeHandoff({
                handoffId,
                sessionKey: sessionId,
                claimVersion: requireClaimVersion(queued.outbox.attempt_count),
                contactId: ghl.contactId,
                opportunityId: ghl.opportunityId,
              });
            } else {
              handoffPending = true;
              ghl = { status: "processing", readyTagAdded: false };
            }
          } else {
            handoffClaimVersion = requireClaimVersion(queued.claimVersion);
            const client = makeGhlClient(configFromEnv(env));
            ghl = await client.handoff(handoffPayload);

            try {
              await completeHandoff({
                handoffId,
                sessionKey: sessionId,
                claimVersion: handoffClaimVersion,
                contactId: ghl.contactId,
                opportunityId: ghl.opportunityId,
              });
            } catch (error) {
              handoffPersistenceError = error;
              console.error("Handoff enviado, mas não marcado como concluído no outbox:", error);
              ghl = { ...ghl, persistenceWarning: "handoff_completion_not_persisted" };
              try {
                await failHandoff({
                  handoffId,
                  claimVersion: handoffClaimVersion,
                  error: "handoff_completion_not_persisted",
                });
              } catch (persistError) {
                console.error("Erro ao liberar o handoff para nova tentativa:", persistError);
              }
            }
          }
        }
      } else if (syncEnabled) {
        const contact = contactForGhl(evaluation, handoffId, env);
        const client = makeGhlClient(configFromEnv(env));
        ghl = await syncContactWithoutHandoff(client, contact, evaluation);
        try {
          const recorded = await recordCrmContact({
            sessionKey: sessionId,
            contactId: ghl.contactId,
          });
          if (!recorded?.ok) {
            throw new Error(recorded?.reason || "crm_contact_id_not_persisted");
          }
        } catch (error) {
          crmContactPersistenceError = error;
          ghl = { ...ghl, persistenceWarning: "crm_contact_id_not_persisted" };
          console.error("Contato sincronizado, mas o ID do CRM não foi persistido:", error);
        }
      }
    } catch (error) {
      ghlError = error;
      console.error("Erro na integração Ana + GoHighLevel:", error);
      if (handoffEnabled && readyForHandoff && handoffClaimVersion !== null) {
        try {
          await failHandoff({
            handoffId,
            claimVersion: handoffClaimVersion,
            error: error?.message || "ghl_sync_failed",
          });
        } catch (persistError) {
          console.error("Erro ao registrar falha do handoff:", persistError);
        }
      }
    }

    if (handoffPending) {
      return jsonResponse(
        {
          ok: false,
          error: "O envio ao time já está sendo processado. Tente confirmar novamente em instantes.",
          code: "handoff_in_progress",
          captured: false,
          sessionId,
          disposition,
          evaluation: publicEvaluation,
          integrations: { ghl, kit: { ok: false, skipped: true, reason: "handoff_in_progress" } },
        },
        409,
      );
    }

    const kit = await syncKit(syncKitEvent, evaluation, summary);

    if (persisted) {
      try {
        await appendEvent({
          sessionKey: sessionId,
          eventName: ghlError
            ? "lead_capture_failed"
            : crmContactPersistenceError
              ? "crm_contact_persistence_pending"
            : handoffPersistenceError
              ? "handoff_persistence_pending"
            : readyForHandoff && handoffEnabled
              ? "lead_handed_off"
              : "lead_captured",
          payload: {
            disposition,
            route: evaluation.route,
            handoffReady: evaluation.handoff.ready,
            ghlStatus: ghlError ? "failed" : ghl.status,
            kitStatus: kit.ok ? "synced" : kit.skipped ? "skipped" : "failed",
          },
        });
      } catch (error) {
        console.error("Erro ao registrar evento final da Ana:", error);
      }
    }

    if (ghlError) {
      return jsonResponse(
        {
          ...publicGhlError(ghlError),
          captured: true,
          sessionId,
          disposition,
          evaluation: publicEvaluation,
          integrations: { ghl: { status: "failed" }, kit },
        },
        502,
      );
    }


    if (handoffPersistenceError) {
      return jsonResponse(
        {
          ok: false,
          error: "O contato foi enviado ao CRM, mas a confirmação ainda está pendente. Tente novamente.",
          code: "handoff_persistence_pending",
          captured: true,
          sessionId,
          disposition,
          evaluation: publicEvaluation,
          integrations: { ghl, kit },
        },
        503,
      );
    }

    if (crmContactPersistenceError) {
      return jsonResponse(
        {
          ok: false,
          error: "O contato foi sincronizado com o CRM, mas a confirmação ainda está pendente. Tente novamente.",
          code: "crm_contact_persistence_pending",
          captured: true,
          sessionId,
          disposition,
          evaluation: publicEvaluation,
          integrations: { ghl, kit },
        },
        503,
      );
    }

    return jsonResponse({
      ok: true,
      captured: true,
      sessionId,
      disposition,
      evaluation: publicEvaluation,
      integrations: { ghl, kit },
    });
  };
}

export default createAnaLeadHandler();
