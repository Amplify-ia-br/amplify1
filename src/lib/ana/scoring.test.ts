import { describe, expect, it } from "vitest";
import { evaluateLeiaGates, LEIA_SCORE_VERSION, scoreLeiaQualification } from "./scoring.js";

describe("L.E.I.A. deterministic scoring", () => {
  const strongSignals = {
    need: "A escola quer lançar uma iniciativa estruturada de IA para seus estudantes.",
    school_type: "private",
    school_levels: ["ensino_medio"],
    eligible_students: 250,
    tuition_band: "above_2000",
    reputacao_escola: "high",
    contact_role: "Mantenedor",
    target_year: 2027,
    next_action: "reuniao_de_diagnostico",
  };

  it("keeps the 60-point account and 40-point opportunity components explicit", () => {
    const score = scoreLeiaQualification(strongSignals, { referenceDate: "2026-10-20" });
    expect(score).toMatchObject({
      modelVersion: LEIA_SCORE_VERSION,
      accountScore: 60,
      icpScore: 60,
      opportunityScore: 40,
      total: 100,
    });
    expect(score.evidence.map(({ criterion, points, maxPoints }) => ({ criterion, points, maxPoints }))).toEqual([
      { criterion: "eligible_students", points: 25, maxPoints: 25 },
      { criterion: "tuition_band", points: 20, maxPoints: 20 },
      { criterion: "reputacao_escola", points: 15, maxPoints: 15 },
      { criterion: "contact_role", points: 15, maxPoints: 15 },
      { criterion: "need", points: 10, maxPoints: 10 },
      { criterion: "target_year", points: 10, maxPoints: 10 },
      { criterion: "next_action", points: 5, maxPoints: 5 },
    ]);
  });

  it("does not reward text length without a clear L.E.I.A. need", () => {
    const generic = scoreLeiaQualification(
      {
        ...strongSignals,
        need: "Gostaria de conhecer melhor a proposta e receber mais informações antes de decidir.",
      },
      { referenceDate: "2026-10-20" },
    );
    const operational = scoreLeiaQualification(
      {
        ...strongSignals,
        need: "Queremos automatizar a secretaria da escola com inteligência artificial.",
      },
      { referenceDate: "2026-10-20" },
    );
    const rejected = scoreLeiaQualification(
      {
        ...strongSignals,
        need: "Não queremos implantar um programa de IA para alunos neste momento.",
      },
      { referenceDate: "2026-10-20" },
    );

    expect(generic.evidence.find((item) => item.criterion === "need")?.points).toBe(0);
    expect(operational.evidence.find((item) => item.criterion === "need")?.points).toBe(0);
    expect(rejected.evidence.find((item) => item.criterion === "need")?.points).toBe(0);
  });

  it("scores actual L.E.I.A. fit instead of merely counting words", () => {
    const concise = scoreLeiaQualification(
      { ...strongSignals, need: "IA para alunos" },
      { referenceDate: "2026-10-20" },
    );
    const clear = scoreLeiaQualification(
      { ...strongSignals, need: "Precisamos preparar alunos para usar IA com responsabilidade." },
      { referenceDate: "2026-10-20" },
    );

    expect(concise.evidence.find((item) => item.criterion === "need")?.points).toBe(6);
    expect(clear.evidence.find((item) => item.criterion === "need")?.points).toBe(10);
  });

  it("does not reward a role with explicit lack of decision influence", () => {
    const noAuthority = scoreLeiaQualification(
      { ...strongSignals, contact_role: "Sou coordenadora pedagógica, mas não participo da decisão." },
      { referenceDate: "2026-10-20" },
    );
    const roleOnly = scoreLeiaQualification(
      { ...strongSignals, contact_role: "Professor" },
      { referenceDate: "2026-10-20" },
    );
    const noPower = scoreLeiaQualification(
      { ...strongSignals, contact_role: "Sou coordenadora, mas não tenho poder de decisão." },
      { referenceDate: "2026-10-20" },
    );
    const influencer = scoreLeiaQualification(
      { ...strongSignals, contact_role: "Professora e membro do comitê que recomenda a solução à diretoria" },
      { referenceDate: "2026-10-20" },
    );

    expect(noAuthority.evidence.find((item) => item.criterion === "contact_role")?.points).toBe(0);
    expect(roleOnly.evidence.find((item) => item.criterion === "contact_role")?.points).toBe(0);
    expect(noPower.evidence.find((item) => item.criterion === "contact_role")?.points).toBe(0);
    expect(influencer.evidence.find((item) => item.criterion === "contact_role")?.points).toBe(11);
  });

  it("does not let a high score compensate for failed eligibility gates", () => {
    const ineligible = { ...strongSignals, school_levels: ["educacao_infantil"] };
    const score = scoreLeiaQualification(ineligible, { referenceDate: "2026-10-20" });
    const gates = evaluateLeiaGates(ineligible);

    expect(score.total).toBe(100);
    expect(gates).toMatchObject({ status: "failed", passed: false, failedChecks: ["eligible_school_levels"] });
  });

  it("treats a public school as an explicit route failure, not as a low score", () => {
    const publicSchool = { ...strongSignals, school_type: "public" };
    expect(scoreLeiaQualification(publicSchool, { referenceDate: "2026-10-20" }).total).toBe(100);
    expect(evaluateLeiaGates(publicSchool)).toMatchObject({
      status: "failed",
      passed: false,
      failedChecks: ["private_school"],
    });
  });

  it("understands natural Brazilian tuition values and does not reward past target years", () => {
    const natural = scoreLeiaQualification(
      { ...strongSignals, tuition_band: "acima de R$ 2 mil", target_year: 2020 },
      { referenceDate: "2026-10-20" },
    );
    expect(natural.evidence.find((item) => item.criterion === "tuition_band")?.points).toBe(20);
    expect(natural.evidence.find((item) => item.criterion === "target_year")?.points).toBe(0);

    const range = scoreLeiaQualification(
      { ...strongSignals, tuition_band: "entre R$ 1,5 mil e R$ 2 mil" },
      { referenceDate: "2026-10-20" },
    );
    expect(range.evidence.find((item) => item.criterion === "tuition_band")?.points).toBe(14);
  });
});

