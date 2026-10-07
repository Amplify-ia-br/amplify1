import { describe, expect, it } from "vitest";
import { getLeadStage, sanitizeLeadInput, validateLeadInput } from "./leads.js";

describe("Amplify Day priority leads", () => {
  it("normalizes identity data", () => {
    expect(sanitizeLeadInput({ name: "  Maria Silva ", email: " MARIA@EXAMPLE.COM " })).toMatchObject({
      name: "Maria Silva",
      email: "maria@example.com",
      stage: "identity",
    });
  });

  it("maps qualification events without treating a visit as completion", () => {
    expect(getLeadStage("amplify_day_qualification_updated")).toBe("qualification_partial");
    expect(getLeadStage("amplify_day_profile_completed")).toBe("complete");
    expect(getLeadStage("amplify_day_interest_captured")).toBe("identity");
  });

  it("rejects invalid identity data", () => {
    expect(validateLeadInput({ name: "M", email: "invalid" }).errors).toHaveLength(2);
  });

  it("persists the WhatsApp value sent through the legacy form field", () => {
    expect(sanitizeLeadInput({ name: "Maria Silva", email: "maria@example.com", linkedin: "+55 61 99999-9999" })).toMatchObject({
      whatsapp: "+55 61 99999-9999",
    });
  });
});
