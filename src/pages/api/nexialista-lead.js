import handler from "../../../api/nexialista-lead.js";

export const prerender = false;

function syncServerEnv() {
  const keys = ["DATABASE_URL", "KIT_API_KEY", "RD_ENABLED"];

  keys.forEach((key) => {
    if (!process.env[key] && import.meta.env?.[key]) {
      process.env[key] = import.meta.env?.[key];
    }
  });
}

export async function POST({ request }) {
  syncServerEnv();
  return handler(request);
}
