import { tool } from "ai";
import { z } from "zod-v4";
import { normalizeKnowledgeText } from "../okf/core.js";
import type { KnowledgeReader } from "../okf/http.js";
import { createDirectKnowledgeTools } from "../ana/tools.js";
import { memoryEntrySchema, type AnaZeroHandoff, type AnaZeroMemoryEntry } from "./schema.js";

export type AnaZeroToolState = {
  memory: AnaZeroMemoryEntry[];
  handoff?: AnaZeroHandoff;
  toolCalls: string[];
  evidenceText: string[];
  sources: Map<string, string>;
};

export function createAnaZeroToolState(memory: AnaZeroMemoryEntry[]): AnaZeroToolState {
  return { memory: [...memory], toolCalls: [], evidenceText: [], sources: new Map() };
}

export function quoteIsFromUser(quote: string, userTexts: string[]) {
  const needle = normalizeKnowledgeText(quote);
  if (needle.length < 2) return false;
  return userTexts.some((text) => normalizeKnowledgeText(text).includes(needle));
}

export function sanitizeMemory(memory: AnaZeroMemoryEntry[], userTexts: string[]) {
  return memory.filter((entry) => quoteIsFromUser(entry.evidence, userTexts));
}

function recordKnowledgeOutput(state: AnaZeroToolState, name: string, output: unknown) {
  state.toolCalls.push(name);
  state.evidenceText.push(JSON.stringify(output));
  const collect = (item: unknown) => {
    if (item && typeof item === "object" && "id" in item && "title" in item) {
      const { id, title } = item as { id: unknown; title: unknown };
      if (typeof id === "string" && typeof title === "string") state.sources.set(id, title);
    }
  };
  const value = output as { results?: unknown[]; items?: unknown[]; document?: unknown };
  value.results?.forEach(collect);
  value.items?.forEach(collect);
  collect(value.document);
}

export function createAnaZeroTools(reader: KnowledgeReader, state: AnaZeroToolState, userTexts: string[]) {
  const knowledge = createDirectKnowledgeTools(reader);
  const wrapped = Object.fromEntries(
    Object.entries(knowledge).map(([name, base]) => [
      name,
      {
        ...base,
        execute: async (input: never, options: never) => {
          const output = await (base.execute as (i: never, o: never) => Promise<unknown>)(input, options);
          recordKnowledgeOutput(state, name, output);
          return output;
        },
      },
    ]),
  ) as typeof knowledge;

  return {
    ...wrapped,
    remember: tool({
      description:
        "Registra um fato que a pessoa revelou sobre si ou sua organização. A evidência deve ser uma citação literal da mensagem da pessoa. Nunca registre suposições.",
      inputSchema: memoryEntrySchema,
      execute: async (entry) => {
        state.toolCalls.push("remember");
        if (!quoteIsFromUser(entry.evidence, userTexts)) {
          return { ok: false as const, error: "evidence_not_found_in_user_messages" };
        }
        state.memory = [...state.memory.filter((item) => !(item.key === entry.key && item.key !== "other")), entry];
        return { ok: true as const };
      },
    }),
    request_handoff: tool({
      description:
        "Registra o pedido de contato com o time humano. Use somente depois que a pessoa pediu um próximo passo, consentiu em ser contatada e informou o canal. Não envia nada nem agenda nada.",
      inputSchema: z.object({
        summary: z.string().trim().min(1).max(500),
        consentQuote: z.string().trim().min(2).max(400),
        contact: z.string().trim().min(3).max(200),
      }),
      execute: async (handoff) => {
        state.toolCalls.push("request_handoff");
        if (!quoteIsFromUser(handoff.consentQuote, userTexts)) {
          return { ok: false as const, error: "consent_not_found_in_user_messages" };
        }
        if (!quoteIsFromUser(handoff.contact, userTexts)) {
          return { ok: false as const, error: "contact_not_provided_by_user" };
        }
        state.handoff = handoff;
        return { ok: true as const, status: "recorded_pending_review" as const };
      },
    }),
  };
}
