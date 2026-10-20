import { tool } from "ai";
import { z } from "zod-v4";
import {
  normalizeKnowledgeText,
  type KnowledgeDocument,
  type KnowledgeSearchOptions,
  type KnowledgeSummary,
} from "../okf/core.js";
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
  return userTexts.some((text) => {
    const haystack = normalizeKnowledgeText(text);
    let offset = haystack.indexOf(needle);
    while (offset >= 0) {
      const before = haystack[offset - 1];
      const after = haystack[offset + needle.length];
      const startsAtBoundary = before === undefined || !/[\p{L}\p{N}]/u.test(before);
      const endsAtBoundary = after === undefined || !/[\p{L}\p{N}]/u.test(after);
      if (startsAtBoundary && endsAtBoundary) return true;
      offset = haystack.indexOf(needle, offset + 1);
    }
    return false;
  });
}

export function sanitizeMemory(memory: AnaZeroMemoryEntry[], userTexts: string[]) {
  return memory.filter((entry) => quoteIsFromUser(entry.evidence, userTexts));
}

const HANDOFF_EMAIL_SCHEMA = z.email();
const VALID_BRAZILIAN_AREA_CODES = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

function isPlausibleBrazilianPhone(contact: string) {
  // Keep the accepted surface deliberately narrow: a contact must be the phone
  // itself, not prose that happens to contain digits.
  if (!/^\+?[\d\s().-]+$/.test(contact)) return false;

  let digits = contact.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  } else if (contact.startsWith("+")) {
    return false;
  }

  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  if (!VALID_BRAZILIAN_AREA_CODES.has(ddd)) return false;

  // Brazilian mobile numbers have nine digits and start with 9. Landlines
  // have eight digits and currently start from 2 through 5.
  return subscriber.length === 9 ? subscriber.startsWith("9") : /^[2-5]/.test(subscriber);
}

export function isValidHandoffContact(contact: string) {
  const value = contact.trim();
  return HANDOFF_EMAIL_SCHEMA.safeParse(value).success || isPlausibleBrazilianPhone(value);
}

const EXPLICIT_HANDOFF_CONSENT = /\b(?:sim|pode|autorizo|concordo|quero|aceito|me (?:cham(?:a|e)|contat(?:a|e))|podem me (?:chamar|contatar))\b/i;

export function isExplicitHandoffConsent(quote: string) {
  return EXPLICIT_HANDOFF_CONSENT.test(normalizeKnowledgeText(quote));
}

const SEARCH_STOPWORDS = new Set([
  "ana", "ajudar", "ajuda", "como", "com", "dos", "das", "para", "por", "que", "uma", "uns", "umas", "num", "numa",
  "nos", "nas", "sobre", "minha", "meu", "sou", "ser", "ter", "mais", "muito", "uso", "queria", "quero", "saber",
]);

// O leitor exige que todos os termos estejam no mesmo documento; uma consulta em
// frase longa volta vazia mesmo quando a base tem a resposta.
export async function forgivingSearch(
  reader: KnowledgeReader,
  query: string,
  options: KnowledgeSearchOptions = {},
): Promise<KnowledgeSummary[]> {
  const exact = await reader.searchKnowledge(query, options);
  if (exact.length) return exact;

  const { type, tag } = options;
  const terms = [
    ...new Set(
      normalizeKnowledgeText(query)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length >= 3 && !SEARCH_STOPWORDS.has(term)),
    ),
  ];
  const hits = new Map<string, { summary: KnowledgeSummary; count: number }>();
  for (const term of terms) {
    for (const summary of await reader.searchKnowledge(term, { type, tag })) {
      const current = hits.get(summary.id);
      hits.set(summary.id, { summary, count: (current?.count ?? 0) + 1 });
    }
  }
  const ranked = [...hits.values()].sort((left, right) => right.count - left.count).map(({ summary }) => summary);
  if (ranked.length) return ranked.slice(0, options.limit ?? 10);
  return reader.listKnowledge({ type, tag });
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

const LEIA_TOPIC = /\bl\s*\.?\s*e\s*\.?\s*i\s*\.?\s*a\s*\.?\b|laborat[oó]rio escolar de intelig[êe]ncia artificial/i;
const LEIA_CONTINUATION = /^(?:legal|gostei|interessante|bacana|quero sim|pode ser|claro|que mais|sim)[!.?\s]*$/i;
const LEIA_IMPLEMENTATION = /implanta[cç][aã]o|como funciona|na pr[aá]tica|rotina da escola|etapas?|responsabilidades?|come[cç](?:ar|o)|pr[oó]ximos? passos?/i;

type ConversationTurn = { role: "user" | "assistant"; text: string };

export function shouldPrimeLeiaProductKnowledge(history: ConversationTurn[]) {
  const latest = history.at(-1);
  if (!latest || latest.role !== "user") return false;
  if (LEIA_TOPIC.test(latest.text)) return true;

  const recentContext = history.slice(-6).map((turn) => turn.text).join("\n");
  return LEIA_TOPIC.test(recentContext) && (LEIA_CONTINUATION.test(latest.text.trim()) || LEIA_IMPLEMENTATION.test(latest.text));
}

export async function primeLeiaProductKnowledge(
  reader: KnowledgeReader,
  state: AnaZeroToolState,
  history: ConversationTurn[],
): Promise<KnowledgeDocument | undefined> {
  if (!shouldPrimeLeiaProductKnowledge(history)) return undefined;

  const results = await forgivingSearch(reader, "L.E.I.A. Ficha do Produto", { limit: 20 });
  recordKnowledgeOutput(state, "search_knowledge", { results });
  const product = results
    .filter((item) => /ficha do produto/i.test(normalizeKnowledgeText(item.title)))
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0];
  if (!product) return undefined;

  const document = await reader.getKnowledgeById(product.id);
  if (!document) return undefined;
  recordKnowledgeOutput(state, "get_knowledge", { document });
  return document;
}

export function createAnaZeroTools(reader: KnowledgeReader, state: AnaZeroToolState, userTexts: string[]) {
  const knowledge = createDirectKnowledgeTools({
    listKnowledge: (filters) => reader.listKnowledge(filters),
    getKnowledgeById: (id) => reader.getKnowledgeById(id),
    searchKnowledge: (query, options) => forgivingSearch(reader, query, options),
  });
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
        "Registra o pedido de contato com o time humano. Use somente depois que a pessoa pediu um próximo passo, consentiu em ser contatada e informou literalmente um e-mail válido ou telefone com DDD. Dizer apenas 'WhatsApp' ou 'e-mail' informa uma preferência, não um contato. Não envia nada nem agenda nada.",
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
        if (!isExplicitHandoffConsent(handoff.consentQuote)) {
          return { ok: false as const, error: "explicit_consent_required" };
        }
        if (!quoteIsFromUser(handoff.contact, userTexts)) {
          return { ok: false as const, error: "contact_not_provided_by_user" };
        }
        if (!isValidHandoffContact(handoff.contact)) {
          return { ok: false as const, error: "contact_must_be_valid_email_or_phone" };
        }
        state.handoff = handoff;
        return { ok: true as const, status: "recorded_pending_review" as const };
      },
    }),
  };
}
