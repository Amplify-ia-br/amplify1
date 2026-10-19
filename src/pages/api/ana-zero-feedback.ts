import type { APIRoute } from "astro";
import { handleAnaZeroFeedback } from "@/lib/ana-zero/feedback-http";

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleAnaZeroFeedback(request);
