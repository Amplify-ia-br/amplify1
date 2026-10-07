const HONORIFICS = new Set([
  "dr", "dra", "prof", "profa", "professor", "professora", "sr", "sra", "eng",
]);

const GENERIC_NAMES = new Set([
  "convidado", "convidada", "convidado exemplo", "convidada exemplo", "equipe", "equipe amplify",
]);

function clean(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeToken(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\.$/, "").toLowerCase();
}

export function isGenericPersonName(value) {
  return GENERIC_NAMES.has(normalizeToken(value));
}

export function getPreferredName(value) {
  const fullName = clean(value);
  if (!fullName || isGenericPersonName(fullName)) return "";
  const tokens = fullName.split(" ");
  while (tokens.length && HONORIFICS.has(normalizeToken(tokens[0]))) tokens.shift();
  return tokens[0] || "";
}

export function validatePersonName(value) {
  const fullName = clean(value);
  if (fullName.length < 2) return "Nome do convidado é obrigatório.";
  if (fullName.length > 160) return "Nome do convidado deve ter no máximo 160 caracteres.";
  if (!getPreferredName(fullName)) return "Informe o nome real do convidado; valores genéricos não são permitidos.";
  return null;
}

