export const AMPLIFY_DAY_STAGE_AMPLIFY = "amplify";
export const AMPLIFY_DAY_STAGE_TEIA = "teia";

export const AMPLIFY_DAY_STAGES = Object.freeze({
  [AMPLIFY_DAY_STAGE_AMPLIFY]: {
    value: AMPLIFY_DAY_STAGE_AMPLIFY,
    label: "Palco Amplify",
    tag: "amplify-day-2026-palco-amplify",
  },
  [AMPLIFY_DAY_STAGE_TEIA]: {
    value: AMPLIFY_DAY_STAGE_TEIA,
    label: "Palco TEIA",
    tag: "amplify-day-2026-palco-teia",
  },
});

export function normalizeAmplifyDayStage(value, fallback = AMPLIFY_DAY_STAGE_AMPLIFY) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === AMPLIFY_DAY_STAGE_TEIA || normalized === "palco teia") return AMPLIFY_DAY_STAGE_TEIA;
  if (normalized === AMPLIFY_DAY_STAGE_AMPLIFY || normalized === "palco amplify") return AMPLIFY_DAY_STAGE_AMPLIFY;
  return fallback;
}

export function isValidAmplifyDayStage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === AMPLIFY_DAY_STAGE_AMPLIFY || normalized === AMPLIFY_DAY_STAGE_TEIA;
}

export function getAmplifyDayStage(value) {
  return AMPLIFY_DAY_STAGES[normalizeAmplifyDayStage(value)];
}

export function getAmplifyDayStageLabel(value) {
  return getAmplifyDayStage(value).label;
}

export function getAmplifyDayStageTag(value) {
  return getAmplifyDayStage(value).tag;
}

export function detectAmplifyDayStageFromTracking(value) {
  let params;
  try {
    if (value instanceof URLSearchParams) params = value;
    else if (value instanceof URL) params = value.searchParams;
    else params = new URL(String(value || ""), "https://amplify.ia.br").searchParams;
  } catch (_error) {
    return null;
  }

  const explicitStage = params.get("palco") || params.get("target_stage");
  if (isValidAmplifyDayStage(explicitStage)) return normalizeAmplifyDayStage(explicitStage);

  const attribution = [
    params.get("utm_campaign"),
    params.get("utm_content"),
    params.get("utm_term"),
  ].filter(Boolean).join(" ").toLowerCase().replace(/[-_]+/g, " ");

  if (/\bpalco\s+teia\b|\bteia\b/.test(attribution)) return AMPLIFY_DAY_STAGE_TEIA;
  if (/\bpalco\s+amplify\b/.test(attribution)) return AMPLIFY_DAY_STAGE_AMPLIFY;
  return null;
}
