import type { APIRoute } from "astro";
import { handleAnaChat } from "@/lib/ana/http";
import { knowledgeService } from "@/lib/okf/service";

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleAnaChat(request, knowledgeService);

