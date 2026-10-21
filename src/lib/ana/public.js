import { INTERNAL_QUALIFICATION_FIELDS } from "./qualification.js";

const INTERNAL_FIELDS = new Set(INTERNAL_QUALIFICATION_FIELDS);

function publicFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).filter(([field]) => !INTERNAL_FIELDS.has(field)),
  );
}

export function toPublicQualificationState(state) {
  if (!state || typeof state !== "object") return state;
  return {
    ...state,
    fields: publicFields(state.fields),
    skippedFields: Array.isArray(state.skippedFields)
      ? state.skippedFields.filter((field) => !INTERNAL_FIELDS.has(field))
      : [],
    history: Array.isArray(state.history)
      ? state.history.filter((item) => !INTERNAL_FIELDS.has(item?.field))
      : [],
  };
}

export function toPublicQualificationEvaluation(evaluation) {
  if (!evaluation || typeof evaluation !== "object") return evaluation;
  return {
    schemaVersion: evaluation.schemaVersion,
    mode: evaluation.mode,
    cluster: evaluation.cluster,
    route: evaluation.route,
    regionTag: evaluation.regionTag,
    status: evaluation.status,
    completeness: evaluation.completeness,
  };
}
