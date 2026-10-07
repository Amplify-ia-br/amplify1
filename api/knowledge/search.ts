import { fileKnowledgeService } from "../../src/lib/okf/file-service.js";
import { handleSearchKnowledge } from "../../src/lib/okf/http.js";
import {
  methodNotAllowed,
  sendWebResponse,
  toWebRequest,
  type VercelRequest,
  type VercelResponse,
} from "../../src/lib/okf/vercel.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const result = String(request.method || "GET").toUpperCase() === "GET"
    ? await handleSearchKnowledge(await toWebRequest(request), fileKnowledgeService)
    : methodNotAllowed();

  return sendWebResponse(response, result);
}
