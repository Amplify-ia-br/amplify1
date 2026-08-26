import handler from "../../../api/amplify-day-lead.js";

export const prerender = false;

function syncServerEnv() {
  const keys = [
    "DATABASE_URL",
    "KIT_API_KEY",
    "AMPLIFY_DAY_ENV",
    "AMPLIFY_DAY_CAPTURE_MODE",
    "AMPLIFY_DAY_WHATSAPP_URL",
    "VERCEL_ENV",
  ];

  keys.forEach((key) => {
    if (!process.env[key] && import.meta.env?.[key]) {
      process.env[key] = import.meta.env[key];
    }
  });
}

export async function POST({ request }) {
  syncServerEnv();
  return handler(request);
}
