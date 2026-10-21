import handler from "../../../api/ana-enrichment.js";

export const prerender = false;

function syncServerEnv() {
  const keys = [
    "DATABASE_URL",
    "ANA_INTERNAL_ENRICHMENT_TOKEN",
    "ANA_GHL_SYNC_ENABLED",
    "GHL_PRIVATE_INTEGRATION_TOKEN",
    "GHL_LOCATION_ID",
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
