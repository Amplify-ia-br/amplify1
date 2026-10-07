import { isValidEmail, normalizeEmail } from "./invitations.js";
import { getPreferredName } from "./personalization.js";

export const GILSON_CAMPAIGN_KEY = "amplify-day-2026-palco-amplify-gilson";
export const GILSON_CAMPAIGN_EXPECTED = Object.freeze({
  nominal: 19,
  institutional: 148,
  blocked: 0,
  missingEmail: 72,
  ready: 167,
});

const NOMINAL_EMAIL_TYPES = new Set([
  "profissional nominal publicado",
  "profissional nominal publico",
  "profissional nominal publicado no canal do cargo",
]);

function clean(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalize(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function toSourceRecord(row, indexes, fallbackId) {
  const at = (key) => clean(row[indexes[key]]);
  return {
    sourceId: at("sourceId") || fallbackId,
    recordType: at("recordType"),
    name: at("name"),
    role: at("role"),
    company: at("company"),
    email: normalizeEmail(at("email")),
    emailType: at("emailType"),
    priority: at("priority"),
  };
}

export function classifyGilsonCampaignCsv(text) {
  const rows = parseCsvRows(text);
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalize(cell) === "nome do convidado"));
  if (headerIndex < 0) throw new Error("Cabeçalho da base de prospecção não encontrado.");
  const headers = rows[headerIndex].map(normalize);
  const required = {
    sourceId: "id",
    recordType: "tipo de registro",
    name: "nome do convidado",
    role: "cargo / alvo",
    company: "escola / instituicao",
    email: "e-mail publicado",
    emailType: "tipo de e-mail",
    priority: "prioridade",
  };
  const indexes = Object.fromEntries(Object.entries(required).map(([key, label]) => [key, headers.indexOf(label)]));
  const missing = Object.entries(indexes).filter(([, index]) => index < 0).map(([key]) => key);
  if (missing.length) throw new Error(`A base não contém as colunas necessárias: ${missing.join(", ")}.`);

  const source = rows.slice(headerIndex + 1)
    .filter((row) => row.some((cell) => clean(cell)))
    .map((row, index) => toSourceRecord(row, indexes, `linha-${headerIndex + index + 2}`));
  const missingEmail = source.filter((record) => !record.email || !isValidEmail(record.email));
  const byEmail = new Map();
  for (const record of source.filter((item) => item.email && isValidEmail(item.email))) {
    const group = byEmail.get(record.email) || [];
    group.push(record);
    byEmail.set(record.email, group);
  }

  const recipients = [];
  for (const [email, group] of byEmail) {
    const nominalCandidates = group.filter((record) =>
      normalize(record.recordType) === "pessoa identificada"
      && getPreferredName(record.name)
      && NOMINAL_EMAIL_TYPES.has(normalize(record.emailType)),
    );
    const nominalNames = new Set(nominalCandidates.map((record) => normalize(record.name)));
    if (nominalCandidates.length && nominalNames.size === 1) {
      const record = nominalCandidates[0];
      recipients.push({
        type: "nominal", status: "ready", email, name: record.name, company: record.company,
        role: record.role, sourceIds: group.map((item) => item.sourceId), sourceRecords: group,
      });
      continue;
    }
    const institutional = group.every((record) => normalize(record.recordType) === "canal institucional" || !record.name);
    if (institutional) {
      const record = group[0];
      recipients.push({
        type: "institutional", status: "ready", email, name: null, company: record.company,
        role: record.role, sourceIds: group.map((item) => item.sourceId), sourceRecords: group,
      });
      continue;
    }
    // Caixas de cargo, secretaria ou compartilhadas entram no fluxo geral.
    // Nunca usamos o nome associado a esses endereços nem geramos LP nominal.
    const record = group[0];
    recipients.push({
      type: "institutional", status: "ready", email, name: null, company: record.company,
      role: record.role, sourceIds: group.map((item) => item.sourceId), sourceRecords: group,
    });
  }

  const counts = {
    nominal: recipients.filter((item) => item.type === "nominal").length,
    institutional: recipients.filter((item) => item.type === "institutional").length,
    blocked: recipients.filter((item) => item.type === "blocked").length,
    missingEmail: missingEmail.length,
  };
  counts.ready = counts.nominal + counts.institutional;
  return { source, recipients, missingEmail, counts };
}

export function assertGilsonCampaignCounts(counts) {
  for (const [key, expected] of Object.entries(GILSON_CAMPAIGN_EXPECTED)) {
    if (counts[key] !== expected) throw new Error(`Contagem inesperada em ${key}: ${counts[key]} (esperado ${expected}).`);
  }
}
