import { describe, expect, it } from "vitest";
import type { AnaMessage } from "./types";
import { analyzeAnaConversation, immediateAnaReply } from "./conversation";
import { ANA_REFERENCE_SUITE } from "./reference-suite";

function messages(turns: Array<{ role: "user" | "assistant"; text: string }>) {
  return turns.map((turn, index) => ({
    id: `message-${index}`,
    role: turn.role,
    parts: [{ type: "text", text: turn.text }],
  })) as AnaMessage[];
}

describe("Ana reference conversation suite", () => {
  it.each(ANA_REFERENCE_SUITE)("$name", (scenario) => {
    const state = analyzeAnaConversation(messages(scenario.turns), scenario.pagePath);
    expect(state).toMatchObject(scenario.expected);
  });

  it("answers a greeting briefly without pitching the company", () => {
    const conversation = messages([{ role: "user", text: "Olá" }]);
    const reply = immediateAnaReply(analyzeAnaConversation(conversation), conversation);
    expect(reply).toBe("Oi! Tudo bem? Eu sou a Ana. Qual é o seu nome?");
    expect(reply).not.toContain("Amplify ajuda");
  });

  it("acknowledges L.E.I.A. without repeating the previous qualification question", () => {
    const conversation = messages([
      { role: "user", text: "Quero conhecer o L.E.I.A." },
      { role: "assistant", text: "Quais séries sua escola atende?" },
      { role: "user", text: "Entendi." },
    ]);
    const reply = immediateAnaReply(analyzeAnaConversation(conversation), conversation);
    expect(reply).toContain("L.E.I.A.");
    expect(reply).not.toContain("Quais séries");
    expect(reply?.match(/\?/g) ?? []).toHaveLength(0);
  });

  it("retains useful facts and recent questions as conversation memory", () => {
    const conversation = messages([
      { role: "user", text: "Sou dono de uma escola particular." },
      { role: "assistant", text: "Que legal. Você busca algo para alunos ou professores?" },
      { role: "user", text: "Para os alunos." },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(state.knownFacts).toContain("A pessoa é proprietária de uma escola.");
    expect(state.knownFacts).toContain("A escola é particular.");
    expect(state.knownFacts).toContain("O interesse mencionado envolve estudantes.");
    expect(state.recentAssistantQuestions).toEqual(["Que legal. Você busca algo para alunos ou professores?"]);
  });

  it("qualifies a L.E.I.A. lead progressively without repeating questions", () => {
    const conversation = messages([
      { role: "user", text: "Sou dono de uma escola particular e quero conhecer o L.E.I.A." },
      { role: "assistant", text: "Sua escola atende turmas do 9º ano do Ensino Fundamental à 3ª série do Ensino Médio?" },
      { role: "user", text: "Sim, temos 180 alunos." },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(state.stage).toBe("qualification");
    expect(state.leadStage).toBe("qualifying");
    expect(state.qualification).toMatchObject({
      role: "proprietário(a)",
      schoolSector: "private",
      offerInterest: "leia",
      gradeFit: true,
      studentCount: 180,
    });
    expect(state.nextQuestion).toEqual({ key: "name", text: "Qual é o seu nome?" });
  });

  it("moves a qualified lead to consented handoff when contact is supplied", () => {
    const conversation = messages([
      { role: "user", text: "Sou diretor de uma escola. Atendemos do 9º ano ao Ensino Médio, com 200 alunos e internet estável." },
      { role: "assistant", text: "Posso registrar seu nome e seu melhor e-mail ou WhatsApp para o time continuar essa conversa?" },
      { role: "user", text: "Sim, meu nome é Rafael e meu e-mail é rafael@colegio.com.br." },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(state.stage).toBe("handoff");
    expect(state.leadStage).toBe("handoff");
    expect(state.qualification).toMatchObject({
      name: "Rafael",
      email: "rafael@colegio.com.br",
      contactConsent: true,
    });
    expect(state.nextQuestion).toBeUndefined();
  });

  it("does not treat a contact detail as consent when Ana did not ask for it", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Meu e-mail é pessoa@exemplo.com e queria entender o programa." },
    ]));
    expect(state.qualification.email).toBe("pessoa@exemplo.com");
    expect(state.qualification.contactConsent).toBe(false);
    expect(state.leadStage).not.toBe("handoff");
  });

  it("stops qualification when the school does not serve the L.E.I.A. grade range", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Sou dono de uma escola particular, mas atendemos somente até o 8º ano." },
    ]));
    expect(state.leadStage).toBe("nurture");
    expect(state.qualification.gradeFit).toBe(false);
    expect(state.nextQuestion).toBeUndefined();
  });

  it("confirms handoff only after persistence succeeds", () => {
    const conversation = messages([
      { role: "user", text: "Quero falar com vendas sobre o L.E.I.A." },
      { role: "assistant", text: "Posso registrar seu nome e seu melhor e-mail ou WhatsApp para o time continuar essa conversa?" },
      { role: "user", text: "Pode sim, meu e-mail é contato@escola.com.br." },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(immediateAnaReply(state, conversation)).toBeUndefined();
    expect(immediateAnaReply(state, conversation, true)).toContain("contato ficou registrado");
  });

  it("respects an explicit refusal of contact", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Sou diretor de uma escola com turmas do 9º ano, 150 alunos e internet estável." },
      { role: "assistant", text: "Posso registrar seus dados para o time continuar a conversa?" },
      { role: "user", text: "Prefiro não receber contato." },
    ]));
    expect(state.qualification.contactRevoked).toBe(true);
    expect(state.qualification.contactConsent).toBe(false);
    expect(state.nextQuestion).toBeUndefined();
    expect(state.leadStage).toBe("qualified");
  });

  it("understands natural short answers without losing the qualification state", () => {
    const conversation = messages([
      { role: "user", text: "Queria saber como vc pode me ajudar aqui na minha escola." },
      { role: "assistant", text: "Sua escola atende turmas do 9º ano do Ensino Fundamental à 3ª série do Ensino Médio?" },
      { role: "user", text: "uhum" },
      { role: "assistant", text: "Quantos estudantes vocês imaginam atender?" },
      { role: "user", text: "uns 90" },
      { role: "assistant", text: "A escola tem conexão estável à internet para as turmas?" },
      { role: "user", text: "Tem sim." },
    ]);

    const state = analyzeAnaConversation(conversation);
    expect(state.qualification).toMatchObject({
      offerInterest: "leia",
      gradeFit: true,
      studentCount: 90,
      internetReady: true,
    });
    expect(state.qualificationScore).toBeGreaterThan(0);
    expect(state.nextQuestion?.key).toBe("need");
    expect(immediateAnaReply(state, conversation)).toContain("principal necessidade");
  });

  it("preserves simultaneous interests and recognizes an informal price objection", () => {
    const conversation = messages([
      { role: "user", text: "Queria ajuda para minha escola." },
      { role: "assistant", text: "Sua escola atende do 9º ano ao Ensino Médio?" },
      { role: "user", text: "uhum" },
      { role: "assistant", text: "Quantos estudantes vocês imaginam atender?" },
      { role: "user", text: "uns 90" },
      { role: "assistant", text: "A escola tem internet estável?" },
      { role: "user", text: "Tem sim." },
      { role: "assistant", text: "Qual é a principal necessidade da escola com IA hoje?" },
      { role: "user", text: "Eu preciso ensinar IA pros meus alunos e tbm implantar soluções de IA para tornar o negócio mais otimizado." },
      { role: "assistant", text: "Quando vocês gostariam de começar?" },
      { role: "user", text: "Depende de qto vai cutar." },
    ]);

    const state = analyzeAnaConversation(conversation);
    expect(state.turnKind).toBe("request");
    expect(state.shouldRetrieveKnowledge).toBe(true);
    expect(state.qualification.pricingIntent).toBe(true);
    expect(state.qualification.needs).toEqual(expect.arrayContaining(["students", "processes", "product"]));
    expect(state.qualification.offerInterests).toEqual(expect.arrayContaining(["leia", "consulting", "product-development"]));
    expect(state.qualification).toMatchObject({ gradeFit: true, studentCount: 90, internetReady: true });
    expect(state.nextQuestion?.key).toBe("contactConsent");
  });

  it("merges the persisted qualification instead of resetting confirmed facts", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Quero entender o preço." },
    ]), "/lab/ana", {
      name: "Leonardo",
      offerInterest: "leia",
      offerInterests: ["leia"],
      need: "students",
      needs: ["students"],
      gradeFit: true,
      studentCount: 90,
      internetReady: true,
      commercialIntent: true,
      pricingIntent: false,
      meetingIntent: false,
      contactConsent: false,
      contactRevoked: false,
    });

    expect(state.qualification).toMatchObject({
      gradeFit: true,
      studentCount: 90,
      internetReady: true,
      pricingIntent: true,
    });
    expect(state.nextQuestion?.key).toBe("timeline");
  });

  it("recognizes a bare name after asking for it and continues naturally", () => {
    const conversation = messages([
      { role: "user", text: "Oi" },
      { role: "assistant", text: "Oi! Tudo bem? Eu sou a Ana. Qual é o seu nome?" },
      { role: "user", text: "Leonardo Camacho" },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(state.qualification.name).toBe("Leonardo Camacho");
    expect(state.answeredNameThisTurn).toBe(true);
    expect(state.leadStage).toBe("engaged");
    expect(state.shouldPersistLead).toBe(true);
    expect(immediateAnaReply(state, conversation)).toBe("Prazer, Leonardo. Como posso te ajudar?");
  });

  it("answers a concrete school question before asking only for the name", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Vocês têm uma solução para escolas?" },
    ]));
    expect(state.shouldRetrieveKnowledge).toBe(true);
    expect(state.nextQuestion).toEqual({ key: "name", text: "Qual é o seu nome?" });
    expect(state.shouldExpandLeia).toBe(true);
  });

  it("does not qualify an incomplete need or advance to contact", () => {
    const conversation = messages([
      { role: "user", text: "Meu nome é Leonardo. Sou dono de uma escola com turmas do 9º ano." },
      { role: "assistant", text: "Quantos estudantes vocês imaginam atender?" },
      { role: "user", text: "uns 90" },
      { role: "assistant", text: "A escola tem internet estável?" },
      { role: "user", text: "Temos sim" },
      { role: "assistant", text: "Qual é a principal necessidade da escola com IA hoje?" },
      { role: "user", text: "Eu preciso" },
    ]);
    const state = analyzeAnaConversation(conversation);
    expect(state.incompleteUserThought).toBe(true);
    expect(state.qualification.need).toBeUndefined();
    expect(state.leadStage).not.toBe("qualified");
    expect(state.nextQuestion).toEqual({ key: "need", text: "Pode me contar melhor o que você precisa?" });
    expect(immediateAnaReply(state, conversation)).toBe("Claro, Leonardo. Pode me contar melhor o que você precisa?");
  });

  it("separates contact consent from the contact channel", () => {
    const beforeConsent = messages([
      { role: "user", text: "Meu nome é Leonardo. Sou dono de uma escola do 9º ano, com 90 alunos e internet estável. Quero ensinar IA aos estudantes este ano." },
    ]);
    const qualified = analyzeAnaConversation(beforeConsent);
    expect(qualified.nextQuestion?.key).toBe("contactConsent");

    const afterConsent = messages([
      ...beforeConsent.map((message) => ({ role: message.role as "user" | "assistant", text: message.parts[0].type === "text" ? message.parts[0].text : "" })),
      { role: "assistant", text: "Quer que eu peça para alguém do nosso time entrar em contato com você?" },
      { role: "user", text: "Sim" },
    ]);
    const consented = analyzeAnaConversation(afterConsent);
    expect(consented.qualification.contactConsent).toBe(true);
    expect(consented.nextQuestion).toEqual({ key: "contact", text: "Qual é o melhor e-mail ou WhatsApp para falar com você?" });
  });

  it("expands L.E.I.A. only until Ana has explained the acronym", () => {
    const first = analyzeAnaConversation(messages([{ role: "user", text: "O que é o L.E.I.A.?" }]));
    expect(first.shouldExpandLeia).toBe(true);

    const later = analyzeAnaConversation(messages([
      { role: "user", text: "O que é o L.E.I.A.?" },
      { role: "assistant", text: "O L.E.I.A. — Laboratório Escolar de Inteligência Artificial — é um programa anual." },
      { role: "user", text: "Entendi" },
    ]));
    expect(later.shouldExpandLeia).toBe(false);
  });
});
