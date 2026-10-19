import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../ana/session", () => ({ resolveAnaSession: async () => ({ sessionHash: "abc", setCookie: undefined }) }));
vi.mock("../ana/store", () => ({
  checkAnaRateLimit: vi.fn(async () => ({ allowed: true })),
  getServerClient: () => null,
}));

import { checkAnaRateLimit } from "../ana/store";
import type { KnowledgeReader } from "../okf/http";
import { hasValidTestToken } from "./access";
import { handleAnaZeroFeedback } from "./feedback-http";
import { handleAnaZeroChat } from "./http";
import { PROMPT_VERSION } from "./prompt";
import { anaZeroFeedbackSchema } from "./schema";
import type { AnaTestStore } from "./testing-store";

const SESSION_ID = "6f1d7a52-3b0e-4c53-9d0a-0b7f4f6e2a11";

const fakeTurn = {
  text: "Oi, eu sou a Ana.",
  resolvedModel: "openai/gpt-5.4-mini-fast",
  toolCalls: [],
  sources: [],
  memory: [],
  handoff: false,
  regenerated: false,
  issues: [],
  errors: [],
  usage: { totalTokens: 10 },
  estimatedCostUsd: 0.001,
};

const makeStore = (): AnaTestStore => ({
  saveTurn: vi.fn(async () => true),
  saveTurnFeedback: vi.fn(async () => true),
  saveSessionFeedback: vi.fn(async () => true),
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const chatBody = (extra: Record<string, unknown> = {}) => ({
  messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "Oi" }] }],
  ...extra,
});

describe("acesso por token", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("libera o acesso quando nenhum token está configurado", async () => {
    vi.stubEnv("ANA_TEST_TOKEN", "");
    expect(await hasValidTestToken(post({}))).toBe(true);
  });

  it("exige o token correto quando configurado", async () => {
    vi.stubEnv("ANA_TEST_TOKEN", "segredo");
    expect(await hasValidTestToken(post({}))).toBe(false);
    expect(await hasValidTestToken(post({}, { "x-ana-test-token": "errado" }))).toBe(false);
    expect(await hasValidTestToken(post({}, { "x-ana-test-token": "segredo" }))).toBe(true);
  });

  it("rejeita chat e feedback sem token válido", async () => {
    vi.stubEnv("ANA_TEST_TOKEN", "segredo");
    const run = vi.fn();
    const chat = await handleAnaZeroChat(post(chatBody()), {} as KnowledgeReader, run as never, makeStore());
    expect(chat.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    const feedback = await handleAnaZeroFeedback(
      post({ kind: "session", sessionId: SESSION_ID, rating: 5 }),
      makeStore(),
    );
    expect(feedback.status).toBe(401);
  });
});

describe("gravação do turno", () => {
  beforeEach(() => {
    vi.stubEnv("ANA_TEST_TOKEN", "");
    vi.mocked(checkAnaRateLimit).mockResolvedValue({ allowed: true } as never);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("grava o turno quando há sessionId e identifica testador e missão", async () => {
    const store = makeStore();
    const run = vi.fn(async () => fakeTurn);
    const response = await handleAnaZeroChat(
      post(chatBody({
        sessionId: SESSION_ID,
        tester: "Maria",
        mission: "dono-escola",
        missionOrigin: "recommended",
        missionMappingVersion: "2026-10-v1",
      })),
      {} as KnowledgeReader,
      run as never,
      store,
    );
    await response.text();
    expect(store.saveTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: SESSION_ID,
        testerName: "Maria",
        mission: "dono-escola",
        missionOrigin: "recommended",
        missionMappingVersion: "2026-10-v1",
        turnIndex: 1,
        userText: "Oi",
        assistantText: "Oi, eu sou a Ana.",
        sources: [],
        promptVersion: PROMPT_VERSION,
      }),
    );
  });

  it("não grava nada sem sessionId", async () => {
    const store = makeStore();
    const response = await handleAnaZeroChat(post(chatBody()), {} as KnowledgeReader, (async () => fakeTurn) as never, store);
    await response.text();
    expect(store.saveTurn).not.toHaveBeenCalled();
  });

  it("aplica também o limite diário", async () => {
    vi.mocked(checkAnaRateLimit)
      .mockResolvedValueOnce({ allowed: true } as never)
      .mockResolvedValueOnce({ allowed: false } as never);
    const response = await handleAnaZeroChat(post(chatBody()), {} as KnowledgeReader, (async () => fakeTurn) as never, makeStore());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("86400");
  });
});

describe("feedback", () => {
  beforeEach(() => {
    vi.stubEnv("ANA_TEST_TOKEN", "");
    vi.mocked(checkAnaRateLimit).mockResolvedValue({ allowed: true } as never);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("valida o contrato", () => {
    expect(anaZeroFeedbackSchema.safeParse({ kind: "turn", sessionId: SESSION_ID, turnIndex: 1, verdict: -1, reasons: ["robotica"] }).success).toBe(true);
    expect(anaZeroFeedbackSchema.safeParse({ kind: "turn", sessionId: SESSION_ID, turnIndex: 1, verdict: 0 }).success).toBe(false);
    expect(anaZeroFeedbackSchema.safeParse({ kind: "turn", sessionId: SESSION_ID, turnIndex: 1, verdict: 1, reasons: ["inventado"] }).success).toBe(false);
    expect(anaZeroFeedbackSchema.safeParse({ kind: "session", sessionId: "x", rating: 3 }).success).toBe(false);
    expect(anaZeroFeedbackSchema.safeParse({ kind: "session", sessionId: SESSION_ID, rating: 6 }).success).toBe(false);
  });

  it("grava feedback da resposta e da conversa", async () => {
    const store = makeStore();
    const turn = await handleAnaZeroFeedback(
      post({ kind: "turn", sessionId: SESSION_ID, turnIndex: 2, verdict: -1, reasons: ["repetitiva"], comment: "repetiu" }),
      store,
    );
    expect(turn.status).toBe(200);
    expect(store.saveTurnFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ turnIndex: 2, verdict: -1, reasons: ["repetitiva"], comment: "repetiu" }),
    );
    const session = await handleAnaZeroFeedback(
      post({ kind: "session", sessionId: SESSION_ID, rating: 4, helped: true }),
      store,
    );
    expect(session.status).toBe(200);
    expect(store.saveSessionFeedback).toHaveBeenCalledWith(expect.objectContaining({ rating: 4, helped: true }));
  });

  it("responde 503 quando não consegue gravar", async () => {
    const store = makeStore();
    vi.mocked(store.saveTurnFeedback).mockResolvedValue(false);
    const response = await handleAnaZeroFeedback(
      post({ kind: "turn", sessionId: SESSION_ID, turnIndex: 1, verdict: 1 }),
      store,
    );
    expect(response.status).toBe(503);
  });
});
