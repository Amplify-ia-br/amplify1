import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const compiled = JSON.parse(fs.readFileSync(path.join(root, "tmp/hunter-enrichment-compiled.json"), "utf8"));
const progress = JSON.parse(fs.readFileSync(path.join(root, "tmp/hunter-enrichment-progress.json"), "utf8"));
const outputDir = path.join(root, "outputs/amplify-day-hunter-20260915/imports");
fs.mkdirSync(outputDir, { recursive: true });

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeInstitution = (value) => String(value || "").trim().toLocaleLowerCase("pt-BR");
const clean = (value) => String(value || "").trim();
const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const writeCsv = (filename, rows) => {
  const headers = ["first_name", "last_name", "email", "company", "position", "website", "segment", "source_status"];
  const body = [headers, ...rows.map((row) => headers.map((header) => row[header] || ""))]
    .map((row) => row.map(quote).join(","))
    .join("\n");
  fs.writeFileSync(path.join(outputDir, filename), `${body}\n`, "utf8");
};

const splitName = (value) => {
  const parts = clean(value).split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "", last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
};

const historyRows = progress.sent_history
  .map((row) => ({ ...row, email: normalizeEmail(row.recipient_email) }))
  .filter((row) => row.email);
const historyEmails = new Set(historyRows.map((row) => row.email));

const personalAll = compiled.selected
  .filter((row) => row.classification === "Aprovado")
  .map((row) => ({ ...row, email: normalizeEmail(row.email) }))
  .filter((row) => row.email);
const personalEmails = new Set(personalAll.map((row) => row.email));
const personalNew = personalAll.filter((row) => !historyEmails.has(row.email));
const personalInstitutionKeys = new Set(
  personalNew.flatMap((row) => (row.associated_institutions?.length ? row.associated_institutions : [row.institution]))
    .map(normalizeInstitution),
);

const institutionalNew = [];
const seenInstitutionalEmails = new Set();
for (const row of compiled.institutional_channels) {
  const email = normalizeEmail(row.email);
  if (!email || historyEmails.has(email) || personalEmails.has(email) || seenInstitutionalEmails.has(email)) continue;
  seenInstitutionalEmails.add(email);
  institutionalNew.push({ ...row, email });
}

const genericEligible = institutionalNew.filter((row) => !personalInstitutionKeys.has(normalizeInstitution(row.institution)));
const genericByInstitution = new Map();
for (const row of genericEligible) {
  const key = normalizeInstitution(row.institution);
  if (!genericByInstitution.has(key)) genericByInstitution.set(key, []);
  genericByInstitution.get(key).push(row);
}
for (const rows of genericByInstitution.values()) {
  rows.sort((a, b) => Number(a.priority ?? 99) - Number(b.priority ?? 99) || a.email.localeCompare(b.email));
}
const institutionalPrimary = [...genericByInstitution.values()].map((rows) => rows[0]);
const primaryEmails = new Set(institutionalPrimary.map((row) => row.email));
const institutionalReserve = institutionalNew.filter((row) => !primaryEmails.has(row.email));

const personalCsvRows = personalNew.map((row) => ({
  ...splitName(row.name),
  email: row.email,
  company: clean(row.institution),
  position: clean(row.role),
  website: row.domain ? `https://${row.domain}` : "",
  segment: "AD26_PESSOAS_NOVAS",
  source_status: clean(row.verification),
}));

const channelToCsv = (row, segment) => ({
  first_name: "",
  last_name: "",
  email: row.email,
  company: clean(row.institution),
  position: "Canal institucional",
  website: row.domain_check?.domain ? `https://${row.domain_check.domain}` : "",
  segment,
  source_status: clean(row.channel_type || row.domain_check?.status || "canal institucional"),
});

const institutionalPrimaryCsvRows = institutionalPrimary.map((row) => channelToCsv(row, "AD26_INSTITUICOES_PRINCIPAIS"));
const institutionalReserveCsvRows = institutionalReserve.map((row) => channelToCsv(row, "AD26_RESERVA_INSTITUCIONAL"));
const historyCsvRows = historyRows.map((row) => ({
  ...splitName(row.recipient_name),
  email: row.email,
  company: clean(row.company),
  position: clean(row.role),
  website: "",
  segment: "AD26_HISTORICO_15_09_NAO_REENVIAR",
  source_status: clean(row.status || "historico"),
}));

writeCsv("01-ad26-pessoas-novas-76.csv", personalCsvRows);
writeCsv("02-ad26-instituicoes-principais-66.csv", institutionalPrimaryCsvRows);
writeCsv("03-ad26-reserva-institucional-74.csv", institutionalReserveCsvRows);
writeCsv("04-ad26-historico-15-09-nao-reenviar-100.csv", historyCsvRows);

const sets = [personalCsvRows, institutionalPrimaryCsvRows, institutionalReserveCsvRows, historyCsvRows]
  .map((rows) => new Set(rows.map((row) => row.email)));
const union = new Set(sets.flatMap((set) => [...set]));
const overlapCount = sets.reduce((count, set, index) => {
  const previous = new Set(sets.slice(0, index).flatMap((item) => [...item]));
  return count + [...set].filter((email) => previous.has(email)).length;
}, 0);

const summary = {
  generated_at: new Date().toISOString(),
  personal_new: personalCsvRows.length,
  institutional_primary: institutionalPrimaryCsvRows.length,
  institutional_reserve: institutionalReserveCsvRows.length,
  historical_do_not_resend: historyCsvRows.length,
  unique_total: union.size,
  overlap_count: overlapCount,
  sending_authorized: false,
};
fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

if (summary.personal_new !== 76) throw new Error(`Esperados 76 contatos pessoais novos; encontrados ${summary.personal_new}.`);
if (summary.institutional_primary !== 66) throw new Error(`Esperados 66 canais institucionais principais; encontrados ${summary.institutional_primary}.`);
if (summary.institutional_reserve !== 74) throw new Error(`Esperados 74 canais de reserva; encontrados ${summary.institutional_reserve}.`);
if (summary.historical_do_not_resend !== 100) throw new Error(`Esperados 100 contatos históricos; encontrados ${summary.historical_do_not_resend}.`);
if (summary.unique_total !== 316 || summary.overlap_count !== 0) throw new Error("A deduplicação final não fechou em 316 endereços únicos.");

console.log(JSON.stringify(summary, null, 2));
