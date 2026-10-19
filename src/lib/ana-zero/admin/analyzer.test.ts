import { describe, expect, it, vi } from "vitest";
import { z } from "zod-v4";
import { runAnalystWithRetry, type Analyst } from "./analyzer";

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
});
