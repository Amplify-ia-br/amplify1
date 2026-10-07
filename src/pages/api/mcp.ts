import type { APIRoute } from "astro";
import { knowledgeMcpHandler } from "@/lib/okf/mcp";

export const prerender = false;

const handleMcp: APIRoute = async ({ request }) => knowledgeMcpHandler.fetch(request);

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;
