import { describe, expect, it } from "vitest";
import { normalizeLeiaLead, validateLeiaLead } from "./lead.js";

const validLead = {
  name: "Ana Souza",
  email: "ANA@ESCOLA.COM.BR",
  school: "Escola Horizonte",
  role: "Direção",
  interest: "masterclass",
};

describe("LEIA lead contract", () => {
  it.each(["presencial", "online"])("accepts optional masterclass format %s", (masterclassFormat) => {
    const lead = normalizeLeiaLead({ ...validLead, masterclassFormat }, "/leia");
    expect(validateLeiaLead(lead)).toBe("");
    expect(lead.masterclassFormat).toBe(masterclassFormat);
    expect(lead.email).toBe("ana@escola.com.br");
  });

  it("accepts a masterclass lead without a format", () => {
    const lead = normalizeLeiaLead(validLead, "/leia");
    expect(validateLeiaLead(lead)).toBe("");
    expect(lead.masterclassFormat).toBe("");
  });

  it("rejects an unsupported masterclass format", () => {
    const lead = normalizeLeiaLead({ ...validLead, masterclassFormat: "híbrida" }, "/leia");
    expect(validateLeiaLead(lead)).toBe("Selecione um formato de masterclass válido.");
  });

  it("ignores a stale format for an implementation lead", () => {
    const lead = normalizeLeiaLead({ ...validLead, interest: "implantacao", masterclassFormat: "online" }, "/leia");
    expect(validateLeiaLead(lead)).toBe("");
    expect(lead.masterclassFormat).toBe("");
  });
});
