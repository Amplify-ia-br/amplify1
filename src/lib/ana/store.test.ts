import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnaConversationState } from "./conversation";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mocks.from }),
}));

describe("Ana lead persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.from.mockReset();
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
    }), { onConflict: "conversation_id" });
    expect(conversationUpdate).toHaveBeenCalledWith({ status: "qualified" });
  });

  it("does not create a lead for a social conversation", async () => {
    const { saveAnaLeadSnapshot } = await import("./store");
    await expect(saveAnaLeadSnapshot("conversation-1", {
      shouldPersistLead: false,
    } as AnaConversationState)).resolves.toEqual({ persisted: false, reason: "not_a_lead" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
