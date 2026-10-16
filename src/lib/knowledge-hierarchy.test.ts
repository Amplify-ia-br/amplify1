import { describe, expect, it } from "vitest";
import { parentTarget, withParentRelationship } from "./knowledge-hierarchy";

describe("knowledge hierarchy", () => {
  it("finds the editorial parent in OKF relationships", () => {
    expect(parentTarget([{ type: "part_of", target: "portfolio" }, { type: "document_of", target: "leia" }])).toBe("leia");
  });

  it("changes only the document_of relationship", () => {
    expect(withParentRelationship([
      { type: "document_of", target: "portfolio" },
      { type: "offered_by", target: "amplify-academy" },
    ], "leia")).toEqual([
      { type: "offered_by", target: "amplify-academy" },
      { type: "document_of", target: "leia" },
    ]);
  });

  it("removes the parent without touching other relationships", () => {
    expect(withParentRelationship([
      { type: "document_of", target: "leia" },
      { type: "related_to", target: "company" },
    ], null)).toEqual([{ type: "related_to", target: "company" }]);
  });
});
