import { describe, expect, it } from "vitest";
import { buildAmplifyDayKitPayload } from "./kit-payload.js";

describe("Amplify Day Kit payload", () => {
  it("maps the qualification WhatsApp field into Kit's phone payload", () => {
    expect(
      buildAmplifyDayKitPayload({
        eventName: "amplify_day_profile_completed",
        name: "Pessoa Teste",
        email: " PESSOA@EXAMPLE.COM ",
        organization: "Escola Exemplo",
        role: "Diretora",
        linkedin: "(61) 99999-9999",
      }),
    ).toMatchObject({
      eventName: "amplify_day_profile_completed",
      email: "pessoa@example.com",
      company: "Escola Exemplo",
      role: "Diretora",
      phone: "(61) 99999-9999",
      targetStage: "amplify",
      amplifyDayStage: "Palco Amplify",
    });
  });

  it("also accepts current WhatsApp and phone field names", () => {
    expect(buildAmplifyDayKitPayload({ whatsapp: "1111", phone: "2222" }).phone).toBe("1111");
    expect(buildAmplifyDayKitPayload({ phone: "2222" }).phone).toBe("2222");
  });

  it("carries the selected stage to Kit", () => {
    expect(buildAmplifyDayKitPayload({ targetStage: "teia" })).toMatchObject({
      targetStage: "teia",
      amplifyDayStage: "Palco TEIA",
    });
  });
});
