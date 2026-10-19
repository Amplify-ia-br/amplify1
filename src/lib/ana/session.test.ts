import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAnaSession } from "./session";

const previousSecret = process.env.ANA_SESSION_SECRET;

afterEach(() => {
  vi.useRealTimers();
  if (previousSecret === undefined) delete process.env.ANA_SESSION_SECRET;
  else process.env.ANA_SESSION_SECRET = previousSecret;
});

describe("Ana anonymous session", () => {
  it("issues an HttpOnly signed cookie and reuses its stable hash", async () => {
    process.env.ANA_SESSION_SECRET = "test-secret";
    const first = await resolveAnaSession(new Request("https://amplify.ia.br/api/ana-chat"));
    expect(first?.setCookie).toContain("ana_session=");
    expect(first?.setCookie).toContain("HttpOnly");
    expect(first?.setCookie).toContain("SameSite=Lax");
    expect(first?.sessionHash).toMatch(/^[0-9a-f]{64}$/);

    const cookie = first?.setCookie?.split(";")[0];
    const second = await resolveAnaSession(new Request("https://amplify.ia.br/api/ana-chat", {
      headers: { cookie: cookie ?? "" },
    }));
    expect(second?.sessionHash).toBe(first?.sessionHash);
    expect(second?.setCookie).toBeUndefined();
  });

  it("replaces a tampered cookie instead of accepting it", async () => {
    process.env.ANA_SESSION_SECRET = "test-secret";
    const session = await resolveAnaSession(new Request("https://amplify.ia.br/api/ana-chat", {
      headers: { cookie: "ana_session=00000000-0000-4000-8000-000000000000.bad" },
    }));
    expect(session?.setCookie).toContain("ana_session=");
    expect(session?.sessionHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("expires an otherwise valid signed cookie after 30 days", async () => {
    process.env.ANA_SESSION_SECRET = "test-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const first = await resolveAnaSession(new Request("https://amplify.ia.br/api/ana-chat"));
    const cookie = first?.setCookie?.split(";")[0];

    vi.setSystemTime(new Date("2026-11-01T12:00:01Z"));
    const expired = await resolveAnaSession(new Request("https://amplify.ia.br/api/ana-chat", {
      headers: { cookie: cookie ?? "" },
    }));
    expect(expired?.sessionHash).not.toBe(first?.sessionHash);
    expect(expired?.setCookie).toContain("ana_session=");
  });
});
