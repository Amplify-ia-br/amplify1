import { afterEach, describe, expect, it, vi } from "vitest";
import { renderLeiaLeadNotification, sendLeiaLeadNotification } from "./mailer.js";

const lead = {
  name: "Ana <Souza>",
  email: "ana@escola.com.br",
  school: "Escola Horizonte",
  role: "Direção",
  interest: "masterclass",
  masterclassFormat: "online",
  students: "120",
  cityState: "Brasília/DF",
  phone: "(61) 99999-0000",
  path: "/Leia",
  consentAt: "2026-10-01T20:00:00.000Z",
};

describe("LEIA lead notification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.LEIA_EMAIL_FROM;
    delete process.env.LEIA_EMAIL_BCC;
  });

  it("renders every submitted field and escapes user content", () => {
    const message = renderLeiaLeadNotification(lead);
    expect(message.subject).toContain("Escola Horizonte");
    expect(message.text).toContain("Formato da masterclass: Online");
    expect(message.html).toContain("Ana &lt;Souza&gt;");
    expect(message.html).not.toContain("Ana <Souza>");
  });

  it("sends to the commercial recipients with a hidden copy", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "email_123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendLeiaLeadNotification(lead);
    expect(result.ok).toBe(true);

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.to).toEqual([
      "adriano.lima@amplify.ia.br",
      "mike@shockwave.academy",
      "samuel.figueiredo@amplify.ia.br",
    ]);
    expect(payload.bcc).toEqual(["leonardo.camacho@amplify.ia.br"]);
    expect(payload.reply_to).toBe("ana@escola.com.br");
    expect(init?.headers["Idempotency-Key"]).toContain("ana-escola-com-br");
  });

  it("reports a skipped send when Resend is not configured", async () => {
    await expect(sendLeiaLeadNotification(lead)).resolves.toMatchObject({ ok: false, skipped: true });
  });
});
