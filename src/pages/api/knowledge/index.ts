import type { APIRoute } from "astro";
import { handleListKnowledge } from "@/lib/okf/http";
import { knowledgeService } from "@/lib/okf/service";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handleListKnowledge(request, knowledgeService);
