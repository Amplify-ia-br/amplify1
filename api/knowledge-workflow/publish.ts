import { handleKnowledgePublish } from "../../src/lib/knowledge-workflow/http.js";
import {
  methodNotAllowed,
  sendWebResponse,
  toWebRequest,
  type VercelRequest,
  type VercelResponse,
} from "../../src/lib/okf/vercel.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const result = String(request.method || "GET").toUpperCase() === "POST"
    ? await handleKnowledgePublish(await toWebRequest(request))
    : methodNotAllowed();

  return sendWebResponse(response, result);
}
