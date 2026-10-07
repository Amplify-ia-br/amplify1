import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod-v4";
import type { KnowledgeFilters, KnowledgeSearchOptions } from "@/lib/okf/core";
import type { KnowledgeReader } from "@/lib/okf/http";

const publishedStatus = z.enum(["approved", "active"]);

function toolResult(structuredContent: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

export function createKnowledgeMcpServer(reader: KnowledgeReader) {
  const server = new McpServer({ name: "amplify-okf", version: "0.1.0" });

  server.registerTool(
    "search_knowledge",
    {
      title: "Search Amplify knowledge",
      description:
        "Search Amplify's public canonical knowledge base for information relevant to a customer question. Use this before answering questions about Amplify, its offers, methodology, academy, portfolio, glossary or institutional positioning.",
      inputSchema: z.object({
        query: z.string().trim().min(1).describe("Question or terms to search for."),
        type: z.string().trim().min(1).optional().describe("Optional OKF document type."),
        tag: z.string().trim().min(1).optional().describe("Optional exact tag filter."),
        limit: z.number().int().min(1).max(50).optional().describe("Maximum number of results."),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ query, type, tag, limit }) => {
      const options: KnowledgeSearchOptions = { type, tag, limit };
      const results = await reader.searchKnowledge(query, options);
      return toolResult({ results });
    },
  );

  server.registerTool(
    "get_knowledge",
    {
      title: "Get Amplify knowledge item",
      description:
        "Retrieve the full canonical public knowledge item by id when detailed or authoritative information is needed.",
      inputSchema: z.object({ id: z.string().trim().min(1).describe("Canonical OKF document id.") }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const document = await reader.getKnowledgeById(id);
      if (!document) return { ...toolResult({ error: "knowledge_not_found" }), isError: true };
      return toolResult({ document });
    },
  );

  server.registerTool(
    "list_knowledge",
    {
      title: "List Amplify knowledge",
      description:
        "List concise metadata for published items in Amplify's public canonical knowledge base. Use it to discover available topics or ids before retrieving a full item.",
      inputSchema: z.object({
        type: z.string().trim().min(1).optional().describe("Optional OKF document type."),
        tag: z.string().trim().min(1).optional().describe("Optional exact tag filter."),
        status: publishedStatus.optional().describe("Optional published status filter."),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ type, tag, status }) => {
      const filters: KnowledgeFilters = { type, tag, status };
      const items = await reader.listKnowledge(filters);
      return toolResult({ items });
    },
  );

  return server;
}
