import { runDueNexialistaEmails } from "../../src/lib/nexialista-email-automation/store.js";

function sendJson(response, payload, status = 200) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function cleanSecret(value) {
  return String(value || "").replace(/^['"]|['"]$/g, "").trim();
}

function isAuthorized(request) {
  const cronSecret = cleanSecret(process.env.CRON_SECRET);
  if (!cronSecret) return true;
  const header = request.headers.authorization || request.headers.Authorization || "";
  return header === `Bearer ${cronSecret}`;
}

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "POST") {
    return sendJson(response, { error: "Método não permitido." }, 405);
  }

  if (!isAuthorized(request)) {
    return sendJson(response, { error: "Unauthorized" }, 401);
  }

  const limit = Number(new URL(request.url, "https://cron.local").searchParams.get("limit") || 20);
  const result = await runDueNexialistaEmails({ limit: Math.min(Math.max(limit, 1), 50) });
  return sendJson(response, result, result.ok ? 200 : 500);
}
