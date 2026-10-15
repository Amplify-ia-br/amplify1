import { getServerClient } from "../ana/store.js";
import type { AnaZeroHandoff, AnaZeroMemoryEntry } from "./schema.js";

const NEW_TURN_COLUMNS = /sources|handoff|prompt_version|app_commit/;

function isMissingColumn(error: { code?: string; message?: string }) {
  return (error.code === "PGRST204" || error.code === "42703") && NEW_TURN_COLUMNS.test(error.message ?? "");
}

export type SaveTestTurnInput = {
  sources?: Array<{ id: string; title: string }>;
  handoff?: AnaZeroHandoff;
  promptVersion?: string;
  appCommit?: string;
  sessionId: string;
  testerName: string;
  testerId?: string;
  cohort?: string;
  mission: string;
  model: string;
  turnIndex: number;
  userText: string;
  assistantText: string;
  resolvedModel?: string;
  toolCalls: string[];
  memory: AnaZeroMemoryEntry[];
  issues: string[];
  regenerated: boolean;
  errors: string[];
  totalTokens?: number;
  estimatedCostUsd?: number;
  latencyMs: number;
};

export type SaveTurnFeedbackInput = {
  sessionId: string;
  turnIndex: number;
  verdict: 1 | -1;
  reasons: string[];
  comment?: string;
};

export type SaveSessionFeedbackInput = {
  sessionId: string;
  rating: number;
  helped?: boolean;
  comment?: string;
};

export type AnaTestStore = {
  saveTurn(input: SaveTestTurnInput): Promise<boolean>;
  saveTurnFeedback(input: SaveTurnFeedbackInput): Promise<boolean>;
  saveSessionFeedback(input: SaveSessionFeedbackInput): Promise<boolean>;
};

function report(action: string, error: unknown) {
  const message = error instanceof Error ? error.message : (error as { message?: string } | null)?.message ?? "erro_desconhecido";
  console.error(`[Ana Zero] Falha ao gravar ${action}`, message);
  return false;
}

export const anaTestStore: AnaTestStore = {
  async saveTurn(input) {
    const supabase = getServerClient();
    if (!supabase) return false;
    try {
      const now = new Date().toISOString();
      const session = await supabase.from("ana_test_sessions").upsert(
        {
          id: input.sessionId,
          tester_name: input.testerName,
          mission: input.mission,
          model: input.model,
          turn_count: input.turnIndex,
          updated_at: now,
          ...(input.testerId ? { tester_id: input.testerId, cohort: input.cohort ?? null } : {}),
        },
        { onConflict: "id" },
      );
      if (session.error) throw session.error;

      const base = {
        session_id: input.sessionId,
        turn_index: input.turnIndex,
        user_text: input.userText,
        assistant_text: input.assistantText,
        resolved_model: input.resolvedModel ?? null,
        tool_calls: input.toolCalls,
        memory: input.memory,
        issues: input.issues,
        regenerated: input.regenerated,
        errors: input.errors,
        total_tokens: input.totalTokens ?? null,
        estimated_cost_usd: input.estimatedCostUsd ?? null,
        latency_ms: input.latencyMs,
      };
      const turn = await supabase.from("ana_test_turns").upsert(
        {
          ...base,
          sources: input.sources ?? [],
          handoff: input.handoff ?? null,
          prompt_version: input.promptVersion ?? null,
          app_commit: input.appCommit ?? null,
        },
        { onConflict: "session_id,turn_index" },
      );
      if (turn.error) {
        // Migração de análises ainda não aplicada: grava sem as colunas novas para não perder o turno.
        if (!isMissingColumn(turn.error)) throw turn.error;
        const legacy = await supabase.from("ana_test_turns").upsert(base, { onConflict: "session_id,turn_index" });
        if (legacy.error) throw legacy.error;
      }
      return true;
    } catch (error) {
      return report("turno", error);
    }
  },

  async saveTurnFeedback(input) {
    const supabase = getServerClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from("ana_test_feedback").upsert(
        {
          session_id: input.sessionId,
          turn_index: input.turnIndex,
          verdict: input.verdict,
          reasons: input.reasons,
          comment: input.comment ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,turn_index" },
      );
      if (error) throw error;
      return true;
    } catch (error) {
      return report("feedback da resposta", error);
    }
  },

  async saveSessionFeedback(input) {
    const supabase = getServerClient();
    if (!supabase) return false;
    try {
      const { data, error } = await supabase
        .from("ana_test_sessions")
        .update({
          overall_rating: input.rating,
          helped: input.helped ?? null,
          closing_comment: input.comment ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.sessionId)
        .select("id");
      if (error) throw error;
      return Array.isArray(data) && data.length > 0;
    } catch (error) {
      return report("feedback da conversa", error);
    }
  },
};
