import { describe, expect, it } from "vitest";
import { buildPublishedOkfFile, publishedOkfPath } from "./publication";

const metadata = {
  id: "guia-educacao",
  title: "Guia de educação",
  description: "Orientações da frente educacional.",
  area: "education",
  type: "reference",
  visibility: "public",
  status: "review",
  owner: "academy",
  reviewer: "education-owner",
  source_of_truth: true,
  tags: ["educação"],
  sources: [],
  relationships: [],
  last_reviewed: "2026-10-01",
  updated_at: "2026-10-01",
};

describe("OKF publication", () => {
  it("promotes approved metadata to an active canonical file", () => {
    const file = buildPublishedOkfFile(metadata, "# Guia\n\nConteúdo.", "2026-10-15");
    expect(file).toContain("status: active");
    expect(file).toContain("updated_at: 2026-10-15");
    expect(file).toContain("# Guia\n\nConteúdo.");
  });

  it("uses the visibility folder", () => {
    expect(publishedOkfPath(metadata as any)).toBe("okf/public/guia-educacao.md");
  });
});
