import { okfSchema, type OkfDocument } from "@/lib/okf-schema";

export type PublishedKnowledgeStatus = Extract<OkfDocument["status"], "approved" | "active">;
export type KnowledgeDocument = Omit<OkfDocument, "status"> & { status: PublishedKnowledgeStatus; content: string };
export type KnowledgeSummary = Pick<KnowledgeDocument, "id" | "title" | "description" | "type" | "tags" | "status" | "updated_at">;
export type KnowledgeFilters = { type?: string; tag?: string; status?: string };
export type KnowledgeSearchOptions = KnowledgeFilters & { limit?: number };
export type KnowledgeSourceEntry = { data: unknown; body?: string; id?: string; filePath?: string };

type KnowledgeLoader<TEntry extends KnowledgeSourceEntry> = () => Promise<TEntry[]>;
const OKF_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;

export class InvalidKnowledgeQueryError extends Error {
  constructor() {
    super("invalid_query");
    this.name = "InvalidKnowledgeQueryError";
  }
}

export function normalizeKnowledgeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

export function markdownToSearchText(markdown = "") {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^---[\s\S]*?---/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPublishedStatus(status: OkfDocument["status"]): status is PublishedKnowledgeStatus {
  return status === "approved" || status === "active";
}

function matchesFilter(value: string, expected?: string) {
  return !expected || normalizeKnowledgeText(value) === normalizeKnowledgeText(expected);
}

function matchesFilters(document: KnowledgeDocument, filters: KnowledgeFilters) {
  return matchesFilter(document.type, filters.type) &&
    matchesFilter(document.status, filters.status) &&
    (!filters.tag || document.tags.some((tag) => matchesFilter(tag, filters.tag)));
}

function toSummary(document: KnowledgeDocument): KnowledgeSummary {
  const { id, title, description, type, tags, status, updated_at } = document;
  return { id, title, description, type, tags, status, updated_at };
}

function fieldScore(value: string, query: string, terms: string[], weight: number) {
  const normalized = normalizeKnowledgeText(value);
  if (!normalized) return 0;
  let score = normalized.includes(query) ? weight : 0;
  for (const term of terms) if (normalized.includes(term)) score += weight / 10;
  return score;
}

export function createKnowledgeService<TEntry extends KnowledgeSourceEntry>(loadEntries: KnowledgeLoader<TEntry>) {
  async function loadPublishedEntries() {
    const entries = await loadEntries();
    const parsedEntries = entries.map((entry) => ({ entry, data: okfSchema.parse(entry.data) }));
    const publicIds = new Set(parsedEntries.map(({ data }) => data.id));

    for (const { entry, data } of parsedEntries) {
      for (const relationship of data.relationships) {
        if (!publicIds.has(relationship.target)) {
          throw new Error(`[OKF] ${entry.filePath ?? entry.id ?? data.id}: relationships.target aponta para o id público inexistente "${relationship.target}".`);
        }
      }
    }

    return parsedEntries
      .filter(({ data }) => data.visibility === "public" && isPublishedStatus(data.status))
      .sort((left, right) => left.data.title.localeCompare(right.data.title, "pt-BR"));
  }

  async function getPublicKnowledgeEntries() {
    return (await loadPublishedEntries()).map(({ entry }) => entry);
  }

  async function loadDocuments(): Promise<KnowledgeDocument[]> {
    return (await loadPublishedEntries()).map(({ entry, data }) => ({
      ...data,
      status: data.status as PublishedKnowledgeStatus,
      content: (entry.body ?? "").trim(),
    }));
  }

  async function listKnowledge(filters: KnowledgeFilters = {}): Promise<KnowledgeSummary[]> {
    return (await loadDocuments()).filter((document) => matchesFilters(document, filters)).map(toSummary);
  }

  async function getKnowledgeById(id: string): Promise<KnowledgeDocument | undefined> {
    if (!OKF_ID.test(id)) return undefined;
    return (await loadDocuments()).find((document) => document.id === id);
  }

  async function searchKnowledge(query: string, options: KnowledgeSearchOptions = {}): Promise<KnowledgeSummary[]> {
    const normalizedQuery = normalizeKnowledgeText(query);
    if (!normalizedQuery) throw new InvalidKnowledgeQueryError();
    const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_LIMIT) throw new InvalidKnowledgeQueryError();

    const terms = [...new Set(normalizedQuery.split(" ").filter(Boolean))];
    const documents = (await loadDocuments()).filter((document) => matchesFilters(document, options));
    return documents
      .map((document) => {
        const searchableText = normalizeKnowledgeText([
          document.title,
          document.tags.join(" "),
          document.description,
          markdownToSearchText(document.content),
        ].join(" "));
        const matches = searchableText.includes(normalizedQuery) || terms.every((term) => searchableText.includes(term));
        const score = fieldScore(document.title, normalizedQuery, terms, 400) +
          fieldScore(document.tags.join(" "), normalizedQuery, terms, 300) +
          fieldScore(document.description, normalizedQuery, terms, 200) +
          fieldScore(markdownToSearchText(document.content), normalizedQuery, terms, 100);
        return { document, matches, score };
      })
      .filter(({ matches, score }) => matches && score > 0)
      .sort((left, right) => right.score - left.score || left.document.title.localeCompare(right.document.title, "pt-BR"))
      .slice(0, limit)
      .map(({ document }) => toSummary(document));
  }

  return { getPublicKnowledgeEntries, listKnowledge, searchKnowledge, getKnowledgeById };
}
