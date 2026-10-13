import { describe, expect, it } from "vitest";
import { analyzeAnaConversation, immediateAnaReply, type AnaLeadQualification } from "./conversation";
import { ANA_PROGRESS_REPLAYS, consultingTranscript, progressMessages, schoolOffer1 } from "./progress-suite";
import { validateAnaAnswer } from "./guardrails";
import { emptyAnaRetrieval } from "./retrieval";
import { buildAnaInstructions } from "./agent";

describe("real dialogue progress", () => {
  it.each(ANA_PROGRESS_REPLAYS)("$name", scenario => {
    const history = progressMessages(...scenario.turns.map(t => t.text));
    let previous: AnaLeadQualification | undefined;
    let state = analyzeAnaConversation(history.slice(0, 1));
    for (let i = 0; i < history.length; i += 2) {
      state = analyzeAnaConversation(history.slice(0, i + 1), undefined, previous);
      previous = state.qualification;
    }
    for (const [key, value] of Object.entries(scenario.expected)) {
      expect(key === "nextQuestionKey" ? state.nextQuestion?.key : state[key as keyof typeof state], key).toEqual(value);
    }
    expect(state.qualification).toMatchObject(scenario.expectedQualification ?? {});
    if (state.answerRequired) expect(immediateAnaReply(state, history)).toBeUndefined();
  });
  it.each(["ok quero sim,", "Legal! Me explique entao", "pode me explicar", "sim, por favor"])("honors explanation: %s", answer => {
    const state = analyzeAnaConversation(progressMessages("Tenho uma escola", schoolOffer1, answer));
    expect(state.answerRequired).toBe(true);
    expect(state.nextQuestion).toBeUndefined();
    expect(state.qualification.contactConsent).toBe(false);
  });
  it.each(["Não quero", "sim, mas antes quanto custa?", "quero contratar", "prefiro não"])("does not invent acceptance: %s", answer => {
    const state = analyzeAnaConversation(progressMessages("Tenho uma escola", schoolOffer1, answer));
    expect(state.acceptedAssistantOffer).toBeUndefined();
  });
  it("advances once sufficient consulting facts arrive without a questionnaire", () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Carlitos. Quero uma proposta para automatizar atendimento e cobrança do escritório. Queremos começar mês que vem."));
    expect(state.qualification.name).toBe("Carlitos");
    expect(state.leadStage).toBe("qualified");
    expect(state.nextQuestion?.key).toBe("contactConsent");
    expect(state.qualification.contactConsent).toBe(false);
  });
  it("a diagnostic can discover priorities but still requires the existing timeline", () => {
    const history = progressMessages("Meu nome é Leo. Quero contratar um diagnóstico de IA para identificar oportunidades no negócio, pois ainda não sei as prioridades.");
    const state = analyzeAnaConversation(history);
    expect(state.qualification.businessChallenge).toBeTruthy();
    expect(state.nextQuestion?.key).toBe("timeline");
    expect(state.leadStage).not.toBe("qualified");
  });
  it("not knowing a required timeline does not fabricate qualification or force repetition", () => {
    const history = progressMessages("Meu nome é Leo. Quero contratar consultoria para atendimento e cobrança.", "Quando vocês gostariam de começar?", "Ainda não sei");
    const state = analyzeAnaConversation(history);
    expect(state.qualification.timeline).toBeUndefined();
    expect(state.leadStage).not.toBe("qualified");
    expect(state.nextQuestion).toBeUndefined();
    expect(immediateAnaReply(state, history)).toBeTruthy();
  });
  it("accepts both school tracks while retaining all existing eligibility checks", () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Leo. Quero contratar para ensinar IA aos alunos e melhorar a gestão da escola.", "Qual dessas duas frentes é mais urgente agora: implementar o L.E.I.A. ou aplicar IA na operação da escola?", "As duas juntas"));
    expect(state.qualification.qualificationFocus).toBe("multiple");
    expect(state.nextQuestion?.key).toBe("grades");
    expect(state.leadStage).not.toBe("qualified");
  });
  it("does not treat both goals as two offers or ask school eligibility in consulting", () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Carlitos. Quero uma proposta para atendimento ao cliente.", "Você quer focar primeiro em reduzir custos ou melhorar a qualidade?", "Ambos"));
    expect(state.qualification.qualificationFocus).toBe("consulting");
    expect(state.nextQuestion?.key).toBe("timeline");
  });
  it("does not store a new objective as a timeline when the user changes subject", () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Carlitos. Quero orçamento para atendimento ao cliente.", "Quando vocês gostariam de começar?", "Quero reduzir custos e melhorar a qualidade do atendimento."));
    expect(state.qualification.timeline).toBeUndefined();
    expect(state.nextQuestion?.key).toBe("timeline");
    expect(state.leadStage).not.toBe("qualified");
  });
  it("guardrails reject qualification replacing the promised explanation", () => {
    const state = analyzeAnaConversation(progressMessages("Tenho uma escola", schoolOffer1, "ok quero sim"));
    expect(validateAnaAnswer("Qual é a principal necessidade da escola?", state, emptyAnaRetrieval("direct", "", "test")).issues).toContain("qualification_instead_of_explanation");
  });
  it("guardrails reject forcing a winner after both goals are resolved", () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Carlitos. Quero orçamento para atendimento ao cliente.", "Você quer focar primeiro em reduzir custos ou melhorar a qualidade?", "Ambos"));
    const trace = emptyAnaRetrieval("direct", "", "test");
    expect(validateAnaAnswer("Qual dos dois é prioridade agora?", state, trace).issues).toContain("unnecessary_priority");
    expect(validateAnaAnswer("Vamos considerar os dois. Quando gostariam de começar?", state, trace).valid).toBe(true);
  });
  it("accepting product details is not evidence of the school's prerequisites", () => {
    const state = analyzeAnaConversation(progressMessages("Tenho uma escola", schoolOffer1, "sim"));
    expect(state.qualification.gradeFit).toBeUndefined();
    expect(state.qualification.internetReady).toBeUndefined();
    expect(state.qualification.advancementIntent).toBe(false);
    expect(state.qualification.contactConsent).toBe(false);
  });
  it("keeps an unavailable timeline pending across later messages", () => {
    const history = progressMessages("Meu nome é Leo. Quero consultoria para atendimento.", "Quando querem começar?", "Não sei", "Tudo bem.", "As três áreas são importantes.");
    const state = analyzeAnaConversation(history);
    expect(state.nextQuestion).toBeUndefined();
    expect(state.qualification.timeline).toBeUndefined();
    expect(state.leadStage).not.toBe("qualified");
  });
  it("resolves an unavailable timeline after an explicit later answer", () => {
    const history = progressMessages("Meu nome é Leo. Quero uma proposta para atendimento.", "Quando querem começar?", "Não sei", "Tudo bem.", "Agora sei: queremos começar mês que vem.");
    const state = analyzeAnaConversation(history);
    expect(state.qualification.deferredQuestions).toEqual([]);
    expect(state.nextQuestion?.key).toBe("contactConsent");
  });
  it.each(["Todas", "As 3", "As três juntas", "As três são igualmente prioritárias"])("accepts combined scope without a forced format: %s", answer => {
    const state = analyzeAnaConversation(progressMessages(...consultingTranscript.slice(0, 14), answer));
    expect(state.qualification.priorityStatus).toBe("combined");
    expect(state.qualification.businessAreas).toEqual(["atendimento", "chamados", "cobrança"]);
    expect(state.nextQuestion?.key).toBe("timeline");
  });
  it("does not overwrite a single chosen offer with a negated both", () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Leo. Quero contratar para alunos e gestão.", "Qual frente prefere?", "Não quero as duas; prefiro o LEIA."));
    expect(state.qualification.priorityStatus).not.toBe("combined");
  });
  it("accepts a free-form problem outside the named area vocabulary", () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Lia. Quero uma proposta. Nosso gargalo é a conciliação manual de faturas duplicadas. Desejamos começar mês que vem."));
    expect(state.qualification.businessChallenge).toContain("conciliação manual de faturas");
    expect(state.qualification.businessAreas).toEqual([]);
    expect(state.nextQuestion?.key).toBe("contactConsent");
    expect(state.leadStage).toBe("qualified");
  });
  it("does not interpret a live diagnostic explanation as an unanswered question", () => {
    const history = progressMessages(...consultingTranscript.slice(0, 7),
      "O diagnóstico na prática é um trabalho focado em gerar clareza e direção antes de qualquer implementação. Começamos mapeando o seu contexto operacional — as rotinas, os desafios reais e os dados que vocês já possuem — para identificar onde a IA pode gerar impacto efetivo, evitando gastos com testes que não se sustentam.",
      "Quero avançar com o diagnóstico, mas não sei ainda quais são minhas prioridades.");
    const state = analyzeAnaConversation(history);
    expect(state.deferredQuestion).toBeUndefined();
    expect(state.nextQuestion?.key).toBe("timeline");
  });
  it("does not reopen a sufficient business problem as an unavailable priority", () => {
    const history = progressMessages("Meu nome é Leo. Quero um diagnóstico para atendimento e cobrança.",
      "Qual problema você gostaria de resolver com IA?", "Ainda não sei as prioridades.");
    const state = analyzeAnaConversation(history);
    expect(state.qualification.businessChallenge).toBeTruthy();
    expect(state.deferredQuestion).toBeUndefined();
    expect(state.nextQuestion?.key).toBe("timeline");
  });
  it("does not defer a business problem already available in persisted state", () => {
    const previous = analyzeAnaConversation(progressMessages("Meu nome é Leo. Quero um diagnóstico para atendimento e cobrança.")).qualification;
    const state = analyzeAnaConversation([
      { id: "a", role: "assistant", parts: [{ type: "text", text: "Qual problema você gostaria de resolver com IA?" }] },
      { id: "u", role: "user", parts: [{ type: "text", text: "Ainda não sei as prioridades." }] },
    ], undefined, previous);
    expect(state.qualification.deferredQuestions).toEqual([]);
    expect(state.nextQuestion?.key).toBe("timeline");
  });
  it("makes the existing no-question decision explicit for an ineligible school", () => {
    const state = analyzeAnaConversation(progressMessages("Somos uma escola de educação infantil. O L.E.I.A. serve?"));
    expect(state.shouldAskQuestion).toBe(false);
    expect(buildAnaInstructions(state)).toContain("Não faça perguntas neste turno, nem peça o nome");
  });
});
