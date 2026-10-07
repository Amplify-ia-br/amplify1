import {
  InvalidKnowledgeQueryError,
  type KnowledgeFilters,
  type KnowledgeSearchOptions,
  type createKnowledgeService,
} from "@/lib/okf/core";

export type KnowledgeReader = Pick<
  ReturnType<typeof createKnowledgeService>,
  "listKnowledge" | "searchKnowledge" | "getKnowledgeById"
>;

const JSON_HEADERS = {
  "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
  "content-type": "application/json; charset=utf-8",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function filtersFromUrl(url: URL): KnowledgeFilters {
  return {
    type: url.searchParams.get("type")?.trim() || undefined,
    tag: url.searchParams.get("tag")?.trim() || undefined,
    status: url.searchParams.get("status")?.trim() || undefined,
  };
}

function searchOptionsFromUrl(url: URL): KnowledgeSearchOptions {
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit === null ? undefined : Number(rawLimit);
  return { ...filtersFromUrl(url), limit };
}

function reportFailure(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(`[OKF API] ${scope}: ${message}`);
}

export async function handleListKnowledge(request: Request, reader: KnowledgeReader) {
  try {
    const items = await reader.listKnowledge(filtersFromUrl(new URL(request.url)));
    return json(items);
  } catch (error) {
    reportFailure("list failed", error);
    return json({ error: "knowledge_unavailable" }, 500);
  }
}

export async function handleGetKnowledge(
  id: string | undefined,
  reader: KnowledgeReader,
) {
  if (!id) return json({ error: "knowledge_not_found" }, 404);

  try {
    const document = await reader.getKnowledgeById(id);
    return document ? json(document) : json({ error: "knowledge_not_found" }, 404);
  } catch (error) {
    reportFailure("get failed", error);
    return json({ error: "knowledge_unavailable" }, 500);
  }
}

export async function handleSearchKnowledge(request: Request, reader: KnowledgeReader) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  try {
    const results = await reader.searchKnowledge(query, searchOptionsFromUrl(url));
    return json(results);
  } catch (error) {
    if (error instanceof InvalidKnowledgeQueryError) {
      return json({ error: "invalid_query" }, 400);
    }

    reportFailure("search failed", error);
    return json({ error: "knowledge_unavailable" }, 500);
  }
}
