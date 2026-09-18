import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncSubscriber: vi.fn(),
  tagSubscriber: vi.fn(),
}));

vi.mock("../../../lib/kit-events.js", () => ({
  syncKitSubscriberEvent: mocks.syncSubscriber,
  tagKitSubscriber: mocks.tagSubscriber,
}));

import { POST } from "./streaming";

const submit = async (body: Record<string, unknown>) => POST({
  request: new Request("https://amplify.ia.br/api/amplify-day/streaming", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }),
} as never);

describe("Ampl_IA Day streaming registration", () => {
  beforeEach(() => {
    mocks.syncSubscriber.mockReset().mockResolvedValue({ ok: true });
    mocks.tagSubscriber.mockReset().mockResolvedValue({ ok: true });
  });

  it("rejects incomplete registrations before calling Kit", async () => {
    const response = await submit({ name: "L", email: "invalid" });
    expect(response.status).toBe(422);
    expect(mocks.syncSubscriber).not.toHaveBeenCalled();
  });

  it("creates the subscriber and applies streaming and attribution tags", async () => {
    const response = await submit({
      name: "Leonardo Camacho",
      email: "leonardo@example.com",
      school: "Escola Exemplo",
      role: "Diretor",
      utm_source: "Hunter",
      utm_medium: "email",
      utm_campaign: "amplify_day_2026_streaming",
      utm_content: "convite",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, captured: true, attributionSynced: true });
    expect(mocks.syncSubscriber).toHaveBeenCalledWith(expect.objectContaining({
      source: "amplify-day-streaming",
      eventName: "amplify_day_streaming_registration",
      name: "Leonardo Camacho",
      email: "leonardo@example.com",
      company: "Escola Exemplo",
      role: "Diretor",
    }));
    expect(mocks.tagSubscriber).toHaveBeenCalledWith("leonardo@example.com", "amplify-day-2026-streaming");
    expect(mocks.tagSubscriber).toHaveBeenCalledWith("leonardo@example.com", "amplify-day:utm-source:hunter");
    expect(mocks.tagSubscriber).toHaveBeenCalledWith("leonardo@example.com", "amplify-day:utm-campaign:amplify-day-2026-streaming");
  });

  it("does not report success when Kit rejects the subscriber", async () => {
    mocks.syncSubscriber.mockResolvedValue({ ok: false });
    const response = await submit({
      name: "Leonardo Camacho",
      email: "leonardo@example.com",
      school: "Escola Exemplo",
      role: "Diretor",
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ ok: false, captured: false, error: "kit_error" });
    expect(mocks.tagSubscriber).not.toHaveBeenCalled();
  });
});
