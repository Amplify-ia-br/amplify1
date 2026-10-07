import { fileKnowledgeService } from "../../src/lib/okf/file-service.js";
import { handleGetKnowledge } from "../../src/lib/okf/http.js";
import {
  methodNotAllowed,
  routeParam,
  sendWebResponse,
  type VercelRequest,
  type VercelResponse,
} from "../../src/lib/okf/vercel.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const result = String(request.method || "GET").toUpperCase() === "GET"
    ? await handleGetKnowledge(routeParam(request.query?.id), fileKnowledgeService)
    : methodNotAllowed();

  return sendWebResponse(response, result);
}
