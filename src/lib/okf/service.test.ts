import { describe, expect, it } from "vitest";
import { InvalidKnowledgeQueryError } from "@/lib/okf/core";
import { createTestKnowledgeService } from "@/lib/okf/test-fixtures";

describe("OKF knowledge service", () => {
  it("lists only approved or active public documents", async () => {
    const service = createTestKnowledgeService();
    const items = await service.listKnowledge();

    expect(items.map(({ id }) => id)).toEqual(["company", "amplify-academy"]);
    expect(items.every(({ status }) => status === "approved" || status === "active")).toBe(true);
  });

  it("supports type, tag and status filters", async () => {
    const service = createTestKnowledgeService();

    expect(await service.listKnowledge({ type: "EDUCATION" })).toHaveLength(1);
    expect(await service.listKnowledge({ tag: "educacao" })).toHaveLength(1);
    expect(await service.listKnowledge({ status: "review" })).toEqual([]);
  });

  it("searches case-insensitively and without accents", async () => {
    const service = createTestKnowledgeService();
    const results = await service.searchKnowledge("EDUCACAO");

    expect(results.map(({ id }) => id)).toEqual(["amplify-academy"]);
  });

  it("searches content without duplicating results", async () => {
    const service = createTestKnowledgeService();
    const results = await service.searchKnowledge("inteligência artificial");
    const ids = results.map(({ id }) => id);

    expect(ids).toContain("company");
    expect(ids).toContain("amplify-academy");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects empty searches and invalid limits", async () => {
    const service = createTestKnowledgeService();

    await expect(service.searchKnowledge("  ")).rejects.toBeInstanceOf(InvalidKnowledgeQueryError);
    await expect(service.searchKnowledge("Amplify", { limit: 0 })).rejects.toBeInstanceOf(InvalidKnowledgeQueryError);
  });

  it("gets a full public document without technical file metadata", async () => {
    const service = createTestKnowledgeService();
    const document = await service.getKnowledgeById("company");

    expect(document?.content).toContain("A Amplify ajuda empresas");
    expect(document).not.toHaveProperty("filePath");
  });

  it.each([
    "../internal/commercial-policy",
    "../../okf/internal",
    "commercial-policy",
    "restricted-area",
  ])("does not expose private or traversal id %s", async (id) => {
    const service = createTestKnowledgeService();
    expect(await service.getKnowledgeById(id)).toBeUndefined();
  });

  it.each([
    "Preço só pode ser informado quando houver uma referência vigente e aprovada",
    "Esta pasta é reservada para documentos cuja leitura depende de autorização específica",
  ])(
    "does not search private marker %s",
    async (query) => {
      const service = createTestKnowledgeService();
      expect(await service.searchKnowledge(query)).toEqual([]);
    },
  );
});
