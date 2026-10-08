import { handleAnaChat } from "../src/lib/ana/http.js";
import { fileKnowledgeService } from "../src/lib/okf/file-service.js";

export async function POST(request: Request) {
  return handleAnaChat(request, fileKnowledgeService);
}

