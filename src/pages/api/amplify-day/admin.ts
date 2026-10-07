import type { APIRoute } from "astro";
import handler from "../../../../api/amplify-day-admin.js";

export const prerender = false;

function syncServerEnv() {
  [
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "AMPLIFY_DAY_TOKEN_SECRET",
    "AMPLIFY_DAY_SITE_URL",
    "RESEND_API_KEY",
    "AMPLIFY_DAY_EMAIL_FROM",
    "AMPLIFY_DAY_EMAIL_REPLY_TO",
  ].forEach((key) => {
    if (!process.env[key] && import.meta.env?.[key]) process.env[key] = import.meta.env[key];
  });
}

export const GET: APIRoute = async ({ request }) => {
  syncServerEnv();
  return handler(request);
};

export const POST: APIRoute = async ({ request }) => {
  syncServerEnv();
  return handler(request);
};
