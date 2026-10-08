import { fileKnowledgeMcpHandler } from "../src/lib/okf/file-mcp.js";
import {
  methodNotAllowed,
  sendWebResponse,
  toWebRequest,
  type VercelRequest,
  type VercelResponse,
} from "../src/lib/okf/vercel.js";

const MCP_METHODS = new Set(["GET", "POST", "DELETE"]);

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const method = String(request.method || "GET").toUpperCase();
  const result = MCP_METHODS.has(method)
    ? await fileKnowledgeMcpHandler.fetch(await toWebRequest(request))
    : methodNotAllowed();

  result.headers.set("x-robots-tag", "noindex, nofollow, noarchive, nosnippet");

  return sendWebResponse(response, result);
}
