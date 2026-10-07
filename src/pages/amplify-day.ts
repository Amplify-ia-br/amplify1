import type { APIRoute } from "astro";
import html from "@/lib/amplify-day/lp.html?raw";
import { sanitizeAmplifyDayHtml } from "@/lib/amplify-day/lp-template";

export const prerender = false;

export const GET: APIRoute = () => new Response(sanitizeAmplifyDayHtml(html), {
  headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
  },
});
