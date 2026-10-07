import { handleGetKnowledge } from "../../src/lib/okf/http";
import { knowledgeService } from "../../src/lib/okf/service";
import {
  methodNotAllowed,
  routeParam,
  sendWebResponse,
  type VercelRequest,
  type VercelResponse,
} from "../../src/lib/okf/vercel";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const result = String(request.method || "GET").toUpperCase() === "GET"
    ? await handleGetKnowledge(routeParam(request.query?.id), knowledgeService)
    : methodNotAllowed();

  return sendWebResponse(response, result);
}
