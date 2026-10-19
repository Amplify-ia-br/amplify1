import { handleAnaZeroChat } from "../src/lib/ana-zero/http.js";
import { fileKnowledgeService } from "../src/lib/okf/file-service.js";

export async function POST(request: Request) {
  return handleAnaZeroChat(request, fileKnowledgeService);
}
