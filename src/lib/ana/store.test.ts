import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  sql: vi.fn(),
}));

vi.mock("../lead-scoring/db.js", () => ({
  getSql: () => database.sql,
  hasDatabaseUrl: () => true,
}));

import {
  completeAnaHandoff,
  failAnaHandoff,
  queueAnaHandoff,
} from "./store.js";

function renderedSql(call: unknown[]) {
  const [strings] = call as [TemplateStringsArray, ...unknown[]];
  return Array.from(strings).join("?");
}

describe("Ana handoff outbox ownership", () => {
  beforeEach(() => {
    database.sql.mockReset();
  });

  it("returns attempt_count as the claim version", async () => {
    database.sql.mockResolvedValueOnce([
      {
        handoff_id: "handoff-1",
        status: "processing",
        attempt_count: 4,
        ghl_contact_id: null,
        ghl_opportunity_id: null,
      },
    ]);

    const result = await queueAnaHandoff({
      handoffId: "handoff-1",
      sessionKey: "session-1",
      payload: { route: "leia" },
    });

    expect(result).toMatchObject({ ok: true, claimed: true, claimVersion: 4 });
    expect(renderedSql(database.sql.mock.calls[0])).toContain("interval '15 minutes'");
  });

  it("only completes the owned attempt", async () => {
    database.sql.mockResolvedValueOnce([
      { handoff_completed: true, session_completed: true },
    ]);

    await expect(
      completeAnaHandoff({
        handoffId: "handoff-1",
        sessionKey: "session-1",
        claimVersion: 7,
        contactId: "contact-1",
        opportunityId: "opportunity-1",
      }),
    ).resolves.toEqual({ ok: true });

    const query = renderedSql(database.sql.mock.calls[0]);
    expect(query).toContain("attempt_count = ?");
    expect(query).toContain("status IN ('processing', 'completed')");
    expect(database.sql.mock.calls[0]).toContain(7);
  });

  it("does not let a stale owner mark a newer attempt as failed", async () => {
    database.sql.mockResolvedValueOnce([]);

    const result = await failAnaHandoff({
      handoffId: "handoff-1",
      claimVersion: 2,
      error: "upstream offline",
    });

    expect(result).toEqual({
      ok: false,
      skipped: true,
      reason: "handoff_claim_not_owned",
    });
    const query = renderedSql(database.sql.mock.calls[0]);
    expect(query).toContain("status = 'processing'");
    expect(query).toContain("attempt_count = ?");
    expect(database.sql.mock.calls[0]).toContain(2);
  });
});
