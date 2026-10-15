export type MemoryEntry = { key: string; value: string; evidence?: string };

export type SessionRow = {
  id: string;
  created_at: string;
  tester_name: string;
  mission: string;
  model: string;
  overall_rating: number | null;
  helped: boolean | null;
  closing_comment: string | null;
};

export type TurnRow = {
  session_id: string;
  turn_index: number;
  created_at: string;
  user_text: string;
  assistant_text: string;
  resolved_model: string | null;
  tool_calls: string[] | null;
  memory: MemoryEntry[] | null;
  issues: string[] | null;
  regenerated: boolean | null;
  errors: string[] | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  latency_ms: number | null;
  sources?: Array<{ id: string; title: string }> | null;
  handoff?: unknown;
  prompt_version?: string | null;
};

export type FeedbackRow = {
  id: string;
  session_id: string;
  turn_index: number;
  verdict: 1 | -1;
  reasons: string[] | null;
  comment: string | null;
  created_at: string;
};

export type TurnAnalysisRow = {
  session_id: string;
  turn_index: number;
  naturalness: number | null;
  relevance: number | null;
  factuality: number | null;
  commercial_progress: number | null;
  conciseness: number | null;
  tags: string[] | null;
  failure_category: string | null;
  summary: string | null;
};

export type SessionAnalysisRow = {
  session_id: string;
  goal_reached: boolean | null;
  stage_reached: string | null;
  topics: string[] | null;
  intent: string | null;
  objections: string[] | null;
  summary: string | null;
  turn_count_at_analysis: number;
  created_at: string;
};

export type Dataset = {
  sessions: SessionRow[];
  turns: TurnRow[];
  feedback: FeedbackRow[];
  turnAnalyses: TurnAnalysisRow[];
  sessionAnalyses: SessionAnalysisRow[];
};

export type Filters = {
  from?: string;
  to?: string;
  mission?: string;
  model?: string;
  promptVersion?: string;
};

export const RECOMMENDATION_STATUSES = ["nova", "aceita", "rejeitada", "implementada"] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export type RecommendationEvidence = { sessionId: string; turnIndex: number; note: string };

export type RecommendationRow = {
  id: string;
  run_id: string | null;
  title: string;
  rationale: string;
  evidence: RecommendationEvidence[];
  proposed_change: string;
  regression_scenario: string | null;
  status: RecommendationStatus;
  decision_note: string | null;
  decided_at: string | null;
  implemented_commit: string | null;
  prompt_version: string | null;
  created_at: string;
};

export type AnalysisRunRow = {
  id: string;
  kind: "sessions" | "recommendations";
  model: string;
  status: "running" | "completed" | "failed";
  sessions_analyzed: number;
  turns_analyzed: number;
  recommendations_created: number;
  cost_usd: number;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};
