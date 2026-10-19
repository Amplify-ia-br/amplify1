import { describe, expect, it } from "vitest";
import { MISSION_MAPPING_VERSION, recommendedMissionForProfile } from "./missions";

describe("missão inicial por perfil", () => {
  it.each([
    ["dono_escola", "dono-escola"],
    ["gestor_educacional", "gestor-escola"],
    ["professor", "professor"],
    ["profissional_empresa", "empresa"],
    ["estudante", "livre"],
    ["outro", "livre"],
  ])("mapeia %s para %s", (profile, mission) => {
    expect(recommendedMissionForProfile(profile)).toBe(mission);
  });

  it("usa livre para perfil ausente ou desconhecido e versiona a regra", () => {
    expect(recommendedMissionForProfile()).toBe("livre");
    expect(recommendedMissionForProfile("desconhecido")).toBe("livre");
    expect(MISSION_MAPPING_VERSION).toBe("2026-10-v1");
  });
});
