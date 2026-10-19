import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../src/lib/ana-zero/admin/auth.js";

const TABLES = [
  "ana_lab_invites",
  "ana_lab_testers",
  "ana_test_sessions",
  "ana_test_turns",
  "ana_test_feedback",
  "ana_analysis_runs",
  "ana_session_analyses",
  "ana_turn_analyses",
  "ana_recommendations",
] as const;

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

function authorized(request: Request) {
  const expected = process.env.ANA_EXPORT_TOKEN?.trim();
  const provided = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

async function readAll(client: SupabaseClient, table: (typeof TABLES)[number]) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1_000) {
    const { data, error } = await client.from(table).select("*").range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1_000) return rows;
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401, headers });
  const client = getAdminClient();
  if (!client) return Response.json({ error: "storage_unavailable" }, { status: 503, headers });

  try {
    const entries = await Promise.all(TABLES.map(async (table) => [table, await readAll(client, table)] as const));
    return Response.json({ version: 1, generatedAt: new Date().toISOString(), tables: Object.fromEntries(entries) }, { headers });
  } catch (error) {
    console.error("[ana-zero-export] failed", error);
    return Response.json({ error: "export_failed" }, { status: 500, headers });
  }
}
