import { describe, expect, it } from "vitest";
import { buildKnowledgeQueries } from "./agent";

describe("Ana knowledge query fallback", () => {
  it("extracts an acronym from a natural-language question", () => {
    expect(buildKnowledgeQueries("O que é o L.E.I.A. e para quem foi criado?")).toContain("L.E.I.A.");
  });

  it("keeps relevant words and removes common Portuguese stop words", () => {
    expect(buildKnowledgeQueries("Quais são os diferenciais da Amplify?")).toContain("diferenciais Amplify");
  });
});
