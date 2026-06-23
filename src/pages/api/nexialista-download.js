import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyAccessToken, verifyStripeSession } from "../../lib/nexialista-access-utils.js";
import { persistLeadEvent } from "../../lib/lead-scoring/store.js";

export const prerender = false;

const FILES = {
  pdf: {
    path: "profissional-nexialista.pdf",
    contentType: "application/pdf",
    filename: "profissional-nexialista.pdf",
  },
  epub: {
    path: "profissional-nexialista.epub",
    contentType: "application/epub+zip",
    filename: "profissional-nexialista.epub",
  },
};

function syncServerEnv() {
  const keys = ["NEXIALISTA_ACCESS_SECRET", "STRIPE_SECRET_KEY", "DATABASE_URL", "KIT_API_KEY"];

  keys.forEach((key) => {
    if (!process.env[key] && import.meta.env?.[key]) {
      process.env[key] = import.meta.env?.[key];
    }
  });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getAccessPayload(url) {
  const accessToken = url.searchParams.get("access_token");
  const tokenPayload = accessToken ? verifyAccessToken(accessToken) : null;
  if (tokenPayload) return { ok: true, email: tokenPayload.email, tier: tokenPayload.tier, accessType: "free" };

  const sessionId = url.searchParams.get("session_id");
  const stripeSession = sessionId ? await verifyStripeSession(sessionId) : null;
  if (stripeSession) {
    return {
      ok: true,
      email: stripeSession.customer_details?.email || stripeSession.customer_email || stripeSession.metadata?.email,
      name: stripeSession.metadata?.nome,
      tier: stripeSession.metadata?.tier,
      accessType: "paid",
      stripeSessionId: stripeSession.id,
    };
  }

  return { ok: false };
}

export async function GET({ request }) {
  syncServerEnv();

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "pdf";
  const file = FILES[format];

  if (!file) {
    return jsonResponse({ error: "Formato inválido." }, 400);
  }

  const access = await getAccessPayload(url);

  if (!access.ok) {
    return jsonResponse({ error: "Acesso não autorizado." }, 403);
  }

  await persistLeadEvent(
    {
      source: "nexialista",
      eventName: "nexialista_ebook_downloaded",
      formStatus: "ebook_downloaded",
      email: access.email,
      name: access.name,
      tier: access.tier,
      format,
      accessType: access.accessType,
      stripeSessionId: access.stripeSessionId,
      tags: ["ebook_baixado", access.accessType === "free" ? "acesso_gratuito_liberado" : "pagamento_concluido"],
    },
    { source: "nexialista" }
  ).catch(() => null);

  const filePath = join(process.cwd(), "private", "nexialista", file.path);
  const content = await readFile(filePath);

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
