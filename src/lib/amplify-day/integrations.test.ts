import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  syncSubscriber: vi.fn(),
  tagSubscriber: vi.fn(),
}));

vi.mock("./mailer.js", () => ({ sendAmplifyDayConfirmation: mocks.sendEmail }));
vi.mock("../kit-events.js", () => ({
  syncKitSubscriberEvent: mocks.syncSubscriber,
  tagKitSubscriber: mocks.tagSubscriber,
}));

import {
  buildIntegrationStatusUpdate,
  runAmplifyDayIntegrations,
  summarizeIntegrationError,
} from "./integrations.js";

const invitation = {
  id: "invite-1",
  guest_name: "Maria Souza",
  guest_email: "maria@empresa.com",
  guest_company: "Empresa",
  code: "AMP-ABC234",
  registration_origin: "open_application",
  target_stage: "teia",
};

beforeEach(() => vi.clearAllMocks());

describe("Amplify Day confirmation integrations", () => {
  it("turns Kit 401 responses into an actionable error", () => {
    expect(summarizeIntegrationError("kit", { status: 401, body: { errors: ["The API key is invalid"] } }))
      .toBe("Credencial do Kit inválida (HTTP 401).");
  });

  it("does not attempt the tag when subscriber synchronization fails", async () => {
    mocks.syncSubscriber.mockResolvedValue({ ok: false, subscriber: { status: 401, body: { errors: ["The API key is invalid"] } } });
    const results = await runAmplifyDayIntegrations(invitation, ["kit"]);
    expect(results.kit).toMatchObject({ ok: false, error: "Credencial do Kit inválida (HTTP 401)." });
    expect(mocks.tagSubscriber).not.toHaveBeenCalled();
  });

  it("retries only the requested failed integration and builds its database update", async () => {
    mocks.syncSubscriber.mockResolvedValue({ ok: true });
    mocks.tagSubscriber.mockResolvedValue({ ok: true });
    const results = await runAmplifyDayIntegrations(invitation, ["kit"]);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(buildIntegrationStatusUpdate(results)).toEqual({ kit_sync_status: "synced", kit_sync_error: null });
    expect(mocks.syncSubscriber).toHaveBeenCalledWith(expect.objectContaining({
      registrationCode: "AMP-ABC234",
      registrationStatus: "confirmed",
      registrationOrigin: "open_application",
      amplifyDayStage: "Palco TEIA",
    }));
    expect(mocks.tagSubscriber).toHaveBeenCalledWith("maria@empresa.com", "amplify-day-2026-palco-teia");
  });
});
