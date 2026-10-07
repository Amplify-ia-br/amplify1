import { describe, expect, it } from "vitest";
import { detectAmplifyDayStageFromTracking, getAmplifyDayStageTag } from "./stages.js";

describe("Amplify Day stage tracking", () => {
  it("prioritizes the explicit stage in the open invitation URL", () => {
    expect(detectAmplifyDayStageFromTracking(
      "https://amplify.ia.br/amplify-day?palco=teia&utm_content=palco_amplify",
    )).toBe("teia");
  });

  it("recognizes Palco TEIA from UTM attribution", () => {
    expect(detectAmplifyDayStageFromTracking(
      "https://amplify.ia.br/amplify-day?utm_campaign=amplify_day_2026&utm_content=palco_teia",
    )).toBe("teia");
  });

  it("maps the tracked stage to the established Kit tag", () => {
    const stage = detectAmplifyDayStageFromTracking("?utm_content=palco_teia");
    expect(getAmplifyDayStageTag(stage)).toBe("amplify-day-2026-palco-teia");
  });
});
