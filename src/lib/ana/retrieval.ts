import { createMCPClient } from "@ai-sdk/mcp";
import { normalizeKnowledgeText, type KnowledgeDocument, type KnowledgeSummary } from "../okf/core.js";
import type { KnowledgeReader } from "../okf/http.js";
import type { AnaKnowledgeMode } from "./config.js";

const STOP_WORDS = new Set([
  "a", "agente", "ajuda", "ajudar", "ao", "aos", "as", "bem", "como", "com", "da", "das", "de",
  "disseram", "do", "dos", "e", "ela", "ele", "em", "essa", "esse", "esta", "estao", "eu", "foi",
  "me", "meu", "minha", "na", "nas", "no", "nos", "o", "oi", "os", "ou", "para", "pela", "pelo",
  "podem", "por", "qual", "quais", "que", "quem", "sao", "se", "sobre", "tem", "ter", "tudo", "um",
  "uma", "vcs", "voce", "voces",
]);

const INTENTS = [
  {
    name: "educacao-escolas",
    ids: ["leia"],
    signals: [
      "leia", "escola", "escolas", "aluno", "alunos", "estudante", "estudantes", "ensino",
      "curriculo", "professor", "professores", "laboratorio", "equipamento", "equipamentos",
      "tablet", "tablets", "preco", "precos", "custa", "valor", "valores", "investimento",
      "plano", "planos", "standard", "silver", "gold",
    ],
  },
  { name: "academy", ids: ["amplify-academy"], signals: ["academy", "curso", "cursos", "formacao", "capacitação", "capacitacao", "aprender"] },
  { name: "metodo", ids: ["method"], signals: ["metodo", "metodologia", "processo", "trabalham", "abordagem"] },
  { name: "portfolio", ids: ["portfolio"], signals: ["oferta", "ofertas", "servico", "servicos", "consultoria", "diagnostico", "treinamento", "workshop", "produto", "produtos", "negocio", "operacao", "processos", "implantar", "implementar", "solucao", "solucoes"] },
  { name: "empresa", ids: ["company"], signals: ["amplify", "empresa", "diferencial", "diferenciais", "concorrente", "posicionamento"] },
] as const;

export type AnaRetrievalDocument = Pick<KnowledgeDocument, "id" | "title" | "description" | "type" | "tags" | "content">;

export type AnaRetrievalTrace = {
  query: string;
  normalizedTerms: string[];
  intent: string;
  mode: AnaKnowledgeMode;
  listMs: number;
  fetchMs: number;
  totalMs: number;
  ranked: Array<{ id: string; title: string; score: number }>;
  documents: AnaRetrievalDocument[];
  fallbackText: string;
};

type RankedSummary = KnowledgeSummary & { score: number };

function words(value: string): string[] {
  const normalized = normalizeKnowledgeText(value)
    .replace(/\bl\s*\.\s*e\s*\.\s*i\s*\.\s*a\s*\.?/g, " leia ");
  return Array.from(normalized.matchAll(/[a-z0-9]+/g), (match) => match[0]);
}

export function extractKnowledgeTerms(query: string) {
  return [...new Set(words(query).filter((word) => word.length > 2 && !STOP_WORDS.has(word)))];
}

function detectIntents(terms: string[]) {
  const termSet = new Set(terms);
  return INTENTS.filter((intent) => intent.signals.some((signal) => termSet.has(normalizeKnowledgeText(signal))));
}

function priorityDocumentIds(terms: string[]) {
  const intents = detectIntents(terms);
  const ids = intents.flatMap((intent) => [...intent.ids]);
  const termSet = new Set(terms);
  const hasSchoolIntent = intents.some(({ name }) => name === "educacao-escolas");
  const hasExplicitLeia = termSet.has("leia");
  if (hasSchoolIntent && !hasExplicitLeia) ids.push("portfolio");
  return [...new Set(ids)];
}

function overlapScore(value: string, terms: string[], weight: number) {
  const valueWords = new Set(words(value));
  return terms.reduce((score, term) => score + (valueWords.has(term) ? weight : 0), 0);
}

export function rankKnowledgeSummaries(query: string, summaries: KnowledgeSummary[]): RankedSummary[] {
  const terms = extractKnowledgeTerms(query);
  const priorityIds = priorityDocumentIds(terms);

  return summaries
    .map((summary) => {
      const priorityIndex = priorityIds.indexOf(summary.id);
      const score = (priorityIndex >= 0 ? 1_200 - priorityIndex * 100 : 0) +
        overlapScore(summary.title, terms, 80) +
        overlapScore(summary.tags.join(" "), terms, 60) +
        overlapScore(summary.description, terms, 25);
      return { ...summary, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "pt-BR"));
}

function fallbackText(documents: AnaRetrievalDocument[]) {
  if (!documents[0]) {
    return "A documentação pública disponível não trouxe informação suficiente para responder com segurança.";
  }
  const document = documents[0];
  const firstParagraph = document.content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/^#{1,6}\s+/, "").replace(/[*_`>#-]/g, "").trim())
    .find((paragraph) => paragraph && paragraph !== document.title);
  const detail = firstParagraph && firstParagraph !== document.description ? `\n\n${firstParagraph}` : "";
  return `${document.description}${detail}`;
}

export function emptyAnaRetrieval(mode: AnaKnowledgeMode, query: string, intent = "conversa"): AnaRetrievalTrace {
  return {
    query,
    normalizedTerms: extractKnowledgeTerms(query),
    intent,
    mode,
    listMs: 0,
    fetchMs: 0,
    totalMs: 0,
    ranked: [],
    documents: [],
    fallbackText: "",
  };
}

async function retrieveDirect(reader: KnowledgeReader, query: string) {
  const listStartedAt = Date.now();
  const summaries = await reader.listKnowledge();
  const listMs = Date.now() - listStartedAt;
  const ranked = rankKnowledgeSummaries(query, summaries);
  const terms = extractKnowledgeTerms(query);
  const priorityIds = priorityDocumentIds(terms);
  const selected = (ranked.length ? ranked : summaries.filter(({ id }) => id === "company"))
    .slice(0, Math.min(3, Math.max(2, priorityIds.length)));
  const fetchStartedAt = Date.now();
  const documents = (await Promise.all(selected.map(({ id }) => reader.getKnowledgeById(id))))
    .filter((document): document is KnowledgeDocument => Boolean(document));
  return { listMs, fetchMs: Date.now() - fetchStartedAt, ranked, documents };
}

async function retrieveMcp(query: string) {
  const mcpUrl = process.env.ANA_MCP_URL || "https://amplify.ia.br/api/mcp";
  const client = await createMCPClient({
    clientName: "amplify-ana-lab",
    transport: { type: "http", url: mcpUrl, redirect: "error" },
    initializationOptions: { timeout: 10_000 },
  });

  try {
    const tools = await client.tools();
    if (!tools.list_knowledge?.execute || !tools.get_knowledge?.execute) {
      throw new Error("O servidor MCP não expôs as ferramentas obrigatórias da KB.");
    }
    const options = {
      toolCallId: "ana-retrieval",
      messages: [],
      abortSignal: new AbortController().signal,
      context: undefined,
    };
    const listStartedAt = Date.now();
    const listResponse = await tools.list_knowledge.execute({}, options) as {
      structuredContent?: { items?: KnowledgeSummary[] };
    };
    const listMs = Date.now() - listStartedAt;
    const summaries = listResponse.structuredContent?.items ?? [];
    const ranked = rankKnowledgeSummaries(query, summaries);
    const terms = extractKnowledgeTerms(query);
    const priorityIds = priorityDocumentIds(terms);
    const selected = (ranked.length ? ranked : summaries.filter(({ id }) => id === "company"))
      .slice(0, Math.min(3, Math.max(2, priorityIds.length)));
    const fetchStartedAt = Date.now();
    const responses = await Promise.all(selected.map(({ id }) => tools.get_knowledge.execute?.({ id }, options)));
    const documents = responses.flatMap((response) => {
      const document = (response as { structuredContent?: { document?: KnowledgeDocument } } | undefined)
        ?.structuredContent?.document;
      return document ? [document] : [];
    });
    return { listMs, fetchMs: Date.now() - fetchStartedAt, ranked, documents };
  } finally {
    await client.close();
  }
}

export async function retrieveAnaKnowledge(
  mode: AnaKnowledgeMode,
  query: string,
  reader: KnowledgeReader,
): Promise<AnaRetrievalTrace> {
  const startedAt = Date.now();
  const terms = extractKnowledgeTerms(query);
  const intents = detectIntents(terms);
  const result = mode === "mcp" ? await retrieveMcp(query) : await retrieveDirect(reader, query);
  const documents = result.documents.map(({ id, title, description, type, tags, content }) => ({
    id, title, description, type, tags, content,
  }));
  return {
    query,
    normalizedTerms: terms,
    intent: intents.map(({ name }) => name).join("+") || "geral",
    mode,
    listMs: result.listMs,
    fetchMs: result.fetchMs,
    totalMs: Date.now() - startedAt,
    ranked: result.ranked.slice(0, 5).map(({ id, title, score }) => ({ id, title, score })),
    documents,
    fallbackText: fallbackText(documents),
  };
}
