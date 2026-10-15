import { describe, expect, it } from "vitest";
import { handleKnowledgePublish } from "./http";

describe("knowledge publication HTTP handler", () => {
  it("returns a JSON error when the request is unauthenticated", async () => {
    const response = await handleKnowledgePublish(new Request("https://example.test/api/knowledge-workflow/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({ error: "unauthorized" });
  });
});
