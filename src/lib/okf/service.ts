import { getCollection, type CollectionEntry } from "astro:content";
import { createKnowledgeService } from "@/lib/okf/core";

export type PublicKnowledgeEntry = CollectionEntry<"knowledge">;

export const knowledgeService = createKnowledgeService(async () => getCollection("knowledge"));
export const getPublicKnowledge = knowledgeService.getPublicKnowledgeEntries;
export const listKnowledge = knowledgeService.listKnowledge;
export const searchKnowledge = knowledgeService.searchKnowledge;
export const getKnowledgeById = knowledgeService.getKnowledgeById;

export {
  InvalidKnowledgeQueryError,
  markdownToSearchText,
  normalizeKnowledgeText,
  type KnowledgeDocument,
  type KnowledgeFilters,
  type KnowledgeSearchOptions,
  type KnowledgeSummary,
  type PublishedKnowledgeStatus,
} from "@/lib/okf/core";
