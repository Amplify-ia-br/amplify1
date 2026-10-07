import { describe, expect, it } from "vitest";
import {
  handleGetKnowledge,
  handleListKnowledge,
  handleSearchKnowledge,
} from "@/lib/okf/http";
import { createTestKnowledgeService } from "@/lib/okf/test-fixtures";

const reader = createTestKnowledgeService();

describe("OKF REST API handlers", () => {
  it("returns the published knowledge list", async () => {
    const response = await handleListKnowledge(new Request("https://example.test/api/knowledge"), reader);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0]).toHaveProperty("updated_at");
    expect(body[0]).not.toHaveProperty("content");
  });

  it("applies list filters", async () => {
    const response = await handleListKnowledge(
      new Request("https://example.test/api/knowledge?type=education&tag=educa%C3%A7%C3%A3o&status=approved"),
      reader,
    );

    expect(await response.json()).toHaveLength(1);
  });

  it("returns a full document by id", async () => {
    const response = await handleGetKnowledge("company", reader);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("company");
    expect(body.content).toContain("Inteligência Artificial");
  });

  it.each(["missing", "../internal/commercial-policy", "../../okf/internal", "commercial-policy"])(
    "returns 404 for unavailable id %s",
    async (id) => {
      const response = await handleGetKnowledge(id, reader);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "knowledge_not_found" });
    },
  );

  it("returns invalid_query for an empty query", async () => {
    const response = await handleSearchKnowledge(
      new Request("https://example.test/api/knowledge/search?q=%20%20"),
      reader,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_query" });
  });

  it("supports accent-insensitive search and a result limit", async () => {
    const response = await handleSearchKnowledge(
      new Request("https://example.test/api/knowledge/search?q=EDUCACAO&limit=1"),
      reader,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.map(({ id }: { id: string }) => id)).toEqual(["amplify-academy"]);
  });

  it("does not return internal or restricted search content", async () => {
    for (const marker of [
      "Preço só pode ser informado quando houver uma referência vigente e aprovada",
      "Esta pasta é reservada para documentos cuja leitura depende de autorização específica",
    ]) {
      const response = await handleSearchKnowledge(
        new Request(`https://example.test/api/knowledge/search?q=${marker}`),
        reader,
      );
      expect(await response.json()).toEqual([]);
    }
  });
});
