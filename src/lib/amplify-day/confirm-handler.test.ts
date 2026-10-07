import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveInvitation: vi.fn(),
  sendEmail: vi.fn(),
  syncKit: vi.fn(),
  tagKit: vi.fn(),
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock("./invitations.js", async () => {
  const actual = await vi.importActual<typeof import("./invitations.js")>("./invitations.js");
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: {
        id: "invite-1",
        guest_name: "Maria Souza",
        guest_email: "maria@empresa.com",
        guest_company: "Empresa Atualizada",
        guest_role: "Diretora",
        code: "AMP-7K2P9Q",
      },
      error: null,
    })),
  });
  return {
    ...actual,
    resolveInvitation: mocks.resolveInvitation,
    getAmplifyDayServerClient: () => ({
      from: () => ({
        update: (payload: Record<string, unknown>) => {
          mocks.updates.push(payload);
          return chain;
        },
      }),
    }),
  };
});

vi.mock("./mailer.js", () => ({ sendAmplifyDayConfirmation: mocks.sendEmail }));
vi.mock("../kit-events.js", () => ({
  syncKitSubscriberEvent: mocks.syncKit,
  tagKitSubscriber: mocks.tagKit,
}));

import handler from "../../../api/amplify-day-confirm.js";

const invitation = {
  id: "invite-1",
  status: "visited",
  guest_name: "Maria Souza",
  guest_email: "maria@empresa.com",
  guest_company: "Empresa",
  guest_role: "Diretora",
  code: "AMP-7K2P9Q",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updates.length = 0;
  mocks.resolveInvitation.mockResolvedValue({ ok: true, invitation });
  mocks.sendEmail.mockResolvedValue({ ok: true, id: "email-1" });
  mocks.syncKit.mockResolvedValue({ ok: true });
  mocks.tagKit.mockResolvedValue({ ok: true });
});

describe("Amplify Day confirmation handler", () => {
  it("confirms once and ignores any attempted email substitution", async () => {
    const response = await handler(new Request("http://localhost/api/amplify-day-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "signed-token",
        company: "Empresa Atualizada",
        role: "Diretora",
        email: "invasor@example.com",
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mocks.updates[0]).toMatchObject({
      guest_company: "Empresa Atualizada",
      guest_role: "Diretora",
      status: "confirmed",
    });
    expect(mocks.updates[0]).not.toHaveProperty("guest_email");
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ guest_email: "maria@empresa.com" }));
  });

  it("is idempotent when the invitation is already confirmed", async () => {
    mocks.resolveInvitation.mockResolvedValue({ ok: true, invitation: { ...invitation, status: "confirmed" } });
    const response = await handler(new Request("http://localhost/api/amplify-day-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "signed-token", company: "Empresa", role: "Diretora" }),
    }));
    const payload = await response.json();

    expect(payload.alreadyConfirmed).toBe(true);
    expect(mocks.updates).toHaveLength(0);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.syncKit).not.toHaveBeenCalled();
  });

  it("keeps confirmation successful when email and Kit fail", async () => {
    mocks.sendEmail.mockResolvedValue({ ok: false, error: "provider down" });
    mocks.syncKit.mockResolvedValue({ ok: false });
    mocks.tagKit.mockResolvedValue({ ok: false });
    const response = await handler(new Request("http://localhost/api/amplify-day-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "signed-token", company: "Empresa", role: "Diretora" }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.integrations).toEqual({ email: false, kit: false });
    expect(mocks.updates[1]).toMatchObject({ confirmation_email_status: "failed", kit_sync_status: "failed" });
  });
});
