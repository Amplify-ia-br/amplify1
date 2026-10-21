import {
  ANA_REGION_TAGS,
  type AnaRegionTag,
} from "./types.js";

const NORTHEAST = new Set(["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"]);
const SOUTH_WITH_ES = new Set(["PR", "SC", "RS", "ES"]);
const BRAZILIAN_STATE_CODES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

const STATE_NAMES: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

// Removed during reconciliation so contacts using the former name are migrated.
export const LEGACY_ANA_REGION_TAGS = ["ana-region-sul-es"] as const;

export const MANAGED_ANA_REGION_TAGS = [
  ...ANA_REGION_TAGS,
  ...LEGACY_ANA_REGION_TAGS,
] as const;

export function normalizeBrazilianState(value?: string): string {
  const normalized = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!normalized) return "";
  if (/^[a-z]{2}$/.test(normalized)) {
    const code = normalized.toUpperCase();
    return BRAZILIAN_STATE_CODES.has(code) ? code : "";
  }
  return STATE_NAMES[normalized] || "";
}

export function regionalTagForState(value?: string): AnaRegionTag | null {
  const state = normalizeBrazilianState(value);
  if (NORTHEAST.has(state)) return "ana-region-nordeste";
  if (state === "SP") return "ana-region-sp";
  if (state === "DF") return "ana-region-df";
  if (SOUTH_WITH_ES.has(state)) return "ana-region-sul";
  return null;
}
