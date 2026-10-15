import { describe, expect, it } from "vitest";
import { extractGoogleDocId, googleDocumentToMarkdown, slugifyKnowledgeId } from "./google-doc";

describe("Google Docs knowledge importer", () => {
  it("extracts a document id from a Google Docs URL", () => {
    expect(extractGoogleDocId("https://docs.google.com/document/d/1Abc_def-GHIjklMNopQrstuVWxyz123456/edit"))
      .toBe("1Abc_def-GHIjklMNopQrstuVWxyz123456");
    expect(extractGoogleDocId("not-a-doc")).toBeNull();
  });

  it("converts headings, styled text, lists and tables to Markdown", () => {
    const converted = googleDocumentToMarkdown({
      documentId: "doc-1",
      title: "Guia de Educação",
      body: { content: [
        { paragraph: { paragraphStyle: { namedStyleType: "HEADING_1" }, elements: [{ textRun: { content: "Introdução\n" } }] } },
        { paragraph: { elements: [{ textRun: { content: "Texto ", textStyle: {} } }, { textRun: { content: "forte\n", textStyle: { bold: true } } }] } },
        { paragraph: { bullet: {}, elements: [{ textRun: { content: "Primeiro item\n" } }] } },
        { table: { tableRows: [
          { tableCells: [{ content: [{ paragraph: { elements: [{ textRun: { content: "Oferta\n" } }] } }] }, { content: [{ paragraph: { elements: [{ textRun: { content: "Público\n" } }] } }] }] },
          { tableCells: [{ content: [{ paragraph: { elements: [{ textRun: { content: "L.E.I.A.\n" } }] } }] }, { content: [{ paragraph: { elements: [{ textRun: { content: "Escolas\n" } }] } }] }] },
        ] } },
      ] },
    });

    expect(converted.markdown).toContain("# Introdução");
    expect(converted.markdown).toContain("Texto **forte**");
    expect(converted.markdown).toContain("- Primeiro item");
    expect(converted.markdown).toContain("| Oferta | Público |");
  });

  it("creates OKF-compatible ids", () => {
    expect(slugifyKnowledgeId("Amplify Educação: Guia 2027")).toBe("amplify-educacao-guia-2027");
  });
});
