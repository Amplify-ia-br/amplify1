import {
  QUALIFICATION_SCHEMA_VERSION,
  advanceQualification,
  createQualificationState,
  evaluateQualification,
  getNextQuestion,
} from "../src/lib/ana/qualification.js";
import {
  toPublicQualificationEvaluation,
  toPublicQualificationState,
} from "../src/lib/ana/public.js";
import { loadAnaSession, saveAnaSession } from "../src/lib/ana/store.js";
import { hasDatabaseUrl } from "../src/lib/lead-scoring/db.js";

export const config = { runtime: "edge" };

const MAX_BODY_BYTES = 128_000;
const MAX_HISTORY_ITEMS = 80;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{12,128}$/;
const INITIAL_CONTACT_FIELDS = Object.freeze([
  "name",
  "email",
  "phone",
  "organization_name",
  "website",
  "uf",
]);
const OUTBOUND_PREFILL_FIELDS = Object.freeze([
  "need",
  "scope",
  "organization_type",
  "organization_name",
  "website",
  "school_type",
  "school_initiative_type",
  "school_levels",
  "eligible_students",
  "tuition_band",
  "education_audience",
  "business_area",
  "government_level",
  "government_audience",
  "people_impacted",
  "ai_stage",
  "contact_role",
  "target_year",
  "timeline",
  "uf",
]);

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

function validSessionId(value) {
  return SESSION_ID_PATTERN.test(clean(value));
}

function comparable(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function newSessionId() {
  return crypto.randomUUID();
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

function hydrateState(value, defaults = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createQualificationState(defaults);
  }

  return createQualificationState({
    mode: value.mode ?? defaults.mode,
    channel: value.channel ?? defaults.channel,
    createdAt: value.createdAt,
    fields: value.fields && typeof value.fields === "object" ? value.fields : {},
    skippedFields: Array.isArray(value.skippedFields) ? value.skippedFields : [],
    attempts: value.attempts && typeof value.attempts === "object" ? value.attempts : {},
    history: Array.isArray(value.history) ? value.history.slice(-MAX_HISTORY_ITEMS) : [],
  });
}

function publicQuestion(question) {
  if (!question) return null;
  return {
    id: question.id,
    field: question.field,
    prompt: question.prompt,
    input: question.input,
    ...(Array.isArray(question.options) ? { options: question.options } : {}),
    canSkip: Boolean(question.canSkip),
  };
}

function publicResult(sessionId, state) {
  const evaluation = evaluateQualification(state);
  const question = getNextQuestion(state);
  return {
    ok: true,
    sessionId,
    state: toPublicQualificationState(state),
    evaluation: toPublicQualificationEvaluation(evaluation),
    question: publicQuestion(question),
    done: !question,
  };
}

function initialContactFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    INITIAL_CONTACT_FIELDS.flatMap((field) =>
      Object.hasOwn(value, field) ? [[field, value[field]]] : [],
    ),
  );
}

function allowedFields(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    fields.flatMap((field) => (Object.hasOwn(value, field) ? [[field, value[field]]] : [])),
  );
}

function outboundPrefill(request, body, env) {
  if (comparable(body.mode) !== "outbound") return {};
  const configuredToken = clean(env.ANA_INTERNAL_ENRICHMENT_TOKEN);
  if (!configuredToken) {
    const error = new Error("Pré-qualificação outbound indisponível.");
    error.status = 503;
    error.code = "outbound_prefill_unavailable";
    throw error;
  }
  if (!safeEqual(bearerToken(request), configuredToken)) {
    const error = new Error("Não autorizado para iniciar uma sessão outbound.");
    error.status = 401;
    error.code = "outbound_auth_failed";
    throw error;
  }
  return allowedFields(body.prequalification, OUTBOUND_PREFILL_FIELDS);
}

function allowsStatelessFallback(env) {
  if (clean(env.ANA_ALLOW_STATE_FALLBACK).toLowerCase() === "true") return true;
  return env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production";
}

function answerForQuestion(question, answer) {
  if (answer && typeof answer === "object" && !Array.isArray(answer)) {
    if (answer.skip === true) return { field: question.field, skip: true };
    if (Object.hasOwn(answer, "value")) return { field: question.field, value: answer.value };
  }
  return { field: question.field, value: answer };
}

function answerEventPayload(question, nextState) {
  const latest = nextState.history?.[nextState.history.length - 1] || {};
  return {
    schemaVersion: QUALIFICATION_SCHEMA_VERSION,
    field: question.field,
    action: latest.action || "answered",
    value: Object.hasOwn(nextState.fields || {}, question.field)
      ? nextState.fields[question.field]
      : null,
    errorCode: nextState.lastError?.code || null,
  };
}

export function createAnaTurnHandler(dependencies = {}) {
  const loadSession = dependencies.loadSession || loadAnaSession;
  const saveSession = dependencies.saveSession || saveAnaSession;
  const databaseAvailable = dependencies.hasDatabaseUrl || hasDatabaseUrl;
  const env = dependencies.env || process.env;

  return async function anaTurnHandler(request) {
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

    const action = clean(body.action).toLowerCase();
    if (action !== "start" && action !== "answer") {
      return jsonResponse({ ok: false, error: "action deve ser start ou answer." }, 400);
    }

    const persisted = Boolean(databaseAvailable());
    if (!persisted && !allowsStatelessFallback(env)) {
      return jsonResponse(
        {
          ok: false,
          error: "A qualificação está temporariamente indisponível.",
          code: "ana_store_unavailable",
        },
        503,
      );
    }

    try {
      if (action === "start") {
        const prefilled = outboundPrefill(request, body, env);
        const requestedId = validSessionId(body.sessionId) ? clean(body.sessionId) : null;
        const sessionId = requestedId || newSessionId();
        const row = persisted && requestedId ? await loadSession(sessionId) : null;
        const serverState = storedState(row);
        const fallbackState = !persisted ? body.state : null;
        const state = hydrateState(serverState || fallbackState, {
          mode: body.mode,
          channel: body.channel || "web",
          fields: { ...initialContactFields(body.contact), ...prefilled },
        });

        if (persisted) {
          await saveSession({
            sessionKey: sessionId,
            state,
            eventName: row ? "session_resumed" : "session_started",
            payload: {
              schemaVersion: QUALIFICATION_SCHEMA_VERSION,
              ...(Object.keys(prefilled).length ? { prefilledFields: Object.keys(prefilled) } : {}),
            },
          });
        }

        return jsonResponse(publicResult(sessionId, state));
      }

      const sessionId = clean(body.sessionId);
      if (!validSessionId(sessionId)) {
        return jsonResponse({ ok: false, error: "sessionId inválido." }, 400);
      }

      let state;
      if (persisted) {
        const row = await loadSession(sessionId);
        const serverState = storedState(row);
        if (!serverState) {
          return jsonResponse(
            { ok: false, error: "Sessão de qualificação não encontrada.", code: "session_not_found" },
            404,
          );
        }
        state = hydrateState(serverState);
      } else {
        if (!body.state || body.state.schemaVersion !== QUALIFICATION_SCHEMA_VERSION) {
          return jsonResponse(
            {
              ok: false,
              error: "O estado local da qualificação está ausente ou desatualizado.",
              code: "state_required",
            },
            409,
          );
        }
        state = hydrateState(body.state);
      }

      const question = getNextQuestion(state);
      if (!question) return jsonResponse(publicResult(sessionId, state));

      if (clean(body.questionId) !== question.id) {
        return jsonResponse(
          {
            ok: false,
            error: "A pergunta respondida não é a pergunta atual da sessão.",
            code: "stale_question",
            question: publicQuestion(question),
          },
          409,
        );
      }

      if (!Object.hasOwn(body, "answer")) {
        return jsonResponse({ ok: false, error: "answer é obrigatório." }, 400);
      }

      const nextState = advanceQualification(state, answerForQuestion(question, body.answer));
      if (persisted) {
        await saveSession({
          sessionKey: sessionId,
          state: nextState,
          eventName: "question_answered",
          payload: answerEventPayload(question, nextState),
        });
      }

      return jsonResponse(publicResult(sessionId, nextState));
    } catch (error) {
      if (error?.code === "outbound_auth_failed" || error?.code === "outbound_prefill_unavailable") {
        return jsonResponse(
          { ok: false, error: error.message, code: error.code },
          Number(error.status) || 503,
        );
      }
      console.error("Erro no fluxo de qualificação da Ana:", error);
      return jsonResponse(
        {
          ok: false,
          error: "Não foi possível salvar esta etapa da qualificação.",
          code: "qualification_error",
        },
        503,
      );
    }
  };
}

export default createAnaTurnHandler();
