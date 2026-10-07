import { createMcpHandler } from "@modelcontextprotocol/server";
import { fileKnowledgeService } from "./file-service.js";
import { createKnowledgeMcpServer } from "./mcp-server.js";

export const fileKnowledgeMcpHandler = createMcpHandler(
  () => createKnowledgeMcpServer(fileKnowledgeService),
  {
    legacy: "stateless",
    responseMode: "json",
    onerror(error) {
      console.error(`[OKF MCP] request failed: ${error.message}`);
    },
  },
);
