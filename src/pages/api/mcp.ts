import type { APIRoute } from "astro";
import { knowledgeMcpHandler } from "@/lib/okf/mcp";

export const prerender = false;

const handleMcp: APIRoute = async ({ request }) => {
  const response = await knowledgeMcpHandler.fetch(request);
  response.headers.set("x-robots-tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
};

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;
