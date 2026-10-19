import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnaConversationState } from "./conversation";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

describe("Ana lead persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
  });

  it("persists a qualified snapshot and advances the conversation", async () => {
    const leadSingle = vi.fn().mockResolvedValue({ data: { id: "lead-1", stage: "qualified" }, error: null });
    const leadSelect = vi.fn(() => ({ single: leadSingle }));
    const leadUpsert = vi.fn(() => ({ select: leadSelect }));
    const conversationEq = vi.fn().mockResolvedValue({ error: null });
    const conversationUpdate = vi.fn(() => ({ eq: conversationEq }));
    mocks.from.mockImplementation((table: string) => table === "ana_leads"
      ? { upsert: leadUpsert }
      : { update: conversationUpdate });

    const { saveAnaLeadSnapshot } = await import("./store");
    const state = {
      shouldPersistLead: true,
      leadStage: "qualified",
      qualification: {
        offerInterest: "leia",
        role: "diretor(a)",
        gradeFit: true,
        studentCount: 200,
        internetReady: true,
        commercialIntent: true,
        meetingIntent: false,
        contactConsent: false,
        contactRevoked: false,
        answers: {
          organization: { status: "provided", answer: "Escola Sintética" },
          timeline: { status: "unknown", answer: "Não sei" },
          mainConstraint: { status: "declined", answer: "Prefiro não informar" },
        },
      },
    } as AnaConversationState;

    await expect(saveAnaLeadSnapshot("conversation-1", state)).resolves.toMatchObject({
      persisted: true,
      leadId: "lead-1",
      stage: "qualified",
    });
    expect(leadUpsert).toHaveBeenCalledWith(expect.objectContaining({
      conversation_id: "conversation-1",
      offer_interest: "leia",
      stage: "qualified",
      contact_consent: false,
      qualification: expect.objectContaining({ answers: state.qualification.answers }),
      summary: expect.stringContaining("Pendente: timeline: não sabe — Não sei"),
    }), { onConflict: "conversation_id", defaultToNull: false });
    expect(conversationUpdate).toHaveBeenCalledWith({ status: "qualified" });
    expect(leadUpsert).toHaveBeenCalledWith(expect.objectContaining({
      summary: expect.stringContaining("Pendente: mainConstraint: preferiu não informar"),
    }), expect.anything());
  });

  it("does not create a lead for a social conversation", async () => {
    const { saveAnaLeadSnapshot } = await import("./store");
    await expect(saveAnaLeadSnapshot("conversation-1", {
      shouldPersistLead: false,
    } as AnaConversationState)).resolves.toEqual({ persisted: false, reason: "not_a_lead" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("loads the persisted qualification using the conversation key", async () => {
    const conversationMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "conversation-1" }, error: null });
    const conversationQuery = { eq: vi.fn(), maybeSingle: conversationMaybeSingle };
    conversationQuery.eq.mockReturnValue(conversationQuery);
    const conversationSelect = vi.fn(() => conversationQuery);
    const leadMaybeSingle = vi.fn().mockResolvedValue({
      data: { qualification: { offerInterest: "leia", studentCount: 90, internetReady: true } },
      error: null,
    });
    const leadEq = vi.fn(() => ({ maybeSingle: leadMaybeSingle }));
    const leadSelect = vi.fn(() => ({ eq: leadEq }));
    mocks.from.mockImplementation((table: string) => table === "ana_conversations"
      ? { select: conversationSelect }
      : { select: leadSelect });

    const { loadAnaLeadQualification } = await import("./store");
    await expect(loadAnaLeadQualification("77777777-7777-4777-8777-777777777777", "a".repeat(64))).resolves.toMatchObject({
      offerInterest: "leia",
      studentCount: 90,
      internetReady: true,
    });
    expect(conversationQuery.eq).toHaveBeenCalledWith("session_hash", "a".repeat(64));
  });

  it("loads a bounded canonical conversation history in chronological order", async () => {
    const conversationMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "conversation-1" }, error: null });
    const conversationQuery = { eq: vi.fn(), maybeSingle: conversationMaybeSingle };
    conversationQuery.eq.mockReturnValue(conversationQuery);
    const conversationSelect = vi.fn(() => conversationQuery);
    const messagesLimit = vi.fn().mockResolvedValue({
      data: [
        { id: "2", external_id: "assistant:1", role: "assistant", content: "Qual é o seu nome?", created_at: "2026-10-10T10:01:00Z" },
        { id: "1", external_id: "user:1", role: "user", content: "Oi", created_at: "2026-10-10T10:00:00Z" },
      ],
      error: null,
    });
    const messagesOrder = vi.fn(() => ({ limit: messagesLimit }));
    const messagesIn = vi.fn(() => ({ order: messagesOrder }));
    const messagesEq = vi.fn(() => ({ in: messagesIn }));
    const messagesSelect = vi.fn(() => ({ eq: messagesEq }));
    mocks.from.mockImplementation((table: string) => table === "ana_conversations"
      ? { select: conversationSelect }
      : { select: messagesSelect });

    const { loadAnaConversationMessages } = await import("./store");
    const messages = await loadAnaConversationMessages("77777777-7777-4777-8777-777777777777", "b".repeat(64));
    expect(messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(messages[0].parts[0]).toMatchObject({ type: "text", text: "Oi" });
    expect(conversationQuery.eq).toHaveBeenCalledWith("session_hash", "b".repeat(64));
  });

  it("claims a conversation for the signed session before inserting a server message", async () => {
    mocks.rpc.mockResolvedValue({ data: "conversation-1", error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert });

    const { saveAnaMessage } = await import("./store");
    await expect(saveAnaMessage({
      conversationKey: "77777777-7777-4777-8777-777777777777",
      sessionHash: "c".repeat(64),
      externalId: "user:server-generated",
      role: "user",
      content: "Oi",
    })).resolves.toEqual({ persisted: true, conversationId: "conversation-1" });
    expect(mocks.rpc).toHaveBeenCalledWith("claim_ana_conversation", {
      p_conversation_key: "77777777-7777-4777-8777-777777777777",
      p_session_hash: "c".repeat(64),
      p_page_path: null,
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      conversation_id: "conversation-1",
      external_id: "user:server-generated",
    }));
  });

  it("rejects a conversation key already bound to another session", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const { saveAnaMessage } = await import("./store");
    await expect(saveAnaMessage({
      conversationKey: "77777777-7777-4777-8777-777777777777",
      sessionHash: "d".repeat(64),
      externalId: "user:server-generated",
      role: "user",
      content: "Oi",
    })).resolves.toEqual({ persisted: false, reason: "forbidden" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("uses the server-only RPC for distributed rate limiting", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ allowed: false, remaining: 0, reset_at: "2026-10-10T18:00:00Z" }],
      error: null,
    });
    const { checkAnaRateLimit } = await import("./store");
    await expect(checkAnaRateLimit("a".repeat(64), 30, 300)).resolves.toMatchObject({
      configured: true,
      allowed: false,
      remaining: 0,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("consume_ana_rate_limit", {
      p_identity_hash: "a".repeat(64),
      p_window_seconds: 300,
      p_max_requests: 30,
    });
  });

  it("fails closed in production when the distributed limiter is not configured", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.VERCEL_ENV = "production";

    const { checkAnaRateLimit } = await import("./store");
    await expect(checkAnaRateLimit("e".repeat(64))).resolves.toEqual({
      configured: false,
      allowed: false,
      reason: "not_configured",
    });
    delete process.env.VERCEL_ENV;
  });
});
