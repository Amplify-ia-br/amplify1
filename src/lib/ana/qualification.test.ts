import { describe, expect, it } from "vitest";
import {
  advanceQualification,
  classifyCluster,
  createQualificationState,
  evaluateQualification,
  getApplicableQuestionFields,
  getNextQuestion,
  resolveProductRoute,
} from "./qualification.js";

const schoolBase = {
  need: "Queremos criar uma nova iniciativa de inteligência artificial para os alunos.",
  name: "Marina",
  scope: "organization",
  organization_type: "school",
  organization_name: "Colégio Horizonte",
  website: "https://colegio.example",
};

describe("Ana qualification state machine", () => {
  it("starts inbound with a neutral opening and keeps outbound as an explicit mode", () => {
    const inbound = createQualificationState();
    const outbound = createQualificationState({ mode: "outbound" });

    expect(getNextQuestion(inbound)).toMatchObject({
      field: "need",
      prompt: "O que você está buscando fazer com Inteligência Artificial?",
      importance: "hard",
    });
    expect(inbound.mode).toBe("inbound");
    expect(outbound.mode).toBe("outbound");
  });

  it("classifies the cluster from accumulated answers, not from a school-first opening", () => {
    expect(classifyCluster({ scope: "individual" })).toBe("individual");
    expect(classifyCluster({ scope: "organization", organization_type: "empresa" })).toBe("company");
    expect(classifyCluster({ scope: "organization", organization_type: "escola" })).toBe("school");
    expect(classifyCluster({ scope: "organization", organization_type: "órgão público" })).toBe("government");
    expect(classifyCluster({ scope: "organization", organization_type: "ONG" })).toBe("organization");
    expect(classifyCluster({ scope: "organization", organization_type: "universidade" })).toBe("school");
    expect(classifyCluster({ scope: "organization", organization_type: "faculdade" })).toBe("school");

    const teamState = createQualificationState({
      fields: { need: "Quero capacitar minha equipe.", name: "Lia", scope: "meu time" },
    });
    expect(teamState.fields.scope).toBe("organization");
    expect(getNextQuestion(teamState)?.field).toBe("organization_type");
  });

  it("answers a direct L.E.I.A. price question from the current v3.1 sheet before resuming qualification", () => {
    const state = advanceQualification(createQualificationState(), "Qual é o preço do L.E.I.A.?");
    const question = getNextQuestion(state);

    expect(question).toMatchObject({ field: "name", importance: "hard" });
    expect(question?.prompt).toContain("ficha L.E.I.A. v3.1 vigente");
    expect(question?.prompt).toContain("implantação inicial é de R$ 44.900");
    expect(question?.prompt).toContain("renovação é de R$ 41.000");
    expect(question?.prompt).toContain("12 parcelas de R$ 84 por aluno");
    expect(question?.prompt).not.toMatch(/34\.900|Standard|Silver|Gold/);
  });

  it("routes a private eligible school to L.E.I.A. and a public school to education B2G", () => {
    const privateFields = { ...schoolBase, school_type: "particular", school_levels: ["9º ano", "Ensino Médio"] };
    const publicFields = { ...schoolBase, school_type: "pública", school_levels: ["Ensino Médio"] };

    expect(resolveProductRoute(privateFields)).toBe("leia");
    expect(resolveProductRoute(publicFields)).toBe("education_b2g");

    const publicState = createQualificationState({ fields: publicFields });
    expect(getApplicableQuestionFields(publicState)).not.toContain("tuition_band");
    expect(getApplicableQuestionFields(publicState)).toContain("education_audience");
    expect(evaluateQualification(publicState)).toMatchObject({
      route: "education_b2g",
      modelVersion: "ana-qualification-v1.0.0",
      total: 0,
    });
  });

  it("uses the school need before routing and does not apply L.E.I.A. questions to teacher training", () => {
    const state = createQualificationState({
      fields: {
        ...schoolBase,
        need: "Queremos capacitar os professores para aplicar IA nas aulas.",
        school_type: "private",
      },
    });

    expect(state.route).toBe("education_b2b");
    expect(getApplicableQuestionFields(state)).toContain("education_audience");
    expect(getApplicableQuestionFields(state)).not.toContain("school_levels");
    expect(getApplicableQuestionFields(state)).not.toContain("eligible_students");
    expect(getApplicableQuestionFields(state)).not.toContain("tuition_band");
    expect(evaluateQualification(state)).toMatchObject({
      modelVersion: "ana-qualification-v1.0.0",
      total: 0,
    });
  });

  it("never asks for reputacao_escola, which is an internal enrichment field", () => {
    const state = createQualificationState({
      fields: {
        ...schoolBase,
        school_type: "private",
        school_levels: ["ensino médio"],
        reputacao_escola: "alta",
      },
    });

    expect(getApplicableQuestionFields(state)).not.toContain("reputacao_escola");
    expect(state.fields.reputacao_escola).toBe("alta");

    const notEvaluated = createQualificationState({ fields: schoolBase });
    expect(notEvaluated.fields.reputacao_escola).toBe("nao_avaliada");
  });

  it("does not allow a hard question to be skipped", () => {
    const state = createQualificationState({ fields: schoolBase });
    expect(getNextQuestion(state)?.field).toBe("school_type");

    const afterSkip = advanceQualification(state, { skip: true });
    expect(getNextQuestion(afterSkip)?.field).toBe("school_type");
    expect(afterSkip.lastError).toMatchObject({ code: "hard_answer_required", field: "school_type" });
  });

  it("does not let fields required by handoff become permanently skippable", () => {
    let state = createQualificationState({ fields: { need: "Quero aplicar IA na minha carreira." } });
    expect(getNextQuestion(state)).toMatchObject({ field: "name", importance: "hard", canSkip: false });

    state = createQualificationState({
      fields: { need: "Queremos capacitar nosso time.", name: "Lia", scope: "organization", organization_type: "company" },
    });
    expect(getNextQuestion(state)).toMatchObject({ field: "organization_name", importance: "hard", canSkip: false });

    state = createQualificationState({
      fields: {
        ...schoolBase,
        school_type: "private",
        school_levels: ["ensino médio"],
        eligible_students: 200,
        tuition_band: "above_2000",
      },
      skippedFields: ["eligible_students", "tuition_band"],
    });
    expect(getNextQuestion(state)).toMatchObject({ field: "contact_role", importance: "hard", canSkip: false });
  });

  it("confirms a medium skip once, then proceeds, while a soft skip proceeds immediately", () => {
    let state = createQualificationState({
      fields: { ...schoolBase, school_type: "private", school_levels: ["ensino médio"] },
    });
    expect(getNextQuestion(state)?.field).toBe("eligible_students");

    state = advanceQualification(state, "não sei");
    expect(getNextQuestion(state)?.field).toBe("eligible_students");
    expect(state.lastError?.code).toBe("confirm_medium_skip");

    state = advanceQualification(state, "prefiro não responder");
    expect(getNextQuestion(state)?.field).toBe("tuition_band");
    expect(state.skippedFields).toContain("eligible_students");

    state = advanceQualification(state, { skip: true });
    expect(getNextQuestion(state)?.field).toBe("contact_role");
    expect(state.skippedFields).toContain("tuition_band");
  });

  it("asks for the agreed next step, then the preferred channel and only its contact detail", () => {
    const completedIndividual = {
      need: "Quero aprender a aplicar IA no meu trabalho.",
      name: "Caio",
      scope: "individual",
      experience_level: "iniciante",
      timeline: "agora",
      next_step: "commercial_conversation",
    };

    let whatsappState = createQualificationState({ fields: completedIndividual });
    expect(getNextQuestion(whatsappState)).toMatchObject({
      field: "preferred_contact",
      prompt: "Por qual canal você prefere que o nosso time fale com você sobre essa conversa?",
    });
    whatsappState = advanceQualification(whatsappState, "WhatsApp");
    expect(getNextQuestion(whatsappState)).toMatchObject({
      field: "phone",
      prompt: "Qual WhatsApp com DDD o nosso time deve usar para falar com você?",
    });
    expect(whatsappState.fields.next_action).toBe("conversa_comercial_solicitada");
    whatsappState = advanceQualification(whatsappState, "(11) 99999-9999");
    expect(whatsappState.fields.phone).toBe("+5511999999999");

    let emailState = createQualificationState({ fields: completedIndividual });
    emailState = advanceQualification(emailState, "e-mail");
    expect(getNextQuestion(emailState)).toMatchObject({
      field: "email",
      prompt: "Qual e-mail o nosso time deve usar para falar com você?",
    });
    emailState = advanceQualification(emailState, "caio arroba example ponto com");
    expect(emailState.fields.email).toBe("caio@example.com");
    expect(getNextQuestion(emailState)).toBeNull();

    let knownWhatsappState = createQualificationState({
      channel: "whatsapp",
      fields: { ...completedIndividual, phone: "+55 11 99999-9999" },
    });
    expect(getNextQuestion(knownWhatsappState)?.prompt).toBe(
      "Posso usar este WhatsApp para o retorno do nosso time ou você prefere e-mail?",
    );
    knownWhatsappState = advanceQualification(knownWhatsappState, "WhatsApp");
    expect(getNextQuestion(knownWhatsappState)).toBeNull();

    for (const confirmation of ["sim", "pode", "pode sim", "claro, pode usar"]) {
      const confirmationState = advanceQualification(
        createQualificationState({
          channel: "whatsapp",
          fields: { ...completedIndividual, phone: "+5511999999999" },
        }),
        confirmation,
      );
      expect(confirmationState.fields.preferred_contact).toBe("whatsapp");
      expect(confirmationState.lastError).toBeNull();
      expect(getNextQuestion(confirmationState)).toBeNull();
    }

    const explicitEmailState = advanceQualification(
      createQualificationState({
        channel: "whatsapp",
        fields: { ...completedIndividual, phone: "+5511999999999" },
      }),
      "claro, mas prefiro e-mail",
    );
    expect(explicitEmailState.fields.preferred_contact).toBe("email");
    expect(getNextQuestion(explicitEmailState)?.field).toBe("email");
  });

  it("explains why it requests a contact channel for materials or a later follow-up", () => {
    const base = {
      need: "Quero aprender a aplicar IA no meu trabalho.",
      name: "Caio",
      scope: "individual",
      experience_level: "iniciante",
      timeline: "agora",
    };

    let materialsState = createQualificationState({
      fields: { ...base, next_step: "receive_materials" },
    });
    expect(getNextQuestion(materialsState)?.prompt).toBe("Por qual canal você prefere receber os materiais?");
    materialsState = advanceQualification(materialsState, "WhatsApp");
    expect(getNextQuestion(materialsState)?.prompt).toBe("Qual WhatsApp com DDD devo usar para enviar os materiais?");

    let laterState = createQualificationState({
      fields: { ...base, next_step: "follow_up_later" },
    });
    expect(getNextQuestion(laterState)?.prompt).toBe(
      "Para combinarmos uma retomada mais adiante, qual canal você prefere?",
    );
    laterState = advanceQualification(laterState, "e-mail");
    expect(getNextQuestion(laterState)?.prompt).toBe(
      "Qual e-mail podemos registrar para retomar este assunto mais adiante?",
    );

    const knownWhatsappMaterials = createQualificationState({
      channel: "whatsapp",
      fields: { ...base, next_step: "receive_materials", phone: "+5511999999999" },
    });
    expect(getNextQuestion(knownWhatsappMaterials)?.prompt).toBe(
      "Posso enviar os materiais por este WhatsApp ou você prefere e-mail?",
    );
  });

  it("routes other organizations by their need and keeps the institutional questions", () => {
    const training = createQualificationState({
      fields: {
        need: "Precisamos de capacitação em IA para nossa equipe.",
        name: "Joana",
        scope: "organization",
        organization_type: "ONG",
      },
    });
    const consulting = createQualificationState({
      fields: {
        need: "Precisamos redesenhar um processo crítico com IA.",
        name: "Joana",
        scope: "organization",
        organization_type: "associação",
      },
    });

    expect(training).toMatchObject({ cluster: "organization", route: "education_b2b" });
    expect(consulting).toMatchObject({ cluster: "organization", route: "consulting" });
    expect(getNextQuestion(training)?.field).toBe("organization_name");
    expect(getApplicableQuestionFields(training)).toContain("uf");
  });

  it("routes government consulting needs to consulting and training needs to B2G education", () => {
    const base = {
      name: "Lia",
      scope: "organization",
      organization_type: "government",
      organization_name: "Secretaria Teste",
    };

    expect(resolveProductRoute({ ...base, need: "Implantar um assistente para redesenhar processos." })).toBe(
      "consulting",
    );
    expect(resolveProductRoute({ ...base, need: "Criar governança e um roadmap de IA." })).toBe("consulting");
    expect(resolveProductRoute({ ...base, need: "Capacitar servidores no uso responsável de IA." })).toBe(
      "education_b2g",
    );
    expect(resolveProductRoute({ ...base, need: "Criar um programa de IA para estudantes da rede." })).toBe(
      "education_b2g",
    );
    expect(resolveProductRoute({ ...base, need: "Automatizar o atendimento aos servidores." })).toBe(
      "consulting",
    );
  });

  it("asks government audiences according to the route without assuming they are only public servants", () => {
    const shared = {
      name: "Lia",
      scope: "organization",
      organization_type: "government",
      organization_name: "Secretaria Teste",
      government_level: "state",
    };
    const education = createQualificationState({
      fields: { ...shared, need: "Criar um programa de IA para estudantes da rede." },
      skippedFields: ["website"],
    });
    const consulting = createQualificationState({
      fields: { ...shared, need: "Redesenhar o processo de atendimento com IA." },
      skippedFields: ["website"],
    });

    expect(getNextQuestion(education)).toMatchObject({
      field: "government_audience",
      prompt: "Qual público participaria da formação ou do programa?",
    });
    expect(getNextQuestion(consulting)).toMatchObject({
      field: "government_audience",
      prompt: "Quais áreas, equipes ou pessoas seriam impactadas pela iniciativa?",
    });
  });

  it("routes a school back-office transformation to consulting without L.E.I.A. questions", () => {
    const state = createQualificationState({
      fields: {
        ...schoolBase,
        need: "Queremos redesenhar o processo administrativo e implantar um assistente interno.",
        school_type: "private",
      },
    });

    expect(state.route).toBe("consulting");
    expect(getApplicableQuestionFields(state)).toContain("business_area");
    expect(getApplicableQuestionFields(state)).not.toContain("school_levels");
    expect(getApplicableQuestionFields(state)).not.toContain("eligible_students");
  });

  it("asks for the primary school initiative when the need contains mixed audience and process signals", () => {
    const studentProgram = createQualificationState({
      fields: {
        ...schoolBase,
        need: "Queremos oferecer um curso de IA para estudantes do 9º ano e ensino médio.",
        school_type: "private",
        school_levels: ["9º ano", "ensino médio"],
      },
    });
    let mixedProject = createQualificationState({
      fields: {
        ...schoolBase,
        need: "Queremos automatizar a matrícula e o atendimento aos alunos e famílias.",
        school_type: "private",
      },
    });

    expect(studentProgram.route).toBe("leia");
    expect(getApplicableQuestionFields(studentProgram)).toContain("eligible_students");
    expect(mixedProject.route).toBe("unknown");
    expect(getNextQuestion(mixedProject)).toMatchObject({ field: "school_initiative_type" });

    mixedProject = advanceQualification(mixedProject, "processos da instituição");
    expect(mixedProject.route).toBe("consulting");
    expect(getApplicableQuestionFields(mixedProject)).toContain("business_area");
    expect(getApplicableQuestionFields(mixedProject)).not.toContain("school_levels");
  });

  it("keeps a private student initiative outside the L.E.I.A. levels in review instead of routing it to B2B", () => {
    const state = createQualificationState({
      fields: {
        ...schoolBase,
        need: "Queremos oferecer um programa de IA para nossos alunos.",
        school_type: "private",
        school_levels: ["educação infantil", "fundamental I"],
      },
    });
    const evaluation = evaluateQualification(state);

    expect(state.route).toBe("unknown");
    expect(state.route).not.toBe("education_b2b");
    expect(getApplicableQuestionFields(state)).not.toContain("eligible_students");
    expect(getApplicableQuestionFields(state)).not.toContain("tuition_band");
    expect(evaluation.handoff.ready).toBe(false);
    expect(evaluation.handoff.blockers).toContain("route_unknown");
  });

  it("asks an explicit school initiative question when the original need is ambiguous", () => {
    const state = createQualificationState({
      fields: {
        ...schoolBase,
        need: "Queremos avançar no uso de IA na escola.",
        school_type: "private",
      },
    });

    expect(state.route).toBe("unknown");
    expect(getNextQuestion(state)).toMatchObject({
      field: "school_initiative_type",
      importance: "hard",
    });
  });

  it("accepts only an answer for the current question", () => {
    const state = createQualificationState();
    expect(() => advanceQualification(state, { field: "email", value: "ana@example.com" })).toThrow(
      'Expected an answer for "need"',
    );
  });

  it("returns an explainable evaluation for server consumers", () => {
    const state = createQualificationState({
      createdAt: "2026-10-20T12:00:00.000Z",
      fields: {
        ...schoolBase,
        school_type: "private",
        school_levels: ["9º ano", "ensino médio"],
        eligible_students: 210,
        tuition_band: "above_2000",
        reputacao_escola: "alta",
        contact_role: "Diretor geral",
        target_year: 2027,
        uf: "Distrito Federal",
        next_step: "commercial_conversation",
        email: "marina@colegio.example",
        preferred_contact: "email",
        next_action: "diagnostico_agendado",
      },
    });

    const evaluation = evaluateQualification(state);
    expect(evaluation).toMatchObject({
      cluster: "school",
      route: "leia",
      regionTag: "ana-region-df",
      icpScore: 60,
      opportunityScore: 40,
      total: 100,
      completeness: 100,
      handoff: { ready: true, blockers: [] },
    });
    expect(evaluation.gates).toMatchObject({ status: "passed", passed: true });
    expect(evaluation.evidence).toHaveLength(7);
  });

  it("keeps institutional handoff blocked without the organization name and the L.E.I.A. contact role", () => {
    const withoutOrganization = createQualificationState({
      fields: {
        ...schoolBase,
        organization_name: "",
        school_type: "private",
        school_levels: ["ensino médio"],
        contact_role: "Coordenação pedagógica",
        target_year: 2027,
        uf: "SP",
        preferred_contact: "email",
        email: "marina@example.com",
      },
    });
    expect(evaluateQualification(withoutOrganization).handoff.blockers).toContain(
      "organization_name_missing",
    );

    const withoutRole = createQualificationState({
      fields: {
        ...schoolBase,
        school_type: "private",
        school_levels: ["ensino médio"],
        target_year: 2027,
        uf: "SP",
        preferred_contact: "email",
        email: "marina@example.com",
      },
    });
    expect(evaluateQualification(withoutRole).handoff.blockers).toContain(
      "leia_contact_role_missing",
    );
  });

  it("keeps material-first leads in nurture instead of triggering sales distribution", () => {
    const state = createQualificationState({
      fields: {
        ...schoolBase,
        school_type: "private",
        school_levels: ["ensino médio"],
        contact_role: "Diretora",
        target_year: 2027,
        uf: "SP",
        next_step: "receive_materials",
        preferred_contact: "email",
        email: "marina@example.com",
      },
      skippedFields: ["eligible_students", "tuition_band"],
    });
    const evaluation = evaluateQualification(state);
    expect(evaluation.handoff).toMatchObject({ ready: false });
    expect(evaluation.handoff.blockers).toContain("sales_next_step_not_selected");
    expect(evaluation.evidence.find((item) => item.criterion === "next_action")?.points).toBe(3);
  });
});

