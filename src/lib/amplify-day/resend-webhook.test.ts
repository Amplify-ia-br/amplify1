import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  invitation: { id: "invite-1", guest_email: "maria@empresa.com", invite_email_status: "sent" } as Record<string, unknown> | null,
  recipient: null as Record<string, unknown> | null,
  from: vi.fn(),
}));

vi.mock("./invitations.js", async () => {
  const actual = await vi.importActual<typeof import("./invitations.js")>("./invitations.js");
  return { ...actual, getAmplifyDayServerClient: () => ({ from: mocks.from }) };
});

import handler from "../../../api/amplify-day-resend-webhook.js";

const secretBytes = Buffer.from("amplify-day-webhook-test-secret");
const webhookSecret = `whsec_${secretBytes.toString("base64")}`;

function signedRequest(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const id = "msg_test_123";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  return new Request("http://localhost/api/amplify-day/webhooks/resend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    },
    body: payload,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updates.length = 0;
  mocks.invitation = { id: "invite-1", guest_email: "maria@empresa.com", invite_email_status: "sent" };
  mocks.recipient = null;
  process.env.RESEND_WEBHOOK_SECRET = webhookSecret;
  mocks.from.mockImplementation((table: string) => {
    const lookup: Record<string, unknown> = {};
    Object.assign(lookup, {
      eq: vi.fn(() => lookup),
      maybeSingle: vi.fn(async () => ({
        data: table === "amplify_day_invitations" ? mocks.invitation : mocks.recipient,
        error: null,
      })),
    });
    const update: Record<string, unknown> = {};
    Object.assign(update, { eq: vi.fn(() => update), in: vi.fn(() => update) });
    return {
      select: () => lookup,
      insert: vi.fn(async () => ({ error: null })),
      update: (payload: Record<string, unknown>) => {
        mocks.updates.push({ table, payload });
        return update;
      },
    };
  });
});

describe("Amplify Day Resend webhook", () => {
  it("rejects unsigned requests", async () => {
    const response = await handler(new Request("http://localhost/api/amplify-day/webhooks/resend", {
      method: "POST",
      body: JSON.stringify({ type: "email.delivered" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("marks the guest invitation delivered after verifying the signature", async () => {
    const response = await handler(signedRequest({
      type: "email.delivered",
      data: { email_id: "email-1", to: ["maria@empresa.com"] },
    }));
    expect(response.status).toBe(200);
    expect(mocks.updates[0].payload).toMatchObject({ invite_email_status: "delivered", invite_email_error: null });
    expect(mocks.updates[0].payload.invite_email_delivered_at).toEqual(expect.any(String));
  });

  it("does not apply a CC-only event to the guest delivery state", async () => {
    const response = await handler(signedRequest({
      type: "email.bounced",
      data: { email_id: "email-1", to: ["convidante@empresa.com"] },
    }));
    expect(response.status).toBe(200);
    expect(mocks.updates).toHaveLength(0);
  });

  it("records an institutional click without inventing a delivery state", async () => {
    mocks.invitation = null;
    mocks.recipient = { id: "recipient-1", campaign_id: "campaign-1", recipient_email: "escola@exemplo.com", status: "sent" };
    const response = await handler(signedRequest({
      type: "email.clicked",
      created_at: "2026-09-15T11:04:00.000Z",
      data: { email_id: "email-2", to: ["escola@exemplo.com"] },
    }));
    expect(response.status).toBe(200);
    const recipientUpdate = mocks.updates.find((item) => item.table === "amplify_day_campaign_recipients");
    expect(recipientUpdate?.payload).toMatchObject({ clicked_at: "2026-09-15T11:04:00.000Z" });
    expect(recipientUpdate?.payload).not.toHaveProperty("status");
  });
});
