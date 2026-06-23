import { persistLeadEvent } from "../src/lib/lead-scoring/store.js";
import { scoreLead } from "../src/lib/lead-scoring/engine.js";
import { isRdEnabled } from "../src/lib/rd-station-events.js";

export const config = { runtime: "edge" };

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clean(value) {
  return String(value || "").trim();
}

function cleanSecret(value) {
  return clean(value)
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function buildTags(body) {
  const result = body.result || {};
  const scoring = body.leadScoring || {};
  const tags = ["ebook_nexialista"];

  if (clean(body.formStatus) === "in_progress") tags.push("diagnostico_nexialista_iniciado");
  if (clean(body.formStatus) !== "in_progress") tags.push("diagnostico_nexialista_concluido");
  if (result.creditTag) tags.push(result.creditTag);
  if (Number(result.score || 0) >= 70) tags.push("icp_forte");
  if (clean(body.diagnosisInterest) === "sim") tags.push("interesse_diagnostico");
  if (scoring.leadStage) tags.push(scoring.leadStage);
  if (Array.isArray(scoring.tags)) tags.push(...scoring.tags);

  return [...new Set(tags.filter(Boolean))];
}

function buildBio(body) {
  const result = body.result || {};
  return [
    clean(body.formStatus) === "in_progress"
      ? "Lead iniciou o diagnóstico Nexialista."
      : "Lead concluiu o diagnóstico Nexialista.",
    `Etapa concluída: ${clean(body.completedStep) || "final"}`,
    `Score Nexialista: ${clean(result.score)}`,
    `Lead score total: ${clean(body.leadScoring?.totalScore)}`,
    `Fit score: ${clean(body.leadScoring?.fitScore)}`,
    `Intent score: ${clean(body.leadScoring?.intentScore)}`,
    `Maturity score: ${clean(body.leadScoring?.maturityScore)}`,
    `Engagement score: ${clean(body.leadScoring?.engagementScore)}`,
    `Estágio comercial: ${clean(body.leadScoring?.leadStage)}`,
    `Motivo do score: ${clean(body.leadScoring?.scoreReason)}`,
    `Nível Nexialista: ${clean(result.level)}`,
    `Incentivo aplicado: ${clean(result.label)}`,
    `Preço final: ${clean(result.price)}`,
    `Leitura do diagnóstico: ${clean(result.copy)}`,
    `Cargo: ${clean(body.role)}`,
    `Empresa: ${clean(body.company)}`,
    `Colaboradores: ${clean(body.companySize)}`,
    `Segmento: ${clean(body.segment)}`,
    `Desafio de negócio: ${clean(body.businessChallenge)}`,
    `Uso atual de IA: ${clean(body.aiUsage)}`,
    `Maturidade em IA: ${clean(body.aiMaturity)}`,
    `Investimento em IA: ${clean(body.aiInvestment)}`,
    `Consultoria/programa anterior: ${clean(body.aiConsulting)}`,
    `Próximo passo em IA: ${clean(body.aiNextStep)}`,
    `Interesse em diagnóstico: ${clean(body.diagnosisInterest)}`,
  ].join("\n");
}

function buildContactPayload(body, includeEmail = true) {
  const result = body.result || {};
  const payload = {
    name: clean(body.name),
    mobile_phone: clean(body.phone),
    tags: buildTags(body),
    legal_bases: [
      {
        category: "communications",
        type: "consent",
        status: "granted",
      },
    ],
    cf_cargo: clean(body.role),
    cf_empresa: clean(body.company),
    cf_numero_colaboradores: clean(body.companySize),
    cf_segmento: clean(body.segment),
    cf_desafio_negocio: clean(body.businessChallenge),
    cf_uso_ia_atual: clean(body.aiUsage),
    cf_maturidade_ia: clean(body.aiMaturity),
    cf_investimento_ia: clean(body.aiInvestment),
    cf_consultoria_ia_anterior: clean(body.aiConsulting),
    cf_proximo_passo_ia: clean(body.aiNextStep),
    cf_score_nexialista: clean(result.score),
    cf_nivel_nexialista: clean(result.level),
    cf_incentivo_nexialista: clean(result.label),
    cf_preco_final_nexialista: clean(result.price),
    cf_lead_score_total: clean(body.leadScoring?.totalScore),
    cf_fit_score: clean(body.leadScoring?.fitScore),
    cf_intent_score: clean(body.leadScoring?.intentScore),
    cf_maturity_score: clean(body.leadScoring?.maturityScore),
    cf_engagement_score: clean(body.leadScoring?.engagementScore),
    cf_lead_stage: clean(body.leadScoring?.leadStage),
    bio: buildBio(body),
  };

  if (includeEmail) {
    payload.email = clean(body.email).toLowerCase();
  }

  return payload;
}

function buildFallbackContactPayload(body, includeEmail = true) {
  const payload = {
    name: clean(body.name),
    mobile_phone: clean(body.phone),
    tags: buildTags(body),
    legal_bases: [
      {
        category: "communications",
        type: "consent",
        status: "granted",
      },
    ],
    bio: buildBio(body),
  };

  if (includeEmail) {
    payload.email = clean(body.email).toLowerCase();
  }

  return payload;
}

function buildConversionPayload(body) {
  const result = body.result || {};
  const isInProgress = clean(body.formStatus) === "in_progress";

  return {
    event_type: "CONVERSION",
    event_family: "CDP",
    payload: {
      conversion_identifier: isInProgress
        ? "Diagnóstico Nexialista iniciado"
        : "Diagnóstico Nexialista concluído",
      name: clean(body.name),
      email: clean(body.email).toLowerCase(),
      mobile_phone: clean(body.phone),
      company_name: clean(body.company),
      tags: buildTags(body),
      cf_cargo: clean(body.role),
      cf_empresa: clean(body.company),
      cf_numero_colaboradores: clean(body.companySize),
      cf_segmento: clean(body.segment),
      cf_desafio_negocio: clean(body.businessChallenge),
      cf_uso_ia_atual: clean(body.aiUsage),
      cf_maturidade_ia: clean(body.aiMaturity),
      cf_investimento_ia: clean(body.aiInvestment),
      cf_consultoria_ia_anterior: clean(body.aiConsulting),
      cf_proximo_passo_ia: clean(body.aiNextStep),
      cf_score_nexialista: clean(result.score),
      cf_nivel_nexialista: clean(result.level),
      cf_incentivo_nexialista: clean(result.label),
      cf_preco_final_nexialista: clean(result.price),
      cf_lead_score_total: clean(body.leadScoring?.totalScore),
      cf_fit_score: clean(body.leadScoring?.fitScore),
      cf_intent_score: clean(body.leadScoring?.intentScore),
      cf_maturity_score: clean(body.leadScoring?.maturityScore),
      cf_engagement_score: clean(body.leadScoring?.engagementScore),
      cf_lead_stage: clean(body.leadScoring?.leadStage),
      cf_status_diagnostico_nexialista: isInProgress ? "Em andamento" : "Concluído",
      cf_etapa_diagnostico_nexialista: clean(body.completedStep) || "final",
      cf_resumo_diagnostico_nexialista: buildBio(body),
    },
  };
}

function getConversionApiKeys() {
  return [cleanSecret(process.env.RD_TOKEN_PRIVADO), cleanSecret(process.env.RD_TOKEN_PUBLICO)].filter(
    (token, index, tokens) => token && tokens.indexOf(token) === index
  );
}

async function sendToRdStation(path, method, payload) {
  const token = cleanSecret(process.env.RD_TOKEN_PRIVADO);
  if (!token) {
    throw new Error("RD_TOKEN_PRIVADO não configurado.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(`https://api.rd.services${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseBody = {};

    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      responseBody = { raw: responseText };
    }

    return {
      ok: response.ok,
      status: response.status,
      body: responseBody,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendRdConversion(apiKey, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(
      `https://api.rd.services/platform/conversions?api_key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const responseText = await response.text();
    let responseBody = {};

    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      responseBody = { raw: responseText };
    }

    return {
      ok: response.ok,
      status: response.status,
      body: responseBody,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isDuplicateEmailError(result) {
  const body = JSON.stringify(result.body || {});
  return result.status === 400 && body.includes("EMAIL_ALREADY_IN_USE");
}

async function persistContact(email, body, payloadBuilder) {
  const createResult = await sendToRdStation("/platform/contacts", "POST", payloadBuilder({ ...body, email }));

  if (createResult.ok) {
    return { ok: true, mode: "created" };
  }

  if (isDuplicateEmailError(createResult)) {
    const updateResult = await sendToRdStation(
      `/platform/contacts/email:${encodeURIComponent(email)}`,
      "PATCH",
      payloadBuilder({ ...body, email }, false)
    );

    if (updateResult.ok) {
      return { ok: true, mode: "updated" };
    }

    return {
      ok: false,
      error: "RD Station não atualizou o contato.",
      result: updateResult,
    };
  }

  return {
    ok: false,
    error: "RD Station não criou o contato.",
    result: createResult,
  };
}

async function persistConversion(body) {
  const apiKeys = getConversionApiKeys();

  if (!apiKeys.length) {
    return {
      ok: false,
      error: "RD_TOKEN_PRIVADO ou RD_TOKEN_PUBLICO não configurado.",
      result: { status: 500, body: {} },
    };
  }

  let lastResult = null;

  for (const apiKey of apiKeys) {
    const result = await sendRdConversion(apiKey, buildConversionPayload(body));
    lastResult = result;

    if (result.ok) {
      return { ok: true, mode: "conversion" };
    }
  }

  return {
    ok: false,
    error: "RD Station não registrou a conversão.",
    result: lastResult || { status: 500, body: {} },
  };
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  let body;

  try {
    body = await request.json();
  } catch (_error) {
    return jsonResponse({ error: "Payload JSON inválido." }, 400);
  }

  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();

  if (!name || !isEmail(email)) {
    return jsonResponse({ error: "Nome e email válido são obrigatórios." }, 400);
  }

  try {
    const scoring = scoreLead({ ...body, email, source: "nexialista" }, { source: "nexialista" });
    const enrichedBody = { ...body, email, source: "nexialista", leadScoring: scoring };
    let databasePersist = { ok: false, skipped: true };

    try {
      databasePersist = await persistLeadEvent(enrichedBody, { source: "nexialista" });
    } catch (databaseError) {
      databasePersist = { ok: false, error: databaseError.message };
    }

    if (!isRdEnabled()) {
      return jsonResponse({ ok: true, mode: "kit", payload: "kit_v4", leadScoring: scoring, database: databasePersist });
    }

    const richPersist = await persistContact(email, enrichedBody, buildContactPayload);

    if (richPersist.ok) {
      return jsonResponse({ ok: true, mode: richPersist.mode, payload: "custom_fields", leadScoring: scoring, database: databasePersist });
    }

    const fallbackPersist = await persistContact(email, enrichedBody, buildFallbackContactPayload);

    if (fallbackPersist.ok) {
      return jsonResponse({ ok: true, mode: fallbackPersist.mode, payload: "fallback_bio", leadScoring: scoring, database: databasePersist });
    }

    const conversionPersist = await persistConversion(enrichedBody);

    if (conversionPersist.ok) {
      return jsonResponse({ ok: true, mode: conversionPersist.mode, payload: "conversion_api_key", leadScoring: scoring, database: databasePersist });
    }

    return jsonResponse(
      { error: conversionPersist.error, details: conversionPersist.result.body, leadScoring: scoring, database: databasePersist },
      conversionPersist.result.status || 500
    );
  } catch (error) {
    return jsonResponse({ error: error.message || "Erro ao criar lead no RD Station." }, 500);
  }
}
