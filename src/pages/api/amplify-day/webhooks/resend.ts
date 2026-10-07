import type { APIRoute } from "astro";
import handler from "../../../../../api/amplify-day-resend-webhook.js";

export const prerender = false;

function syncServerEnv() {
  [
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "AMPLIFY_DAY_TOKEN_SECRET",
    "RESEND_WEBHOOK_SECRET",
  ].forEach((key) => {
    if (!process.env[key] && import.meta.env?.[key]) process.env[key] = import.meta.env[key];
  });
}

export const POST: APIRoute = async ({ request }) => {
  syncServerEnv();
  return handler(request);
};
