import handler from "../../../api/ana-lead.js";

export const prerender = false;

function syncServerEnv() {
  const keys = [
    "DATABASE_URL",
    "KIT_API_KEY",
    "ANA_ALLOW_STATE_FALLBACK",
    "ANA_GHL_SYNC_ENABLED",
    "ANA_GHL_HANDOFF_ENABLED",
    "GHL_PRIVATE_INTEGRATION_TOKEN",
    "GHL_LOCATION_ID",
    "GHL_ANA_PIPELINE_ROUTES",
    "GHL_ANA_PIPELINE_ID",
    "GHL_ANA_PIPELINE_STAGE_ID",
    "GHL_PIPELINE_ID",
    "GHL_PIPELINE_STAGE_ID",
    "GHL_ANA_CUSTOM_FIELD_IDS",
  ];
  for (const key of keys) {
    if (!process.env[key] && import.meta.env?.[key]) process.env[key] = import.meta.env[key];
  }
}

export async function POST({ request }) {
  syncServerEnv();
  return handler(request);
}
