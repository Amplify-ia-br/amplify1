import type { APIRoute } from "astro";
import { buildOpenInvitationLink } from "@/lib/amplify-day/mailer.js";

export const prerender = false;

export const GET: APIRoute = ({ redirect, url }) => {
  // This is a public short link. Do not derive its destination from the
  // adapter request origin: Vercel's Astro runtime may expose that as
  // `http://localhost` behind the proxy.
  const destination = new URL(
    buildOpenInvitationLink("https://amplify.ia.br/amplify-day", "teia"),
  );

  // Preserve optional per-convidador attribution without exposing personal data.
  const inviter = url.searchParams.get("convidador");
  if (inviter) destination.searchParams.set("utm_term", inviter.slice(0, 80));

  return redirect(destination.toString(), 302);
};
