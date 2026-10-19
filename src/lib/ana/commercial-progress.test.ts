import { describe, expect, it } from "vitest";
import { analyzeAnaConversation, immediateAnaReply } from "./conversation";
import { progressMessages } from "./progress-suite";
import { buildAnaInstructions } from "./agent";
import { validateAnaAnswer } from "./guardrails";
import { emptyAnaRetrieval } from "./retrieval";

const request = "Meu nome é Claudio Tester. Quero contratar um diagnóstico para descobrir onde a IA pode melhorar minha empresa.";
const complete = `${request} Minha empresa se chama Acme. Somos um escritório de advocacia. A área envolvida é atendimento. Atualmente não usamos IA. Queremos descobrir oportunidades. Nossa principal restrição é tempo. Queremos começar mês que vem. Eu decido a contratação.`;
const fields = [
  ["name", "Qual é o seu nome?"],
  ["organization", "Qual é a sua empresa?"],
  ["organizationContext", "O que a sua organização faz?"],
  ["businessChallenge", "O que motivou a procura por ajuda com IA?"],
  ["audience", "Qual área ou público está envolvido?"],
  ["currentAiUse", "Como vocês usam IA atualmente?"],
  ["desiredOutcome", "Qual resultado vocês esperam alcançar?"],
  ["mainConstraint", "Qual é a principal restrição hoje?"],
  ["timeline", "Quando vocês gostariam de começar?"],
  ["decisionProcess", "Como funciona a decisão de contratação?"],
] as const;

describe("approved complete qualification with acknowledged gaps", () => {
  it("does not restart an existing need after Leonardo gives his name", () => {
    const history = progressMessages("Quero melhorar atendimento, cobrança e resolução de chamados com IA.", "A consultoria pode ajudar nesses processos. Qual é o seu nome?", "Leonardo.");
    const state = analyzeAnaConversation(history);
    expect(state.qualification.businessAreas).toHaveLength(3);
    expect(immediateAnaReply(state, history)).not.toContain("Como posso te ajudar");
    expect(immediateAnaReply(state, history)).toContain("atendimento");
  });
  it("Claudio's name and timeline alone do not complete commercial qualification", () => {
    const state = analyzeAnaConversation(progressMessages("Quero contratar um diagnóstico para descobrir onde a IA pode melhorar minha empresa.", "Qual é o seu nome?", "Claudio Tester.", "Quando vocês gostariam de começar?", "Ainda esse mês."));
    expect(state.qualification.timeline).toBe("Ainda esse mês.");
    expect(state.nextQuestion?.key).toBe("organization");
    expect(state.leadStage).toBe("qualifying");
  });
  it.each(fields)("records unknown %s and moves on", (field, question) => {
    const state = analyzeAnaConversation(progressMessages(request, question, "Não sei"));
    expect(state.qualification.answers?.[field]).toMatchObject({ status: "unknown", answer: "Não sei" });
    expect(state.nextQuestion?.key).not.toBe(field);
    expect(state.qualification.contactConsent).toBe(false);
  });
  it.each(fields)("records declined %s and moves on", (field, question) => {
    const state = analyzeAnaConversation(progressMessages(request, question, "Prefiro não informar"));
    expect(state.qualification.answers?.[field]).toMatchObject({ status: "declined", answer: "Prefiro não informar" });
    expect(state.nextQuestion?.key).not.toBe(field);
    expect(state.qualification.contactConsent).toBe(false);
  });
  it("accepts sufficient free-form context without repeating discovery", () => {
    const state = analyzeAnaConversation(progressMessages(complete));
    expect(state.qualification.organization).toBe("Acme");
    expect(state.nextQuestion?.key).toBe("contactConsent");
    expect(state.leadStage).toBe("qualified");
  });
  it("completes the interview with unknown answers without claiming all facts known", () => {
    const turns = [request];
    for (const [, question] of fields) turns.push(question, "Não sei");
    const state = analyzeAnaConversation(progressMessages(...turns));
    expect(state.nextQuestion?.key).toBe("contactConsent");
    expect(state.leadStage).toBe("qualified");
    expect(state.qualificationScore).toBeLessThan(100);
    expect(state.qualification.timeline).toBeUndefined();
  });
  it.each(["Não sei", "Prefiro não informar"])("finishes a real controller-driven interview with %s, including reload", answer => {
    let history = progressMessages(request);
    let state = analyzeAnaConversation(history);
    const asked = new Set<string>();
    for (let turn = 0; turn < 15 && state.nextQuestion?.key !== "contactConsent"; turn++) {
      expect(state.nextQuestion).toBeDefined();
      const question = state.nextQuestion!;
      expect(asked.has(question.key), `repeated ${question.key}`).toBe(false);
      asked.add(question.key);
      const reply = question.text;
      history = progressMessages(request, reply, answer);
      state = analyzeAnaConversation(history, undefined, JSON.parse(JSON.stringify(state.qualification)));
      expect(state.qualification.contactConsent).toBe(false);
      expect(immediateAnaReply(state, history)).not.toMatch(/time.*depois|quando você souber|vencedor|desempate/);
    }
    expect(state.nextQuestion?.key).toBe("contactConsent");
    expect(state.qualificationScore).toBeLessThan(100);
    const consented = analyzeAnaConversation(progressMessages(request, state.nextQuestion!.text, "Sim"), undefined, state.qualification);
    expect(consented.nextQuestion?.key).toBe("contact");
    const handoff = analyzeAnaConversation(progressMessages(request, consented.nextQuestion!.text, "sintetico@example.com"), undefined, consented.qualification);
    expect(handoff.leadStage).toBe("handoff");
    expect(handoff.pendingQualification?.length).toBeGreaterThan(0);
    expect(immediateAnaReply(handoff, [], false)).toBeUndefined();
    expect(immediateAnaReply(handoff, [], true)).toContain("ficou registrado");
  });
  it("does not mistake a statement about an unnamed school for its name", () => {
    const state = analyzeAnaConversation(progressMessages("Eu tenho uma escola e queria saber como a Amplify pode me ajudar"));
    expect(state.qualification.organization).toBeUndefined();
  });
  it.each(["Minha empresa é pequena.", "Minha escola é particular."])("does not identify an organization from a descriptive attribute: %s", text => {
    const state = analyzeAnaConversation(progressMessages(text));
    expect(state.qualification.organization).toBeUndefined();
  });
  it("preserves office context given in Carlitos's introduction", () => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Carlitos e eu sou dono de um escritório de advocacia. Quero um orçamento para atendimento."));
    expect(state.qualification.answers?.organizationContext?.answer).toContain("escritório de advocacia");
  });
  it("does not turn an unsolicited timeline into the company name", () => {
    const state = analyzeAnaConversation(progressMessages(request, "Qual é a sua empresa?", "Mês que vem"));
    expect(state.qualification.organization).toBeUndefined();
    expect(state.qualification.timeline).toBe("Mês que vem");
    expect(state.nextQuestion?.key).toBe("organization");
  });
  it("does not turn combined goals into the company name", () => {
    const state = analyzeAnaConversation(progressMessages(request, "Qual é a sua empresa?", "Quero trabalhar as três áreas juntas."));
    expect(state.qualification.organization).toBeUndefined();
    expect(state.nextQuestion?.key).toBe("organization");
  });
  it("updates the organization's name rather than retaining the first mention", () => {
    const first = analyzeAnaConversation(progressMessages(complete)).qualification;
    const state = analyzeAnaConversation(progressMessages("Corrigindo: minha empresa se chama Beta."), undefined, first);
    expect(state.qualification.organization).toBe("Beta");
    expect(state.qualification.answers?.organization?.sourceText).toContain("Corrigindo");
  });
  it.each(["Quero trabalhar as três áreas juntas.", "Os dois objetivos são igualmente importantes."])("advances naturally after %s", answer => {
    const state = analyzeAnaConversation(progressMessages("Meu nome é Carlitos. Quero contratar um diagnóstico para atendimento, cobrança e chamados, para reduzir custos e melhorar a qualidade do atendimento.", "Qual dessas áreas você prefere?", answer));
    expect(state.nextQuestion?.key).toBe("organization");
    const reply = immediateAnaReply(state, progressMessages(answer));
    expect(reply).toContain(state.nextQuestion!.text);
    expect(reply).not.toMatch(/vencedor|desempate|antes do outro/);
  });
  it.each(["grades", "students", "internet"] as const)("unknown school prerequisite %s is not proof of eligibility", field => {
    const questions = { grades: "Sua escola atende do 9º ano ao Ensino Médio?", students: "Quantos estudantes vocês imaginam atender?", internet: "A escola tem conexão estável à internet?" };
    const state = analyzeAnaConversation(progressMessages("Meu nome é Leo. Quero contratar o L.E.I.A. para ensinar IA aos estudantes.", questions[field], "Não sei"));
    expect(state.qualification.answers?.[field]?.status).toBe("unknown");
    expect(state.nextQuestion?.key).not.toBe(field);
    if (field === "grades") expect(state.qualification.gradeFit).toBeUndefined();
    if (field === "internet") expect(state.qualification.internetReady).toBeUndefined();
    expect(state.knownFacts.join(" ")).not.toMatch(/atende à faixa|possui conexão estável/);
  });
  it("an explicit internet incompatibility remains a blocker after the interview", () => {
    const q = analyzeAnaConversation(progressMessages(complete)).qualification;
    const state = analyzeAnaConversation(progressMessages("Quero contratar o L.E.I.A. para ensinar IA aos alunos do Ensino Médio. Temos 90 alunos, mas não temos internet."), undefined, { ...q, offerInterest: "leia", offerInterests: ["leia"], qualificationFocus: "leia" });
    expect(state.qualification.internetReady).toBe(false);
    expect(state.leadStage).not.toBe("qualified");
    expect(state.nextQuestion?.key).not.toBe("contactConsent");
  });
  it("unknown consent never substitutes for explicit authorization", () => {
    const state = analyzeAnaConversation(progressMessages(complete, "Quer que eu peça para alguém do nosso time entrar em contato com você?", "Não sei"));
    expect(state.qualification.contactConsent).toBe(false);
    expect(state.nextQuestion?.key).not.toBe("contact");
  });
  it("does not assign unknown priorities to the pending timeline", () => {
    const state = analyzeAnaConversation(progressMessages(request, "Quando vocês gostariam de começar?", "Quero avançar com o diagnóstico, mas não sei ainda quais são minhas prioridades."));
    expect(state.qualification.answers?.timeline).toBeUndefined();
    expect(state.qualification.priorityStatus).toBe("undecided");
  });
  it("updates unknown persisted information when a later answer arrives", () => {
    const prior = analyzeAnaConversation(progressMessages(request, "Quando vocês gostariam de começar?", "Não sei")).qualification;
    const state = analyzeAnaConversation(progressMessages("Agora sei: queremos começar mês que vem."), undefined, prior);
    expect(state.qualification.answers?.timeline?.status).toBe("provided");
    expect(state.qualification.timeline).toContain("mês que vem");
  });
  it("retains legacy unavailability after history truncation without inventing a quote", () => {
    const previous = analyzeAnaConversation(progressMessages(complete)).qualification;
    delete previous.answers;
    delete previous.timeline;
    previous.deferredQuestions = ["timeline"];
    const state = analyzeAnaConversation(progressMessages("Certo"), undefined, previous);
    expect(state.qualification.answers?.timeline).toMatchObject({ status: "unknown", legacy: true });
    expect(state.qualification.answers?.timeline?.sourceText).toBeUndefined();
  });
  it("associates explicit unknown timing with timing, not the current organizational question", () => {
    const state = analyzeAnaConversation(progressMessages(request, "Qual é a sua empresa?", "Ainda não sei o prazo."));
    expect(state.qualification.answers?.timeline?.status).toBe("unknown");
    expect(state.qualification.answers?.organization).toBeUndefined();
    expect(state.nextQuestion?.key).toBe("organization");
  });
  it.each(["Sim", "Não"])("accepts a short answer about existing IA use: %s", answer => {
    const state = analyzeAnaConversation(progressMessages(request, "Já usam IA atualmente?", answer));
    expect(state.qualification.answers?.currentAiUse).toMatchObject({ status: "provided", answer });
    expect(state.qualification.contactConsent).toBe(false);
  });
  it.each([
    ["name", "Qual é o seu nome?", "Agora meu nome é Lia."],
    ["grades", "Sua escola atende do 9º ano ao Ensino Médio?", "Atendemos o Ensino Médio."],
    ["students", "Quantos estudantes vocês imaginam atender?", "Temos 90 estudantes."],
    ["internet", "A escola tem internet?", "Agora temos internet estável."],
  ] as const)("later typed information resolves an unknown %s", (field, question, answer) => {
    const prior = analyzeAnaConversation(progressMessages("Quero contratar o L.E.I.A. para ensinar IA aos alunos.", question, "Não sei")).qualification;
    const state = analyzeAnaConversation(progressMessages(answer), undefined, prior);
    expect(state.qualification.answers?.[field]?.status).toBe("provided");
    expect(state.qualification.answers?.[field]?.sourceText).toBe(answer);
  });
  it("does not treat a contact channel as authorization", () => {
    const state = analyzeAnaConversation(progressMessages(complete, "Qual é o melhor e-mail ou WhatsApp?", "teste@example.com"));
    expect(state.qualification.contactConsent).toBe(false);
    expect(state.leadStage).not.toBe("handoff");
  });
  it("does not fabricate school context or recommend LEIA to law-firm employees", () => {
    const state = analyzeAnaConversation(progressMessages("Bom dia! Meu nome é Carlitos e tenho um escritório de advocacia.", "Como posso ajudar?", "Quero reduzir custos e melhorar a qualidade do atendimento com IA."));
    expect(state.knownFacts.join(" ")).not.toContain("operação da escola");
    expect(validateAnaAnswer("Recomendo o L.E.I.A. — Laboratório Escolar de Inteligência Artificial para preparar a equipe do escritório.", state, emptyAnaRetrieval("direct", "", "test")).issues).toContain("inappropriate_offer");
    expect(validateAnaAnswer("O L.E.I.A. — Laboratório Escolar de Inteligência Artificial atende estudantes, não a equipe de um escritório.", state, emptyAnaRetrieval("direct", "", "test")).issues).not.toContain("inappropriate_offer");
    expect(validateAnaAnswer("O L.E.I.A. — Laboratório Escolar de Inteligência Artificial pode ajudar estudantes a usar IA com critério.", state, emptyAnaRetrieval("direct", "", "test")).issues).not.toContain("inappropriate_offer");
  });
  it("does not leak policy vocabulary or omit a required next question", () => {
    const state = analyzeAnaConversation(progressMessages(request, "Qual área pesa mais?", "Quero trabalhar as três áreas juntas."));
    expect(buildAnaInstructions(state)).not.toMatch(/vencedor|desempate/);
    expect(validateAnaAnswer("Vamos considerar as três juntas.", state, emptyAnaRetrieval("direct", "", "test")).issues).toContain("missing_recommended_question");
  });
  it("does not associate a separate training description with a factual LEIA explanation", () => {
    const state = analyzeAnaConversation(progressMessages("Como vocês podem me ajudar?"), "/leia");
    const text = "Educação, para preparar pessoas e equipes\nConsultoria, para processos\nSe quiser, posso explicar o L.E.I.A. — Laboratório Escolar de Inteligência Artificial. Qual é o seu nome?";
    expect(validateAnaAnswer(text, state, emptyAnaRetrieval("direct", "", "test")).issues).not.toContain("inappropriate_offer");
  });
});
