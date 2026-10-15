import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod-v4";
import { buildAnaZeroSystem, PROMPT_VERSION } from "../prompt.js";
import {
  analyzeSessions,
  createAnalyst,
  generateRecommendations,
  pendingSessionIds,
  type Analyst,
} from "./analyzer.js";
import { getAdminClient, requireAdmin, type AdminIdentity } from "./auth.js";
import { loadDataset, loadRecommendations } from "./data.js";
import {
  applyFilters,
  buildSessionDetail,
  computeByPromptVersion,
  computeContent,
  computeOverview,
  filterOptions,
  summarizeSessions,
} from "./metrics.js";
import { RECOMMENDATION_STATUSES, type Filters } from "./types.js";

const HEADERS = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow, noarchive, nosnippet" };

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: HEADERS });

const postSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("analyze"),
    sessionIds: z.array(z.uuid()).max(50).optional(),
    force: z.boolean().optional(),
  }),
  z.strictObject({ action: z.literal("recommend") }),
  z.strictObject({
    action: z.literal("decide"),
    id: z.uuid(),
    status: z.enum(RECOMMENDATION_STATUSES),
    note: z.string().trim().max(1_000).optional(),
    implementedCommit: z.string().trim().max(80).optional(),
  }),
]);

export type AdminDeps = {
  client?: SupabaseClient;
  authenticate?: (request: Request) => Promise<AdminIdentity | Response>;
  analyst?: () => Analyst;
};

function parseFilters(params: URLSearchParams): Filters {
  const pick = (key: string) => params.get(key) || undefined;
  return {
    from: pick("from"),
    to: pick("to"),
    mission: pick("mission"),
    model: pick("model"),
    promptVersion: pick("promptVersion"),
  };
}

async function handleGet(client: SupabaseClient, url: URL) {
  const view = url.searchParams.get("view") ?? "overview";
  const filters = parseFilters(url.searchParams);

  if (view === "recommendations") return json(await loadRecommendations(client));

  const all = await loadDataset(client);
  const data = applyFilters(all, filters);

  switch (view) {
    case "overview":
      return json({
        promptVersion: PROMPT_VERSION,
        options: filterOptions(all),
        overview: computeOverview(data),
        pendingAnalysis: pendingSessionIds(data).length,
      });
    case "sessions": {
      const only = url.searchParams.get("only");
      const sessions = summarizeSessions(data).filter((s) => {
        if (only === "negative") return s.negative > 0;
        if (only === "unrated") return s.positive + s.negative === 0 && s.overallRating === null;
        if (only === "issues") return s.hasIssues || s.hasErrors;
        return true;
      });
      return json({ sessions });
    }
    case "session": {
      const detail = buildSessionDetail(all, url.searchParams.get("id") ?? "");
      return detail ? json(detail) : json({ error: "not_found" }, 404);
    }
    case "content":
      return json({ content: computeContent(data) });
    case "evolution":
      return json({ versions: computeByPromptVersion(data), currentVersion: PROMPT_VERSION });
    default:
      return json({ error: "unknown_view" }, 400);
  }
}

async function handlePost(client: SupabaseClient, request: Request, identity: AdminIdentity, deps: AdminDeps) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  const input = parsed.data;

  if (input.action === "decide") {
    const decided = input.status !== "nova";
    const update = await client
      .from("ana_recommendations")
      .update({
        status: input.status,
        decision_note: input.note ?? null,
        decided_by: decided ? identity.userId : null,
        decided_at: decided ? new Date().toISOString() : null,
        implemented_commit: input.status === "implementada" ? (input.implementedCommit ?? null) : null,
        prompt_version: input.status === "implementada" ? PROMPT_VERSION : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .select("id")
      .maybeSingle();
    if (update.error) return json({ error: "not_saved" }, 503);
    return update.data ? json({ ok: true }) : json({ error: "not_found" }, 404);
  }

  const analyst = (deps.analyst ?? createAnalyst)();
  const data = await loadDataset(client);

  if (input.action === "analyze") {
    const result = await analyzeSessions(client, data, {
      analyst,
      sessionIds: input.sessionIds,
      force: input.force,
      userId: identity.userId,
    });
    return json(result);
  }

  const { recommendations } = await loadRecommendations(client);
  const result = await generateRecommendations(client, data, {
    analyst,
    existing: recommendations,
    systemPrompt: buildAnaZeroSystem([], undefined, false),
    userId: identity.userId,
  });
  return json(result);
}

export async function handleAnaZeroAdmin(request: Request, deps: AdminDeps = {}) {
  if (request.method !== "GET" && request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const client = deps.client ?? getAdminClient();
  const identity = await (deps.authenticate ?? ((req: Request) => requireAdmin(req, client)))(request);
  if (identity instanceof Response) return identity;
  if (!client) return json({ error: "storage_unavailable" }, 503);

  try {
    return request.method === "GET"
      ? await handleGet(client, new URL(request.url))
      : await handlePost(client, request, identity, deps);
  } catch (error) {
    console.error("[ana-zero-admin] request failed", error instanceof Error ? error.message : error);
    return json({ error: "internal_error" }, 500);
  }
}
