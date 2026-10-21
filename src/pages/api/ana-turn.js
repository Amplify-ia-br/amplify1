import handler from "../../../api/ana-turn.js";

export const prerender = false;

function syncServerEnv() {
  const keys = [
    "DATABASE_URL",
    "ANA_ALLOW_STATE_FALLBACK",
    "ANA_INTERNAL_ENRICHMENT_TOKEN",
  ];
  for (const key of keys) {
    if (!process.env[key] && import.meta.env?.[key]) process.env[key] = import.meta.env[key];
  }
}

export async function POST({ request }) {
  syncServerEnv();
  return handler(request);
}
