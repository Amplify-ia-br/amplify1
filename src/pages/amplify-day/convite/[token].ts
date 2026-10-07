import type { APIRoute } from "astro";
import html from "@/lib/amplify-day/lp.html?raw";
import { renderInvitationHtml } from "@/lib/amplify-day/lp-template";
import { resolveInvitation } from "@/lib/amplify-day/invitations.js";

export const prerender = false;

const previewInvitation = {
  guest_name: "Leonardo Camacho",
  guest_email: "convidada@empresa.com",
  guest_company: "Empresa",
  guest_role: "Liderança",
  personal_message: "Sua experiência pode enriquecer muito essa conversa. Esperamos encontrar você em Brasília.",
  code: "AMP-PREV26",
  status: "visited",
  preview_mode: true,
  inviter: {
    name: "Gilson Leal",
    role: "CEO",
    company: "Shock Wave Academy",
  },
};

export const GET: APIRoute = async ({ params }) => {
  const token = params.token || "";
  let resolved: any;
  if (token === "preview-pareamento" && process.env.VERCEL_ENV !== "production") {
    resolved = { ok: true, invitation: previewInvitation };
  } else {
    try {
      resolved = await resolveInvitation(token, { markVisited: true });
    } catch {
      resolved = { ok: false, reason: "invalid" };
    }
  }

  return new Response(renderInvitationHtml(html, resolved, token), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
};
