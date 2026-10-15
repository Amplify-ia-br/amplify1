import type { APIRoute } from "astro";
import { handleKnowledgePublish } from "@/lib/knowledge-workflow/http";

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleKnowledgePublish(request);
