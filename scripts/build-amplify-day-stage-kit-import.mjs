import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "outputs/amplify-day-hunter-20260915/imports");
const sources = [
  "01-ad26-pessoas-novas-76.csv",
  "02-ad26-instituicoes-principais-66.csv",
  "04-ad26-historico-15-09-nao-reenviar-100.csv",
];
const output = path.join(root, "outputs/amplify-day-hunter-20260915/kit-palco-amplify-mailing-trabalhado.csv");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const input = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(value); value = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function escapeCsv(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

const contacts = new Map();
for (const filename of sources) {
  const rows = parseCsv(fs.readFileSync(path.join(sourceDir, filename), "utf8"));
  const headers = rows.shift().map((header) => header.trim());
  for (const row of rows) {
    const record = Object.fromEntries(headers.map((header, index) => [header, String(row[index] || "").trim()]));
    const email = record.email.toLowerCase();
    if (!email || !email.includes("@")) continue;
    const existing = contacts.get(email) || {};
    contacts.set(email, {
      email,
      first_name: existing.first_name || record.first_name,
      last_name: existing.last_name || record.last_name,
      company: existing.company || record.company,
      position: existing.position || record.position,
      amplify_day_stage: "Palco Amplify",
      kit_tag: "amplify-day-2026-palco-amplify",
      source_files: [...new Set([...(existing.source_files || []), filename])],
    });
  }
}

const headers = ["email", "first_name", "last_name", "company", "position", "amplify_day_stage", "kit_tag", "source_files"];
const lines = [headers.map(escapeCsv).join(",")];
for (const contact of [...contacts.values()].sort((a, b) => a.email.localeCompare(b.email))) {
  lines.push(headers.map((header) => escapeCsv(header === "source_files" ? contact.source_files.join(" | ") : contact[header])).join(","));
}
fs.writeFileSync(output, `${lines.join("\n")}\n`);
console.log(JSON.stringify({ output, contacts: contacts.size, sources }, null, 2));
