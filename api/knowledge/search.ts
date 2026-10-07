import { handleSearchKnowledge } from "../../src/lib/okf/http";
import { knowledgeService } from "../../src/lib/okf/service";
import {
  methodNotAllowed,
  sendWebResponse,
  toWebRequest,
  type VercelRequest,
  type VercelResponse,
} from "../../src/lib/okf/vercel";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const result = String(request.method || "GET").toUpperCase() === "GET"
    ? await handleSearchKnowledge(await toWebRequest(request), knowledgeService)
    : methodNotAllowed();

  return sendWebResponse(response, result);
}
