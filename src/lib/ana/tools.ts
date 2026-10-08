import { tool } from "ai";
import { z } from "zod-v4";
import type { KnowledgeReader } from "../okf/http.js";

const publishedStatus = z.enum(["approved", "active"]);

export function createDirectKnowledgeTools(reader: KnowledgeReader) {
  return {
    search_knowledge: tool({
      description:
        "Busca a base canônica pública da Amplify. Use antes de responder perguntas sobre a empresa, ofertas, metodologia, portfólio, Academy, glossário ou L.E.I.A.",
      inputSchema: z.object({
        query: z.string().trim().min(1),
        type: z.string().trim().min(1).optional(),
        tag: z.string().trim().min(1).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async ({ query, type, tag, limit }) => ({
        results: await reader.searchKnowledge(query, { type, tag, limit }),
      }),
    }),
    get_knowledge: tool({
      description:
        "Recupera pelo id um documento público canônico completo quando forem necessários detalhes ou confirmação factual.",
      inputSchema: z.object({ id: z.string().trim().min(1) }),
      execute: async ({ id }) => {
        const document = await reader.getKnowledgeById(id);
        return document ? { document } : { error: "knowledge_not_found" };
      },
    }),
    list_knowledge: tool({
      description:
        "Lista os documentos publicados da base pública da Amplify para descobrir temas e ids disponíveis.",
      inputSchema: z.object({
        type: z.string().trim().min(1).optional(),
        tag: z.string().trim().min(1).optional(),
        status: publishedStatus.optional(),
      }),
      execute: async ({ type, tag, status }) => ({
        items: await reader.listKnowledge({ type, tag, status }),
      }),
    }),
  };
}
