import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../ana/store", () => ({ getServerClient: vi.fn() }));
vi.mock("./data", () => ({ loadSessionDataset: vi.fn(), loadRecommendations: vi.fn() }));
vi.mock("./analyzer", () => ({
  analyzeSessions: vi.fn(),
  createAnalyst: vi.fn(),
  generateRecommendations: vi.fn(),
}));
vi.mock("../prompt", () => ({ buildAnaZeroSystem: vi.fn(() => "prompt") }));

import { analyzeSessions, generateRecommendations } from "./analyzer";
import { analyzeCompletedSession } from "./automatic";
import { loadRecommendations, loadSessionDataset } from "./data";

const client = {} as SupabaseClient;
const analyst = { model: "test", run: vi.fn() } as never;
const session = {
  id: "s1",
  created_at: "2026-10-19T00:00:00Z",
  tester_name: "Davi",
  mission: "dono-escola",
  model: "test",
  overall_rating: 5,
  helped: true,
  trusted: true,
  closing_comment: null,
};

describe("análise automática ao concluir o teste", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadSessionDataset).mockResolvedValue({
      sessions: [session],
      turns: [{ session_id: "s1", turn_index: 1 } as never],
      feedback: [{ verdict: 1 } as never],
      turnAnalyses: [],
      sessionAnalyses: [],
    });
    vi.mocked(analyzeSessions).mockResolvedValue({ analyzed: 1, failures: 0, remaining: 0, costUsd: 0, runId: "r1" });
    vi.mocked(loadRecommendations).mockResolvedValue({ recommendations: [], runs: [] });
    vi.mocked(generateRecommendations).mockResolvedValue({ runId: "r2", created: 1, discarded: 0, costUsd: 0 });
  });

  it("analisa toda conversa concluída sem gerar recomendação quando o sinal é positivo", async () => {
    const result = await analyzeCompletedSession("s1", { client, analyst });
    expect(result).toEqual({ analyzed: 1, recommendationsCreated: 0 });
    expect(analyzeSessions).toHaveBeenCalledWith(client, expect.anything(), expect.objectContaining({ sessionIds: ["s1"] }));
    expect(generateRecommendations).not.toHaveBeenCalled();
  });

  it("gera recomendação quando há feedback negativo", async () => {
    vi.mocked(loadSessionDataset).mockResolvedValue({
      sessions: [{ ...session, overall_rating: 2, helped: false, trusted: false }],
      turns: [{ session_id: "s1", turn_index: 1 } as never],
      feedback: [{ verdict: -1 } as never],
      turnAnalyses: [],
      sessionAnalyses: [],
    });
    const result = await analyzeCompletedSession("s1", { client, analyst });
    expect(result).toEqual({ analyzed: 1, recommendationsCreated: 1 });
    expect(generateRecommendations).toHaveBeenCalledOnce();
  });
});
