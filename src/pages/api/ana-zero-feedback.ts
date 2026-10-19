import type { APIRoute } from "astro";
import { scheduleAutomaticAnalysis } from "@/lib/ana-zero/automatic-analysis";
import { handleAnaZeroFeedback } from "@/lib/ana-zero/feedback-http";

export const prerender = false;

export const POST: APIRoute = ({ request }) =>
  handleAnaZeroFeedback(request, undefined, undefined, scheduleAutomaticAnalysis);
