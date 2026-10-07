import { afterEach, describe, expect, it, vi } from "vitest";
import { captureLeiaLead } from "./kit.js";

describe("LEIA Kit mapping", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KIT_API_KEY;
  });

  it("creates and stores leia_masterclass_format without adding a format tag", async () => {
    process.env.KIT_API_KEY = "test-api-key";
    const requests: Array<{ url: string; body?: Record<string, unknown> }> = [];

    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({ url, body });

      if (url.includes("/tags?")) {
        return new Response(JSON.stringify({
          tags: [
            { id: 1, name: "leia-lead" },
            { id: 2, name: "leia-masterclass" },
          ],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ subscriber: { id: 42 } }), { status: 200 });
    }));

    const result = await captureLeiaLead({
      name: "Ana Souza",
      email: "ana@escola.com.br",
      school: "Escola Horizonte",
      role: "Direção",
      interest: "masterclass",
      masterclassFormat: "online",
      path: "/leia",
      consentAt: "2026-10-01T12:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    expect(requests.some(({ url, body }) => url.endsWith("/custom_fields") && body?.label === "leia_masterclass_format")).toBe(true);

    const subscriberRequest = requests.find(({ url }) => url.endsWith("/subscribers"));
    expect(subscriberRequest?.body?.fields).toMatchObject({ leia_masterclass_format: "online" });

    const requestedUrls = requests.map(({ url }) => url);
    expect(requestedUrls.some((url) => url.includes("leia-masterclass-online"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("leia-masterclass-presencial"))).toBe(false);
  });
});
