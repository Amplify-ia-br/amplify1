import { createMcpHandler } from "@modelcontextprotocol/server";
import { createKnowledgeMcpServer } from "@/lib/okf/mcp-server";
import { knowledgeService } from "@/lib/okf/service";

export const knowledgeMcpHandler = createMcpHandler(
  () => createKnowledgeMcpServer(knowledgeService),
  {
    legacy: "stateless",
    responseMode: "json",
    onerror(error) {
      console.error(`[OKF MCP] request failed: ${error.message}`);
    },
  },
);
