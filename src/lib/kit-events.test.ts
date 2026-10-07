import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Kit tag synchronization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("KIT_API_KEY", "test-api-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reuses an existing tag instead of trying to create a duplicate", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/tags?per_page=1000")) {
        return jsonResponse({ tags: [{ id: 42, name: "amplify-day-2026-interesse" }] });
      }
      if (url.endsWith("/tags/42/subscribers") && init?.method === "POST") {
        return jsonResponse({ subscriber: { id: 7 } }, 201);
      }
      return jsonResponse({ errors: ["unexpected request"] }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { tagKitSubscriber } = await import("./kit-events.js");
    const result = await tagKitSubscriber("pessoa@example.com", "amplify-day-2026-interesse");

    expect(result).toMatchObject({ ok: true, tag: "amplify-day-2026-interesse", status: 201 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/tags") && init?.method === "POST")).toBe(false);
  });

  it("creates a tag only when an exact match does not exist", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/tags?per_page=1000")) return jsonResponse({ tags: [] });
      if (url.endsWith("/tags") && init?.method === "POST") {
        return jsonResponse({ tag: { id: 84, name: "nova-tag" } }, 201);
      }
      if (url.endsWith("/tags/84/subscribers") && init?.method === "POST") {
        return jsonResponse({ subscriber: { id: 9 } }, 201);
      }
      return jsonResponse({ errors: ["unexpected request"] }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { tagKitSubscriber } = await import("./kit-events.js");
    const result = await tagKitSubscriber("pessoa@example.com", "nova-tag");

    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/tags") && init?.method === "POST")).toBe(true);
  });

  it("removes an obsolete stage tag from an existing subscriber", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/tags?per_page=1000")) {
        return jsonResponse({ tags: [{ id: 55, name: "amplify-day-2026-palco-amplify" }] });
      }
      if (url.endsWith("/subscribers") && init?.method === "POST") {
        return jsonResponse({ subscriber: { id: 91 } }, 201);
      }
      if (url.endsWith("/tags/55/subscribers/91") && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      return jsonResponse({ errors: ["unexpected request"] }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { untagKitSubscriber } = await import("./kit-events.js");
    const result = await untagKitSubscriber("pessoa@example.com", "amplify-day-2026-palco-amplify");

    expect(result).toMatchObject({ ok: true, tag: "amplify-day-2026-palco-amplify", status: 204 });
  });
});
