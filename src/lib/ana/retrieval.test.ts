import { describe, expect, it } from "vitest";
import type { KnowledgeSummary } from "../okf/core";
import { fileKnowledgeService } from "../okf/file-service";
import { extractKnowledgeTerms, rankKnowledgeSummaries, retrieveAnaKnowledge } from "./retrieval";

const summaries: KnowledgeSummary[] = [
  {
    id: "company",
    title: "Amplify",
    description: "Posicionamento institucional da Amplify e os públicos atendidos.",
    type: "company",
    tags: ["empresa", "posicionamento"],
    status: "approved",
    updated_at: "2026-10-08",
  },
  {
    id: "portfolio",
    title: "Portfólio da Amplify",
    description: "Educação, consultoria e desenvolvimento de produtos.",
    type: "portfolio",
    tags: ["portfólio", "consultoria", "produtos"],
    status: "approved",
    updated_at: "2026-10-08",
  },
  {
    id: "leia",
    title: "L.E.I.A.",
    description: "Programa anual de fluência em IA para estudantes do Ensino Fundamental e Médio.",
    type: "product",
    tags: ["educação", "escolas", "ensino médio"],
    status: "approved",
    updated_at: "2026-10-08",
  },
];

describe("Ana deterministic retrieval", () => {
  it("removes conversational noise from a customer question", () => {
    expect(extractKnowledgeTerms("Oi, me disseram que vcs tem uma solução para minha escola"))
      .toEqual(["solucao", "escola"]);
  });

  it("prioritizes L.E.I.A. for the exact school question", () => {
    const ranked = rankKnowledgeSummaries(
      "Oi, me disseram que vcs tem uma solução para escolas. Como vcs podem me ajudar na minha escola?",
      summaries,
    );
    expect(ranked[0]?.id).toBe("leia");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it.each([
    "O que é o L.E.I.A.?",
    "Quanto custa o L.E.I.A.?",
    "Funciona sem laboratório de informática?",
  ])("prioritizes L.E.I.A. for product-specific query: %s", (query) => {
    const ranked = rankKnowledgeSummaries(query, summaries);
    expect(ranked[0]?.id).toBe("leia");
  });

  it("uses whole words instead of matching short substrings", () => {
    const ranked = rankKnowledgeSummaries("tem", summaries);
    expect(ranked).toEqual([]);
  });

  it("retrieves the canonical L.E.I.A. document for a real school lead", async () => {
    const result = await retrieveAnaKnowledge(
      "direct",
      "Oi, me disseram que vcs tem uma solução para escolas. Como vcs podem me ajudar na minha escola?",
      fileKnowledgeService,
    );

    expect(result.intent).toBe("educacao-escolas");
    expect(result.documents.map(({ id }) => id)).toEqual(["leia"]);
    expect(result.fallbackText).toContain("L.E.I.A.");
  });
});
