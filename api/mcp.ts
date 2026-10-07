import { knowledgeMcpHandler } from "../src/lib/okf/mcp";
import {
  methodNotAllowed,
  sendWebResponse,
  toWebRequest,
  type VercelRequest,
  type VercelResponse,
} from "../src/lib/okf/vercel";

const MCP_METHODS = new Set(["GET", "POST", "DELETE"]);

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const method = String(request.method || "GET").toUpperCase();
  const result = MCP_METHODS.has(method)
    ? await knowledgeMcpHandler.fetch(await toWebRequest(request))
    : methodNotAllowed();

  return sendWebResponse(response, result);
}
