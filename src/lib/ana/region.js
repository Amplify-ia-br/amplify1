const UF_BY_NAME = Object.freeze({
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  brasilia: "DF",
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
});

const VALID_UFS = new Set(Object.values(UF_BY_NAME));

export const REGION_TAGS = Object.freeze({
  northeast: "ana-region-nordeste",
  saoPaulo: "ana-region-sp",
  distritoFederal: "ana-region-df",
  south: "ana-region-sul",
});

const NORTHEAST_UFS = new Set(["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"]);
const SOUTH_SALES_UFS = new Set(["PR", "SC", "RS", "ES"]);

function removeDiacritics(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalizes a Brazilian state name or abbreviation to its two-letter UF.
 * Returns an empty string for absent or unsupported values.
 */
export function normalizeUf(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const upper = raw.toUpperCase();
  if (VALID_UFS.has(upper)) return upper;

  const normalizedName = removeDiacritics(raw)
    .toLowerCase()
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (UF_BY_NAME[normalizedName]) return UF_BY_NAME[normalizedName];

  const trailingUf = upper.match(/(?:^|[-/,\s])([A-Z]{2})\s*$/)?.[1];
  return trailingUf && VALID_UFS.has(trailingUf) ? trailingUf : "";
}

/**
 * Maps a UF to the regional tag consumed by the GoHighLevel workflow.
 * `null` means the national fallback route (or an invalid/missing UF).
 * ES intentionally shares the commercial "Sul" route.
 */
export function mapRegionTag(value) {
  const uf = normalizeUf(value);
  if (!uf) return null;
  if (NORTHEAST_UFS.has(uf)) return REGION_TAGS.northeast;
  if (uf === "SP") return REGION_TAGS.saoPaulo;
  if (uf === "DF") return REGION_TAGS.distritoFederal;
  if (SOUTH_SALES_UFS.has(uf)) return REGION_TAGS.south;
  return null;
}

