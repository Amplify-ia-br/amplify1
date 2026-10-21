import { describe, expect, it, vi } from "vitest";
import {
  ANA_HANDOFF_READY_TAG,
  createGhlClient,
  ghlConfigFromEnv,
  type AnaHandoffInput,
  type FetchLike,
} from "./index";

function json(payload: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function requestDetails(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(String(input));
  return {
    method: init?.method || "GET",
    path: url.pathname,
    query: url.searchParams,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    headers: new Headers(init?.headers),
  };
}

const handoffInput: AnaHandoffInput = {
  handoffId: "handoff-001",
  contact: {
    name: "Ana Souza",
    email: "ana@escola.example",
    companyName: "Escola Horizonte",
    state: "RS",
  },
  uf: "RS",
  route: "L.E.I.A.",
  cluster: "Educação",
  product: "L.E.I.A.",
  scores: { account: 48, opportunity: 32, total: 80, completeness: 90 },
  evidence: [
    { label: "Escola particular", value: true },
    "Mais de 200 alunos elegíveis",
  ],
  qualificationSummary: "Escola avalia implantação para o próximo ano letivo.",
  nextAction: "Reunião de diagnóstico com a coordenação.",
};

function persistedContact(tags: string[] = ["ana-region-sul"]) {
  return {
    id: "contact-1",
    name: handoffInput.contact.name,
    email: handoffInput.contact.email,
    companyName: handoffInput.contact.companyName,
    state: handoffInput.contact.state,
    tags,
  };
}

describe("GHL ANA handoff", () => {
  it("parses cluster-specific pipeline destinations from the environment", () => {
    const config = ghlConfigFromEnv({
      GHL_PRIVATE_INTEGRATION_TOKEN: "token",
      GHL_LOCATION_ID: "location",
      GHL_ANA_PIPELINE_ROUTES: JSON.stringify({
        school: { pipelineId: "schools", pipelineStageId: "new-school" },
        company: { pipelineId: "companies", pipelineStageId: "new-company" },
      }),
    });

    expect(config.pipelineRoutes).toEqual({
      school: { pipelineId: "schools", pipelineStageId: "new-school" },
      company: { pipelineId: "companies", pipelineStageId: "new-company" },
    });
  });

  it("routes the opportunity to the pipeline selected by cluster", async () => {
    const calls: ReturnType<typeof requestDetails>[] = [];
    let contactReads = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = requestDetails(input, init);
      calls.push(request);
      if (request.path === "/contacts/search/duplicate") return json({ contact: null });
      if (request.path === "/contacts/upsert") return json({ contact: { id: "contact-1" } });
      if (request.path === "/contacts/contact-1" && request.method === "GET") {
        contactReads += 1;
        return contactReads > 1
          ? json({ contact: persistedContact() })
          : json({ contact: { id: "contact-1", tags: [] } });
      }
      if (request.path.endsWith("/tags") && request.method === "POST") {
        return json({ tags: request.body.tags }, 201);
      }
      if (request.path.endsWith("/notes") && request.method === "GET") return json({ notes: [] });
      if (request.path.endsWith("/notes") && request.method === "POST") {
        return json({ note: { id: "note-1", body: request.body.body } }, 201);
      }
      if (request.path === "/opportunities/search") return json({ opportunities: [] });
      if (request.path === "/opportunities/" && request.method === "POST") {
        return json({ opportunity: { id: "opportunity-1" } }, 201);
      }
      return json({ message: "unexpected request" }, 500);
    }) as FetchLike;

    const client = createGhlClient(
      {
        token: "token",
        locationId: "location",
        pipelineRoutes: {
          school: { pipelineId: "schools", pipelineStageId: "new-school" },
        },
        maxRetries: 0,
      },
      { fetch: fetcher },
    );

    await client.handoff({ ...handoffInput, cluster: "school", route: "leia" });

    const search = calls.find((call) => call.path === "/opportunities/search");
    const create = calls.find(
      (call) => call.path === "/opportunities/" && call.method === "POST",
    );
    expect(search?.query.get("pipelineId")).toBe("schools");
    expect(create?.body).toMatchObject({
      pipelineId: "schools",
      pipelineStageId: "new-school",
    });
  });

  it("rejects a handoff without a valid UF before contacting GHL", async () => {
    const fetcher = vi.fn() as unknown as FetchLike;
    const client = createGhlClient(
      { token: "token", locationId: "location", maxRetries: 0 },
      { fetch: fetcher },
    );

    await expect(
      client.handoff({
        ...handoffInput,
        uf: undefined,
        contact: { ...handoffInput.contact, state: undefined },
      }),
    ).rejects.toThrow("A valid Brazilian UF is required for handoff");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails closed before contacting GHL when the opportunity pipeline is not fully configured", async () => {
    const fetcher = vi.fn() as unknown as FetchLike;
    const client = createGhlClient(
      { token: "token", locationId: "location", maxRetries: 0 },
      { fetch: fetcher },
    );

    await expect(client.handoff(handoffInput)).rejects.toThrow("GHL handoff blocked");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps ana-handoff-ready as the final mutation", async () => {
    const calls: ReturnType<typeof requestDetails>[] = [];
    let contactReads = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = requestDetails(input, init);
      calls.push(request);

      if (request.path === "/contacts/search/duplicate") return json({ contact: null });
      if (request.path === "/contacts/upsert") return json({ contact: { id: "contact-1" } });
      if (request.path === "/contacts/contact-1" && request.method === "GET") {
        contactReads += 1;
        if (contactReads > 1) return json({ contact: persistedContact() });
        return json({ contact: { id: "contact-1", tags: ["vip", "ana-region-df"] } });
      }
      if (request.path === "/contacts/contact-1/tags" && request.method === "DELETE") {
        return json({ tags: ["vip"] });
      }
      if (
        request.path === "/contacts/contact-1/tags" &&
        request.method === "POST" &&
        request.body.tags[0] === "ana-region-sul"
      ) {
        return json({ tags: ["vip", "ana-region-sul"] }, 201);
      }
      if (request.path === "/contacts/contact-1/notes" && request.method === "GET") {
        return json({ notes: [] });
      }
      if (request.path === "/contacts/contact-1/notes" && request.method === "POST") {
        return json({ note: { id: "note-1", body: request.body.body } }, 201);
      }
      if (request.path === "/opportunities/search") return json({ opportunities: [] });
      if (request.path === "/opportunities/" && request.method === "POST") {
        return json({ opportunity: { id: "opportunity-1" } }, 201);
      }
      if (
        request.path === "/contacts/contact-1/tags" &&
        request.method === "POST" &&
        request.body.tags[0] === ANA_HANDOFF_READY_TAG
      ) {
        return json({ tags: ["vip", "ana-region-sul", ANA_HANDOFF_READY_TAG] }, 201);
      }
      return json({ message: "unexpected request" }, 500);
    }) as FetchLike;

    const client = createGhlClient(
      {
        token: "private-token",
        locationId: "location-1",
        pipelineId: "pipeline-1",
        pipelineStageId: "stage-1",
        maxRetries: 0,
      },
      { fetch: fetcher },
    );

    const result = await client.handoff(handoffInput);

    expect(result).toMatchObject({
      status: "handed_off",
      contactId: "contact-1",
      opportunityId: "opportunity-1",
      regionTag: "ana-region-sul",
      readyTagAdded: true,
      warnings: [],
    });
    expect(calls.at(-1)).toMatchObject({
      method: "POST",
      path: "/contacts/contact-1/tags",
      body: { tags: [ANA_HANDOFF_READY_TAG] },
    });
    expect(calls.at(-2)).toMatchObject({
      method: "GET",
      path: "/contacts/contact-1",
    });

    const mutations = calls
      .filter((call) => call.method !== "GET")
      .map((call) => `${call.method} ${call.path} ${JSON.stringify(call.body)}`);
    expect(mutations).toEqual([
      expect.stringContaining("POST /contacts/upsert"),
      'DELETE /contacts/contact-1/tags {"tags":["ana-region-df"]}',
      'POST /contacts/contact-1/tags {"tags":["ana-region-sul"]}',
      expect.stringContaining("POST /contacts/contact-1/notes"),
      expect.stringContaining("POST /opportunities/"),
      'POST /contacts/contact-1/tags {"tags":["ana-handoff-ready"]}',
    ]);

    const noteCall = calls.find(
      (call) => call.path.endsWith("/notes") && call.method === "POST",
    );
    expect(noteCall?.body.body).toContain("Rota: L.E.I.A.");
    expect(noteCall?.body.body).toContain("Total: 80/100");
    expect(noteCall?.body.body).toContain("Escola particular: true");
    expect(noteCall?.body.body).toContain("[ANA_HANDOFF_ID:handoff-001]");
    expect(calls[0].headers.get("authorization")).toBe("Bearer private-token");
    expect(calls[0].headers.get("version")).toBe("v3");
  });

  it("treats the same marked handoff as a replay without mutating it", async () => {
    const calls: ReturnType<typeof requestDetails>[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = requestDetails(input, init);
      calls.push(request);
      if (request.path === "/contacts/search/duplicate") {
        return json({ contact: { id: "contact-1" } });
      }
      if (request.path === "/contacts/contact-1") {
        return json({ contact: { id: "contact-1", tags: [ANA_HANDOFF_READY_TAG, "vip"] } });
      }
      if (request.path === "/contacts/contact-1/notes") {
        return json({ notes: [{ id: "note-1", body: "[ANA_HANDOFF_ID:handoff-001]" }] });
      }
      if (request.path === "/opportunities/search") {
        return json({ opportunities: [{ id: "opportunity-1", pipelineId: "pipeline-1" }] });
      }
      return json({ message: "unexpected request" }, 500);
    }) as FetchLike;
    const client = createGhlClient(
      {
        token: "token",
        locationId: "location",
        pipelineId: "pipeline-1",
        pipelineStageId: "stage-1",
        maxRetries: 0,
      },
      { fetch: fetcher },
    );

    const result = await client.handoff(handoffInput);

    expect(result).toMatchObject({
      status: "already_handed_off",
      replayed: true,
      readyTagAdded: false,
      contactId: "contact-1",
    });
    expect(calls.every((call) => call.method === "GET")).toBe(true);
    expect(calls).toHaveLength(4);
  });

  it("refreshes and redistributes a new handoff for an already known contact", async () => {
    const calls: ReturnType<typeof requestDetails>[] = [];
    let contactReads = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = requestDetails(input, init);
      calls.push(request);
      if (request.path === "/contacts/search/duplicate") {
        return json({ contact: { id: "contact-1" } });
      }
      if (request.path === "/contacts/contact-1" && request.method === "GET") {
        contactReads += 1;
        if (contactReads > 1) return json({ contact: persistedContact() });
        return json({ contact: { id: "contact-1", tags: [ANA_HANDOFF_READY_TAG, "ana-region-df"] } });
      }
      if (request.path === "/contacts/contact-1/notes" && request.method === "GET") {
        return json({ notes: [{ id: "old-note", body: "[ANA_HANDOFF_ID:handoff-antigo]" }] });
      }
      if (request.path === "/contacts/contact-1" && request.method === "PUT") {
        return json({ contact: { id: "contact-1" } });
      }
      if (request.path === "/contacts/contact-1/tags" && request.method === "DELETE") {
        return json({ tags: [] });
      }
      if (request.path === "/contacts/contact-1/tags" && request.method === "POST") {
        return json({ tags: request.body.tags }, 201);
      }
      if (request.path === "/contacts/contact-1/notes" && request.method === "POST") {
        return json({ note: { id: "new-note", body: request.body.body } }, 201);
      }
      if (request.path === "/opportunities/search") {
        return json({ opportunities: [{ id: "opportunity-1", pipelineId: "pipeline-1" }] });
      }
      if (request.path === "/opportunities/opportunity-1" && request.method === "PUT") {
        return json({ opportunity: { id: "opportunity-1" } });
      }
      return json({ message: "unexpected request" }, 500);
    }) as FetchLike;
    const client = createGhlClient(
      {
        token: "token",
        locationId: "location",
        pipelineId: "pipeline-1",
        pipelineStageId: "stage-1",
        maxRetries: 0,
      },
      { fetch: fetcher },
    );

    const result = await client.handoff(handoffInput);

    expect(result).toMatchObject({ status: "handed_off", replayed: false, readyTagAdded: true });
    expect(calls.some((call) => call.method === "PUT" && call.path === "/contacts/contact-1")).toBe(true);
    const readyMutations = calls.filter((call) => call.body?.tags?.includes?.(ANA_HANDOFF_READY_TAG));
    expect(readyMutations).toEqual([
      expect.objectContaining({ method: "DELETE" }),
      expect.objectContaining({ method: "POST" }),
    ]);
    expect(calls.at(-1)).toMatchObject({
      method: "POST",
      path: "/contacts/contact-1/tags",
      body: { tags: [ANA_HANDOFF_READY_TAG] },
    });
  });

  it("does not add the ready tag when a required operation fails", async () => {
    const calls: ReturnType<typeof requestDetails>[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = requestDetails(input, init);
      calls.push(request);
      if (request.path === "/contacts/search/duplicate") return json({ contact: null });
      if (request.path === "/contacts/upsert") return json({ contact: { id: "contact-1" } });
      if (request.path === "/contacts/contact-1") {
        return json({ contact: { id: "contact-1", tags: ["vip", "ana-region-sp"] } });
      }
      if (request.path.endsWith("/notes") && request.method === "GET") return json({ notes: [] });
      if (request.path.endsWith("/notes") && request.method === "POST") {
        return json({ message: "notes unavailable" }, 503);
      }
      return json({ tags: ["vip", "ana-region-sul"] }, request.method === "POST" ? 201 : 200);
    }) as FetchLike;
    const client = createGhlClient(
      {
        token: "token",
        locationId: "location",
        pipelineId: "pipeline-1",
        pipelineStageId: "stage-1",
        maxRetries: 0,
      },
      { fetch: fetcher },
    );

    await expect(client.handoff(handoffInput)).rejects.toMatchObject({ status: 503 });
    const readyCalls = calls.filter(
      (call) => call.body?.tags?.includes?.(ANA_HANDOFF_READY_TAG),
    );
    expect(readyCalls).toEqual([]);
  });

  it("does not duplicate a handoff note while recovering from a partial attempt", async () => {
    const marker = "[ANA_HANDOFF_ID:handoff-001]";
    const calls: ReturnType<typeof requestDetails>[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = requestDetails(input, init);
      calls.push(request);
      if (request.path === "/contacts/search/duplicate") {
        return json({ contact: { id: "contact-1" } });
      }
      if (request.path === "/contacts/contact-1" && request.method === "GET") {
        return json({ contact: persistedContact() });
      }
      if (request.path === "/contacts/contact-1" && request.method === "PUT") {
        return json({ contact: { id: "contact-1" } });
      }
      if (request.path.endsWith("/notes") && request.method === "GET") {
        return json({ notes: [{ id: "note-existing", body: `Resumo\n${marker}` }] });
      }
      if (request.path.endsWith("/tags") && request.method === "POST") {
        return json({ tags: ["ana-region-sul", ANA_HANDOFF_READY_TAG] }, 201);
      }
      if (request.path === "/opportunities/search") {
        return json({ opportunities: [{ id: "opportunity-1", pipelineId: "pipeline-1" }] });
      }
      if (request.path === "/opportunities/opportunity-1" && request.method === "PUT") {
        return json({ opportunity: { id: "opportunity-1" } });
      }
      return json({ message: "unexpected request" }, 500);
    }) as FetchLike;
    const client = createGhlClient(
      {
        token: "token",
        locationId: "location",
        pipelineId: "pipeline-1",
        pipelineStageId: "stage-1",
        maxRetries: 0,
      },
      { fetch: fetcher },
    );

    const result = await client.handoff(handoffInput);

    expect(result.noteStatus).toBe("existing");
    expect(result.opportunityStatus).toBe("updated");
    expect(result.warnings).toEqual([]);
    expect(calls.some((call) => call.path.endsWith("/notes") && call.method === "POST")).toBe(false);
    expect(calls.at(-1)?.body).toEqual({ tags: [ANA_HANDOFF_READY_TAG] });
  });

  it("does not add the ready tag when the persisted contact fails validation", async () => {
    const calls: ReturnType<typeof requestDetails>[] = [];
    let contactReads = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = requestDetails(input, init);
      calls.push(request);
      if (request.path === "/contacts/search/duplicate") return json({ contact: null });
      if (request.path === "/contacts/upsert") return json({ contact: { id: "contact-1" } });
      if (request.path === "/contacts/contact-1" && request.method === "GET") {
        contactReads += 1;
        if (contactReads > 1) {
          return json({ contact: { ...persistedContact([]), email: undefined } });
        }
        return json({ contact: { id: "contact-1", tags: [] } });
      }
      if (request.path.endsWith("/tags") && request.method === "POST") {
        return json({ tags: ["ana-region-sul"] }, 201);
      }
      if (request.path.endsWith("/notes") && request.method === "GET") return json({ notes: [] });
      if (request.path.endsWith("/notes") && request.method === "POST") {
        return json({ note: { id: "note-1", body: request.body.body } }, 201);
      }
      if (request.path === "/opportunities/search") return json({ opportunities: [] });
      if (request.path === "/opportunities/" && request.method === "POST") {
        return json({ opportunity: { id: "opportunity-1" } }, 201);
      }
      return json({ message: "unexpected request" }, 500);
    }) as FetchLike;
    const client = createGhlClient(
      {
        token: "token",
        locationId: "location",
        pipelineId: "pipeline-1",
        pipelineStageId: "stage-1",
        maxRetries: 0,
      },
      { fetch: fetcher },
    );

    await expect(client.handoff(handoffInput)).rejects.toThrow(
      "GHL contact persistence validation failed",
    );
    expect(calls.some((call) => call.body?.tags?.includes?.(ANA_HANDOFF_READY_TAG))).toBe(false);
  });
});

describe("GHL regional tags", () => {
  it("reconciles only managed regional tags and preserves every other tag", async () => {
    const calls: ReturnType<typeof requestDetails>[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = requestDetails(input, init);
      calls.push(request);
      return json(
        {
          tags:
            request.method === "DELETE"
              ? ["vip", "newsletter"]
              : ["vip", "newsletter", "ana-region-sul"],
        },
        request.method === "POST" ? 201 : 200,
      );
    }) as FetchLike;
    const client = createGhlClient(
      { token: "token", locationId: "location", maxRetries: 0 },
      { fetch: fetcher },
    );

    const result = await client.reconcileRegionalTags(
      "contact-1",
      ["vip", "newsletter", "ana-region-df", "ana-region-sul-es"],
      "Espírito Santo",
    );

    expect(result).toEqual({
      tags: ["vip", "newsletter", "ana-region-sul"],
      regionTag: "ana-region-sul",
      added: ["ana-region-sul"],
      removed: ["ana-region-df", "ana-region-sul-es"],
    });
    expect(calls.map((call) => call.body)).toEqual([
      { tags: ["ana-region-df", "ana-region-sul-es"] },
      { tags: ["ana-region-sul"] },
    ]);
  });
});

describe("GHL request resilience", () => {
  it("retries 429 and 5xx responses with backoff", async () => {
    const wait = vi.fn(async () => undefined);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ message: "rate limited" }, 429, { "retry-after": "0" }))
      .mockResolvedValueOnce(json({ message: "temporary failure" }, 503))
      .mockResolvedValueOnce(json({ contact: { id: "contact-1", tags: [] } })) as unknown as FetchLike;
    const client = createGhlClient(
      {
        token: "token",
        locationId: "location",
        maxRetries: 2,
        retryBaseDelayMs: 10,
      },
      { fetch: fetcher, sleep: wait },
    );

    await expect(client.getContact("contact-1")).resolves.toMatchObject({ id: "contact-1" });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenNthCalledWith(1, 0);
    expect(wait).toHaveBeenNthCalledWith(2, 20);
  });

  it("never includes the private token in a surfaced network error", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("transport failed with private-token");
    }) as FetchLike;
    const client = createGhlClient(
      { token: "private-token", locationId: "location", maxRetries: 0 },
      { fetch: fetcher },
    );

    let message = "";
    try {
      await client.getContact("contact-1");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("[redacted]");
    expect(message).not.toContain("private-token");
  });

  it("does not retry non-idempotent note creation after a 5xx response", async () => {
    const fetcher = vi.fn(async () => json({ message: "uncertain upstream result" }, 502)) as FetchLike;
    const client = createGhlClient(
      { token: "token", locationId: "location", maxRetries: 2 },
      { fetch: fetcher },
    );

    await expect(client.createContactNote("contact-1", "Resumo")).rejects.toMatchObject({ status: 502 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("GHL contact identity", () => {
  it("checks phone before email and refuses to merge conflicting contacts", async () => {
    const calls: ReturnType<typeof requestDetails>[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = requestDetails(input, init);
      calls.push(request);
      if (request.query.has("number")) return json({ contact: { id: "phone-contact" } });
      if (request.query.has("email")) return json({ contact: { id: "email-contact" } });
      return json({ contact: null });
    }) as FetchLike;
    const client = createGhlClient(
      { token: "token", locationId: "location", maxRetries: 0 },
      { fetch: fetcher },
    );

    await expect(
      client.findContact({ phone: "+5511999999999", email: "ana@example.com" }),
    ).rejects.toThrow("email and phone belong to different contacts");
    expect(calls[0].query.get("number")).toBe("+5511999999999");
    expect(calls[1].query.get("email")).toBe("ana@example.com");
  });
});
