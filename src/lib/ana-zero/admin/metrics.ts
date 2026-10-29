import type {
  Dataset,
  Filters,
  MemoryEntry,
  SessionAnalysisRow,
  SessionRow,
  TurnAnalysisRow,
  TurnRow,
} from "./types.js";

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function ratio(part: number, total: number) {
  return total ? round(part / total, 4) : null;
}

function count<T extends string>(values: T[]) {
  const map = new Map<T, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return [...map.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
}

export function applyFilters(data: Dataset, filters: Filters): Dataset {
  const from = filters.from ? Date.parse(filters.from) : undefined;
  const to = filters.to ? Date.parse(filters.to) + 86_400_000 : undefined;

  let turns = data.turns;
  if (filters.promptVersion) turns = turns.filter((turn) => turn.prompt_version === filters.promptVersion);
  const sessionsWithVersion = filters.promptVersion ? new Set(turns.map((turn) => turn.session_id)) : undefined;

  const sessions = data.sessions.filter((session) => {
    const created = Date.parse(session.created_at);
    if (from !== undefined && created < from) return false;
    if (to !== undefined && created >= to) return false;
    if (filters.mission && session.mission !== filters.mission) return false;
    if (filters.profile && session.tester_profile !== filters.profile) return false;
    if (filters.missionOrigin && session.mission_origin !== filters.missionOrigin) return false;
    if (filters.model && session.model !== filters.model) return false;
    if (sessionsWithVersion && !sessionsWithVersion.has(session.id)) return false;
    return true;
  });
  const ids = new Set(sessions.map((session) => session.id));
  const keptTurns = turns.filter((turn) => ids.has(turn.session_id));
  const turnKeys = new Set(keptTurns.map((turn) => `${turn.session_id}:${turn.turn_index}`));

  return {
    sessions,
    turns: keptTurns,
    feedback: data.feedback.filter((row) => turnKeys.has(`${row.session_id}:${row.turn_index}`)),
    turnAnalyses: data.turnAnalyses.filter((row) => turnKeys.has(`${row.session_id}:${row.turn_index}`)),
    sessionAnalyses: data.sessionAnalyses.filter((row) => ids.has(row.session_id)),
  };
}

export function filterOptions(data: Dataset) {
  const unique = (values: Array<string | null | undefined>) =>
    [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  return {
    missions: unique(data.sessions.map((s) => s.mission)),
    profiles: unique(data.sessions.map((s) => s.tester_profile)),
    missionOrigins: unique(data.sessions.map((s) => s.mission_origin)),
    models: unique(data.sessions.map((s) => s.model)),
    promptVersions: unique(data.turns.map((t) => t.prompt_version)),
  };
}

export function computeOverview(data: Dataset) {
  const { sessions, turns, feedback } = data;
  const rated = feedback.length;
  const positive = feedback.filter((row) => row.verdict === 1).length;
  const ratings = sessions.map((s) => s.overall_rating).filter((v): v is number => v !== null);
  const helpedAnswered = sessions.filter((s) => s.helped !== null);
  const latencies = turns.map((t) => t.latency_ms).filter((v): v is number => v !== null);
  const costs = turns.map((t) => t.estimated_cost_usd ?? 0);

  const turnsBySession = new Map<string, number>();
  for (const turn of turns) turnsBySession.set(turn.session_id, (turnsBySession.get(turn.session_id) ?? 0) + 1);

  const reasons = count(feedback.filter((row) => row.verdict === -1).flatMap((row) => row.reasons ?? []));
  const days = new Map<string, { turns: number; positive: number; negative: number }>();
  const dayOf = (iso: string) => iso.slice(0, 10);
  for (const turn of turns) {
    const entry = days.get(dayOf(turn.created_at)) ?? { turns: 0, positive: 0, negative: 0 };
    entry.turns += 1;
    days.set(dayOf(turn.created_at), entry);
  }
  const turnDay = new Map(turns.map((t) => [`${t.session_id}:${t.turn_index}`, dayOf(t.created_at)]));
  for (const row of feedback) {
    const day = turnDay.get(`${row.session_id}:${row.turn_index}`);
    if (!day) continue;
    const entry = days.get(day);
    if (!entry) continue;
    if (row.verdict === 1) entry.positive += 1;
    else entry.negative += 1;
  }

  return {
    sessions: sessions.length,
    testers: new Set(sessions.map((s) => s.tester_name.trim().toLowerCase())).size,
    turns: turns.length,
    avgTurnsPerSession: round(average([...turnsBySession.values()]) ?? 0, 1),
    ratedTurns: rated,
    ratedShare: ratio(rated, turns.length),
    positiveRate: ratio(positive, rated),
    avgRating: ratings.length ? round(average(ratings) ?? 0, 2) : null,
    helpedRate: ratio(helpedAnswered.filter((s) => s.helped).length, helpedAnswered.length),
    issueRate: ratio(turns.filter((t) => (t.issues?.length ?? 0) > 0).length, turns.length),
    regenerationRate: ratio(turns.filter((t) => t.regenerated).length, turns.length),
    errorRate: ratio(turns.filter((t) => (t.errors?.length ?? 0) > 0).length, turns.length),
    latencyP50: percentile(latencies, 50),
    latencyP95: percentile(latencies, 95),
    totalCostUsd: round(costs.reduce((a, b) => a + b, 0), 4),
    costPerSessionUsd: sessions.length ? round(costs.reduce((a, b) => a + b, 0) / sessions.length, 4) : null,
    topReasons: reasons,
    byDay: [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, value]) => ({ day, ...value })),
  };
}

export function computeByPromptVersion(data: Dataset) {
  const versions = [...new Set(data.turns.map((t) => t.prompt_version ?? "sem-versao"))].sort();
  return versions.map((version) => {
    const turns = data.turns.filter((t) => (t.prompt_version ?? "sem-versao") === version);
    const keys = new Set(turns.map((t) => `${t.session_id}:${t.turn_index}`));
    const feedback = data.feedback.filter((row) => keys.has(`${row.session_id}:${row.turn_index}`));
    const sessionIds = new Set(turns.map((t) => t.session_id));
    const sessionRatings = data.sessions
      .filter((s) => sessionIds.has(s.id) && s.overall_rating !== null)
      .map((s) => s.overall_rating as number);
    const latencies = turns.map((t) => t.latency_ms).filter((v): v is number => v !== null);
    return {
      version,
      sessions: sessionIds.size,
      turns: turns.length,
      ratedTurns: feedback.length,
      positiveRate: ratio(feedback.filter((r) => r.verdict === 1).length, feedback.length),
      avgRating: sessionRatings.length ? round(average(sessionRatings) ?? 0, 2) : null,
      issueRate: ratio(turns.filter((t) => (t.issues?.length ?? 0) > 0).length, turns.length),
      regenerationRate: ratio(turns.filter((t) => t.regenerated).length, turns.length),
      costPerTurnUsd: turns.length
        ? round(turns.reduce((a, t) => a + (t.estimated_cost_usd ?? 0), 0) / turns.length, 5)
        : null,
      latencyP50: percentile(latencies, 50),
      firstSeen: turns.reduce((min, t) => (t.created_at < min ? t.created_at : min), turns[0]?.created_at ?? ""),
    };
  });
}

const SCORE_KEYS = ["naturalness", "relevance", "factuality", "commercial_progress", "conciseness"] as const;

export function computeContent(data: Dataset) {
  const { sessionAnalyses, turnAnalyses, turns, sessions } = data;
  const scores = Object.fromEntries(
    SCORE_KEYS.map((key) => {
      const values = turnAnalyses.map((row) => row[key]).filter((v): v is number => v !== null);
      return [key, values.length ? round(average(values) ?? 0, 2) : null];
    }),
  );

  const latestMemory = new Map<string, MemoryEntry[]>();
  const lastTurn = new Map<string, TurnRow>();
  for (const turn of turns) {
    const current = lastTurn.get(turn.session_id);
    if (!current || turn.turn_index > current.turn_index) lastTurn.set(turn.session_id, turn);
  }
  for (const [id, turn] of lastTurn) latestMemory.set(id, turn.memory ?? []);
  const memoryKeys = count([...latestMemory.values()].flatMap((memory) => [...new Set(memory.map((m) => m.key))]));

  return {
    analyzedSessions: sessionAnalyses.length,
    totalSessions: sessions.length,
    analyzedTurns: turnAnalyses.length,
    goalReachedRate: ratio(
      sessionAnalyses.filter((s) => s.goal_reached).length,
      sessionAnalyses.filter((s) => s.goal_reached !== null).length,
    ),
    scores,
    topics: count(sessionAnalyses.flatMap((s) => s.topics ?? [])).slice(0, 15),
    objections: count(sessionAnalyses.flatMap((s) => s.objections ?? [])).slice(0, 15),
    intents: count(sessionAnalyses.map((s) => s.intent ?? "").filter(Boolean)).slice(0, 10),
    stages: count(sessionAnalyses.map((s) => s.stage_reached ?? "").filter(Boolean)),
    failureCategories: count(
      turnAnalyses.map((t) => t.failure_category ?? "").filter((c) => c && c !== "nenhuma"),
    ),
    tags: count(turnAnalyses.flatMap((t) => t.tags ?? [])).slice(0, 15),
    toolUsage: count(turns.flatMap((t) => t.tool_calls ?? [])),
    topSources: count(turns.flatMap((t) => (t.sources ?? []).map((s) => s.title))).slice(0, 10),
    handoffs: turns.filter((t) => Boolean(t.handoff)).length,
    memoryCoverage: memoryKeys.map(({ name, total }) => ({
      key: name,
      sessions: total,
      share: ratio(total, latestMemory.size),
    })),
  };
}

export function summarizeSessions(data: Dataset) {
  const turnsBySession = new Map<string, TurnRow[]>();
  for (const turn of data.turns) {
    const list = turnsBySession.get(turn.session_id) ?? [];
    list.push(turn);
    turnsBySession.set(turn.session_id, list);
  }
  const feedbackBySession = new Map<string, number[]>();
  for (const row of data.feedback) {
    const list = feedbackBySession.get(row.session_id) ?? [];
    list.push(row.verdict);
    feedbackBySession.set(row.session_id, list);
  }
  const analyses = new Map<string, SessionAnalysisRow>(data.sessionAnalyses.map((a) => [a.session_id, a]));

  return data.sessions
    .map((session) => {
      const turns = turnsBySession.get(session.id) ?? [];
      const verdicts = feedbackBySession.get(session.id) ?? [];
      const analysis = analyses.get(session.id);
      return {
        id: session.id,
        createdAt: session.created_at,
        testerName: session.tester_name,
        mission: session.mission,
        testerProfile: session.tester_profile ?? null,
        missionOrigin: session.mission_origin ?? null,
        model: session.model,
        turns: turns.length,
        positive: verdicts.filter((v) => v === 1).length,
        negative: verdicts.filter((v) => v === -1).length,
        overallRating: session.overall_rating,
        helped: session.helped,
        hasIssues: turns.some((t) => (t.issues?.length ?? 0) > 0),
        hasErrors: turns.some((t) => (t.errors?.length ?? 0) > 0),
        costUsd: round(turns.reduce((a, t) => a + (t.estimated_cost_usd ?? 0), 0), 5),
        analyzed: Boolean(analysis),
        analysisSummary: analysis?.summary ?? null,
        goalReached: analysis?.goal_reached ?? null,
        stageReached: analysis?.stage_reached ?? null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function buildSessionDetail(data: Dataset, sessionId: string) {
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const turnAnalyses = new Map<number, TurnAnalysisRow>(
    data.turnAnalyses.filter((a) => a.session_id === sessionId).map((a) => [a.turn_index, a]),
  );
  const feedback = new Map(data.feedback.filter((f) => f.session_id === sessionId).map((f) => [f.turn_index, f]));
  const turns = data.turns
    .filter((t) => t.session_id === sessionId)
    .sort((a, b) => a.turn_index - b.turn_index)
    .map((turn) => ({
      ...turn,
      feedback: feedback.get(turn.turn_index) ?? null,
      analysis: turnAnalyses.get(turn.turn_index) ?? null,
    }));
  return {
    session,
    analysis: data.sessionAnalyses.find((a) => a.session_id === sessionId) ?? null,
    turns,
  };
}

export type SessionSummary = ReturnType<typeof summarizeSessions>[number];
export type { SessionRow };
