import { describe, expect, it } from "vitest";
import { mapRegionTag, normalizeUf, REGION_TAGS } from "./region.js";

describe("Ana regional routing", () => {
  it.each([
    ["São Paulo", "SP"],
    ["sp", "SP"],
    ["Escola em Brasília - DF", "DF"],
    ["Espírito Santo", "ES"],
    ["Paraná", "PR"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeUf(input)).toBe(expected);
  });

  it("maps every configured sales territory", () => {
    expect(mapRegionTag("Bahia")).toBe(REGION_TAGS.northeast);
    expect(mapRegionTag("SP")).toBe(REGION_TAGS.saoPaulo);
    expect(mapRegionTag("Distrito Federal")).toBe(REGION_TAGS.distritoFederal);
    expect(mapRegionTag("PR")).toBe("ana-region-sul");
    expect(mapRegionTag("SC")).toBe("ana-region-sul");
    expect(mapRegionTag("RS")).toBe("ana-region-sul");
    expect(mapRegionTag("ES")).toBe("ana-region-sul");
  });

  it("leaves remaining states to the national fallback", () => {
    expect(mapRegionTag("RJ")).toBeNull();
    expect(mapRegionTag("estado inválido")).toBeNull();
  });
});

