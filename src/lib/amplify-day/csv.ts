export interface InvitationCsvRow {
  name: string;
  email: string;
  company: string;
  role: string;
  personalMessage: string;
}

const HEADER_ALIASES: Record<keyof InvitationCsvRow, string[]> = {
  name: ["nome", "name"],
  email: ["email", "e-mail"],
  company: ["empresa", "company", "organizacao", "organização"],
  role: ["cargo", "role"],
  personalMessage: ["mensagem_pessoal", "mensagem pessoal", "mensagem", "personal_message"],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function parseLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  cells.push(value.trim());
  return cells;
}

function findColumn(headers: string[], key: keyof InvitationCsvRow) {
  return headers.findIndex((header) => HEADER_ALIASES[key].includes(header));
}

export function parseInvitationCsv(content: string): InvitationCsvRow[] {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("O CSV precisa ter cabeçalho e pelo menos um convidado.");
  const delimiter = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ";" : ",";
  const headers = parseLine(lines[0], delimiter).map(normalizeHeader);
  const indexes = {
    name: findColumn(headers, "name"),
    email: findColumn(headers, "email"),
    company: findColumn(headers, "company"),
    role: findColumn(headers, "role"),
    personalMessage: findColumn(headers, "personalMessage"),
  };
  const required = ["name", "email", "company", "role"] as const;
  const missing = required.filter((key) => indexes[key] < 0);
  if (missing.length) throw new Error("Use as colunas: nome, email, empresa, cargo e mensagem_pessoal.");

  return lines.slice(1).map((line, index) => {
    const cells = parseLine(line, delimiter);
    const row = {
      name: cells[indexes.name]?.trim() || "",
      email: cells[indexes.email]?.trim().toLowerCase() || "",
      company: cells[indexes.company]?.trim() || "",
      role: cells[indexes.role]?.trim() || "",
      personalMessage: indexes.personalMessage >= 0 ? cells[indexes.personalMessage]?.trim() || "" : "",
    };
    if (!row.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || !row.company || !row.role) {
      throw new Error(`Linha ${index + 2} contém dados obrigatórios inválidos.`);
    }
    return row;
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function serializeInvitationPackage(rows: Array<Record<string, unknown>>) {
  const headers = ["nome", "email", "empresa", "cargo", "codigo", "link", "assunto", "mensagem", "status"];
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => [
      row.guest_name,
      row.guest_email,
      row.guest_company,
      row.guest_role,
      row.code,
      row.link,
      row.subject,
      row.message,
      row.status,
    ].map(csvCell).join(",")),
  ].join("\n");
}
