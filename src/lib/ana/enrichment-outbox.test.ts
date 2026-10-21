import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  sql: vi.fn(),
}));

vi.mock("../lead-scoring/db.js", () => ({
  getSql: () => database.sql,
  hasDatabaseUrl: () => true,
}));

import {
  completeAnaEnrichmentSync,
  failAnaEnrichmentSync,
  queueAnaEnrichmentSync,
} from "./enrichment-outbox.js";

function renderedSql(call: unknown[]) {
  const [strings] = call as [TemplateStringsArray, ...unknown[]];
  return Array.from(strings).join("?");
}

describe("Ana enrichment outbox ownership", () => {
  beforeEach(() => {
    database.sql.mockReset();
  });

  it("returns attempt_count as the claim version and uses a bounded lease", async () => {
    database.sql.mockResolvedValueOnce([
      {
        enrichment_id: "enrichment-1",
        status: "processing",
        attempt_count: 3,
        ghl_contact_id: "contact-1",
      },
    ]);

    const result = await queueAnaEnrichmentSync({
      enrichmentId: "enrichment-1",
      sessionKey: "session-1",
      contactId: "contact-1",
      payload: { fields: { next_action: "revisar" } },
    });

    expect(result).toMatchObject({ ok: true, claimed: true, claimVersion: 3 });
    expect(renderedSql(database.sql.mock.calls[0])).toContain("interval '15 minutes'");
  });

  it("only completes the owned attempt", async () => {
    database.sql.mockResolvedValueOnce([{ enrichment_id: "enrichment-1" }]);

    await expect(
      completeAnaEnrichmentSync({
        enrichmentId: "enrichment-1",
        claimVersion: 4,
        contactId: "contact-1",
      }),
    ).resolves.toEqual({ ok: true });

    const query = renderedSql(database.sql.mock.calls[0]);
    expect(query).toContain("status = 'processing'");
    expect(query).toContain("attempt_count = ?");
    expect(database.sql.mock.calls[0]).toContain(4);
  });

  it("does not let a stale attempt overwrite a newer retry", async () => {
    database.sql.mockResolvedValueOnce([]);

    await expect(
      failAnaEnrichmentSync({
        enrichmentId: "enrichment-1",
        claimVersion: 2,
        error: "CRM offline",
      }),
    ).resolves.toMatchObject({ ok: false, staleClaim: true });
  });
});
