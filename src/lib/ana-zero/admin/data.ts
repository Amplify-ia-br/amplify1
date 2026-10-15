import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AnalysisRunRow,
  Dataset,
  FeedbackRow,
  RecommendationRow,
  SessionAnalysisRow,
  SessionRow,
  TurnAnalysisRow,
  TurnRow,
} from "./types.js";

const PAGE = 1000;
const MAX_ROWS = 10_000;

const TURN_COLUMNS =
  "session_id,turn_index,created_at,user_text,assistant_text,resolved_model,tool_calls,memory,issues,regenerated,errors,total_tokens,estimated_cost_usd,latency_ms";

async function fetchAll<T>(
  client: SupabaseClient,
  table: string,
  columns: string,
  orderBy: string,
  optional = false,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order(orderBy, { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      if (optional) return rows;
      throw error;
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

// Colunas novas (prompt_version etc.) só existem após a migração de análises.
async function fetchTurns(client: SupabaseClient): Promise<TurnRow[]> {
  const withNew = `${TURN_COLUMNS},sources,handoff,prompt_version`;
  try {
    return await fetchAll<TurnRow>(client, "ana_test_turns", withNew, "created_at");
  } catch {
    return fetchAll<TurnRow>(client, "ana_test_turns", TURN_COLUMNS, "created_at");
  }
}

export async function loadDataset(client: SupabaseClient): Promise<Dataset> {
  const [sessions, turns, feedback, turnAnalyses, sessionAnalyses] = await Promise.all([
    fetchAll<SessionRow>(
      client,
      "ana_test_sessions",
      "id,created_at,tester_name,mission,model,overall_rating,helped,closing_comment",
      "created_at",
    ),
    fetchTurns(client),
    fetchAll<FeedbackRow>(
      client,
      "ana_test_feedback",
      "id,session_id,turn_index,verdict,reasons,comment,created_at",
      "created_at",
    ),
    fetchAll<TurnAnalysisRow>(
      client,
      "ana_turn_analyses",
      "session_id,turn_index,naturalness,relevance,factuality,commercial_progress,conciseness,tags,failure_category,summary",
      "created_at",
      true,
    ),
    fetchAll<SessionAnalysisRow>(
      client,
      "ana_session_analyses",
      "session_id,goal_reached,stage_reached,topics,intent,objections,summary,turn_count_at_analysis,created_at",
      "created_at",
      true,
    ),
  ]);
  return { sessions, turns, feedback, turnAnalyses, sessionAnalyses };
}

export async function loadRecommendations(client: SupabaseClient) {
  const [recommendations, runs] = await Promise.all([
    fetchAll<RecommendationRow>(
      client,
      "ana_recommendations",
      "id,run_id,title,rationale,evidence,proposed_change,regression_scenario,status,decision_note,decided_at,implemented_commit,prompt_version,created_at",
      "created_at",
      true,
    ),
    fetchAll<AnalysisRunRow>(
      client,
      "ana_analysis_runs",
      "id,kind,model,status,sessions_analyzed,turns_analyzed,recommendations_created,cost_usd,error,created_at,finished_at",
      "created_at",
      true,
    ),
  ]);
  return { recommendations, runs: runs.slice(0, 20) };
}
