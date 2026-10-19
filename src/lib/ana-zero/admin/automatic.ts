import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerClient } from "../../ana/store.js";
import { buildAnaZeroSystem } from "../prompt.js";
import { analyzeSessions, createAnalyst, generateRecommendations, type Analyst } from "./analyzer.js";
import { loadRecommendations, loadSessionDataset } from "./data.js";

export type AutomaticAnalysisResult = {
  analyzed: number;
  recommendationsCreated: number;
  skipped?: "storage_unavailable" | "session_not_found" | "already_analyzed";
};

export async function analyzeCompletedSession(
  sessionId: string,
  deps: { client?: SupabaseClient | null; analyst?: Analyst } = {},
): Promise<AutomaticAnalysisResult> {
  const client = deps.client ?? getServerClient();
  if (!client) return { analyzed: 0, recommendationsCreated: 0, skipped: "storage_unavailable" };

  const data = await loadSessionDataset(client, sessionId);
  const session = data.sessions[0];
  if (!session || data.turns.length === 0) {
    return { analyzed: 0, recommendationsCreated: 0, skipped: "session_not_found" };
  }

  const analyst = deps.analyst ?? createAnalyst();
  const analysis = await analyzeSessions(client, data, { analyst, sessionIds: [sessionId] });
  if (!analysis.analyzed) {
    return { analyzed: 0, recommendationsCreated: 0, skipped: "already_analyzed" };
  }

  const hasNegativeSignal =
    data.feedback.some((row) => row.verdict === -1) ||
    session.helped === false ||
    session.trusted === false ||
    (session.overall_rating !== null && session.overall_rating <= 3);
  if (!hasNegativeSignal) return { analyzed: analysis.analyzed, recommendationsCreated: 0 };

  const { recommendations } = await loadRecommendations(client);
  const generated = await generateRecommendations(client, data, {
    analyst,
    existing: recommendations,
    systemPrompt: buildAnaZeroSystem([], undefined, false),
  });
  return { analyzed: analysis.analyzed, recommendationsCreated: generated.created };
}
