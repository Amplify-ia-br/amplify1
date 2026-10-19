import { describe, expect, it, vi } from "vitest";
import { NoObjectGeneratedError } from "ai";
import { z } from "zod-v4";
import { runAnalystWithRetry, sessionAnalysisSchema, type Analyst } from "./analyzer";

describe("runAnalystWithRetry", () => {
  it("retries transient failures and returns the successful result", async () => {
    const run = vi
      .fn<Analyst["run"]>()
      .mockRejectedValueOnce(new Error("rate_limited"))
      .mockRejectedValueOnce(new Error("gateway_busy"))
      .mockResolvedValue({ object: { ok: true }, inputTokens: 10, outputTokens: 5 });
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await runAnalystWithRetry(
      { model: "test-model", run },
      { system: "system", prompt: "prompt", schema: z.object({ ok: z.boolean() }) },
      sleep,
    );

    expect(result.object).toEqual({ ok: true });
    expect(run).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 300);
    expect(sleep).toHaveBeenNthCalledWith(2, 900);
  });

  it("throws after the retry budget is exhausted", async () => {
    const failure = new Error("persistent_failure");
    const run = vi.fn<Analyst["run"]>().mockRejectedValue(failure);

    await expect(
      runAnalystWithRetry(
        { model: "test-model", run },
        { system: "system", prompt: "prompt", schema: z.object({ ok: z.boolean() }) },
        vi.fn().mockResolvedValue(undefined),
      ),
    ).rejects.toThrow("persistent_failure");
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("recovers a parseable analyst response that only violates bounded fields", async () => {
    const invalidObject = {
      goalReached: true,
      stageReached: "finished",
      topics: ["x".repeat(80)],
      intent: "intent",
      objections: [],
      summary: "summary",
      turns: [
        {
          turnIndex: "1",
          naturalness: 7,
          relevance: 4,
          factuality: 5,
          commercialProgress: 3,
          conciseness: 2,
          tags: [],
          failureCategory: "unknown",
          summary: "summary",
        },
      ],
    };
    const failure = new NoObjectGeneratedError({
      message: "No object generated: response did not match schema.",
      cause: Object.assign(new Error("invalid"), { value: invalidObject }),
      text: JSON.stringify(invalidObject),
      response: undefined,
      usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
      finishReason: "stop",
    });
    const run = vi.fn<Analyst["run"]>().mockRejectedValue(failure);

    const result = await runAnalystWithRetry(
      { model: "test-model", run },
      { system: "system", prompt: "prompt", schema: sessionAnalysisSchema },
      vi.fn().mockResolvedValue(undefined),
    );

    expect(result.object.stageReached).toBe("abandono");
    expect(result.object.turns[0]).toMatchObject({ turnIndex: 1, naturalness: 5, failureCategory: "nenhuma" });
    expect(result.object.topics[0]).toHaveLength(60);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
