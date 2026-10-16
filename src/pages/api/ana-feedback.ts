import type { APIRoute } from "astro";
import { handleAnaFeedback } from "@/lib/ana/feedback";

export const prerender = false;

export const POST: APIRoute = ({ request }) => {
  if (!process.env.DATABASE_URL && import.meta.env.DATABASE_URL) {
    process.env.DATABASE_URL = import.meta.env.DATABASE_URL;
  }
  return handleAnaFeedback(request);
};
