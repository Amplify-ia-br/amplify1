import type { APIRoute } from "astro";
import { handleAnaZeroChat } from "@/lib/ana-zero/http";
import { knowledgeService } from "@/lib/okf/service";

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleAnaZeroChat(request, knowledgeService);
