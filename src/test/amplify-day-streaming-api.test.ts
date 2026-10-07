import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncSubscriber: vi.fn(),
  tagSubscriber: vi.fn(),
}));

vi.mock("../lib/kit-events.js", () => ({
  syncKitSubscriberEvent: mocks.syncSubscriber,
  tagKitSubscriber: mocks.tagSubscriber,
}));

import handler from "../../api/amplify-day-streaming.js";

const submit = async (body: Record<string, unknown>) => handler(new Request(
  "https://amplify.ia.br/api/amplify-day-streaming",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  },
));

describe("Ampl_IA Day streaming production API", () => {
  beforeEach(() => {
    mocks.syncSubscriber.mockReset().mockResolvedValue({ ok: true });
    mocks.tagSubscriber.mockReset().mockResolvedValue({ ok: true });
  });

  it("rejects invalid fields before calling Kit", async () => {
    const response = await submit({ name: "L", email: "invalid" });
    expect(response.status).toBe(422);
    expect(mocks.syncSubscriber).not.toHaveBeenCalled();
  });

  it("creates the subscriber and applies core and attribution tags", async () => {
    const response = await submit({
      name: "Lead Teste",
      email: "lead@example.com",
      school: "Escola Exemplo",
      role: "Direção",
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
      email: "lead@example.com",
      company: "Escola Exemplo",
    }));
    expect(mocks.tagSubscriber).toHaveBeenCalledWith("lead@example.com", "amplify-day-2026-streaming");
    expect(mocks.tagSubscriber).toHaveBeenCalledWith("lead@example.com", "amplify-day:utm-source:hunter");
  });

  it("does not report success when Kit rejects the subscriber", async () => {
    mocks.syncSubscriber.mockResolvedValue({ ok: false });
    const response = await submit({
      name: "Lead Teste",
      email: "lead@example.com",
      school: "Escola Exemplo",
      role: "Direção",
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ ok: false, captured: false, error: "kit_error" });
    expect(mocks.tagSubscriber).not.toHaveBeenCalled();
  });
});
