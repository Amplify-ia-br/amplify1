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
    const { nextQuestionKey, ...expectedState } = scenario.expected;
    expect(state).toMatchObject(expectedState);
    if (nextQuestionKey !== undefined) expect(state.nextQuestion?.key).toBe(nextQuestionKey);
  });

  it("answers a greeting briefly without pitching the company", () => {
    const conversation = messages([{ role: "user", text: "Olá" }]);
    const reply = immediateAnaReply(analyzeAnaConversation(conversation), conversation);
    expect(reply).toBe("Oi! Tudo bem? Eu sou a Ana. Qual é o seu nome?");
    expect(reply).not.toContain("Amplify ajuda");
  });

  it("reciprocates a combined greeting instead of treating it as lead context", () => {
    const conversation = messages([{ role: "user", text: "Oi bom dia" }]);
    const state = analyzeAnaConversation(conversation);
    const reply = immediateAnaReply(state, conversation);

    expect(state.turnKind).toBe("greeting");
    expect(state.shouldRetrieveKnowledge).toBe(false);
    expect(reply).toBe("Bom dia! Tudo bem? Eu sou a Ana. Qual é o seu nome?");
    expect(reply).not.toContain("Entendi");
  });

  it("repairs a playful correction without defending itself or pitching the company", () => {
    const conversation = messages([
      { role: "user", text: "Oi bom dia" },
      { role: "assistant", text: "Entendi. Qual é o seu nome?" },
      { role: "user", text: "Entendeu o quê? kkkkk\nSou Leonardo" },
    ]);
    const state = analyzeAnaConversation(conversation);
    const reply = immediateAnaReply(state, conversation);

    expect(state.turnKind).toBe("repair");
    expect(state.qualification.name).toBe("Leonardo");
    expect(state.shouldRetrieveKnowledge).toBe(false);
    expect(state.nextQuestion).toBeUndefined();
    expect(reply).toBe("Hahaha, justo. Bom dia, Leonardo! Prazer. Como posso te ajudar?");
    expect(reply).not.toContain("Amplify ajuda");
    expect(reply).not.toContain("me apresentei");
  });

  it("recognizes a frustrated exit and closes without reopening discovery", () => {
    const conversation = messages([
      { role: "user", text: "Oi" },
      { role: "assistant", text: "Oi! Tudo bem? Eu sou a Ana. Qual é o seu nome?" },
      { role: "user", text: "Sou Leonardo" },
      { role: "assistant", text: "Prazer, Leonardo. Como posso te ajudar?" },
      { role: "user", text: "Bah desisto." },
    ]);
    const state = analyzeAnaConversation(conversation);
    const reply = immediateAnaReply(state, conversation);

    expect(state.turnKind).toBe("farewell");
    expect(state.stage).toBe("closing");
    expect(state.shouldRetrieveKnowledge).toBe(false);
    expect(state.nextQuestion).toBeUndefined();
    expect(reply).toContain("Desculpe");
    expect(reply?.match(/\?/g) ?? []).toHaveLength(0);
  });

  it("fulfills an accepted explanation offer before resuming qualification", () => {
    const conversation = messages([
      { role: "user", text: "Sou dono de uma escola e queria saber o que a Amplify tem pra mim." },
      {
        role: "assistant",
        text: "Para uma escola, a Amplify tem o L.E.I.A. Se você quiser, eu posso te explicar como ele funciona na prática na escola.",
      },
      { role: "user", text: "Legal, quero sim" },
    ]);

    const state = analyzeAnaConversation(conversation);

    expect(state.acceptedAssistantOffer).toContain("explicar como ele funciona na pratica");
    expect(state.answerRequired).toBe(true);
    expect(state.shouldRetrieveKnowledge).toBe(true);
    expect(state.nextQuestion).toBeUndefined();
    expect(immediateAnaReply(state, conversation)).toBeUndefined();
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
      { role: "user", text: "Sou diretor de uma escola. Quero ensinar IA aos estudantes este ano. Atendemos do 9º ano ao Ensino Médio, com 200 alunos e internet estável." },
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
      { role: "user", text: "Sou diretor e quero falar com vendas sobre o L.E.I.A. para ensinar IA a 90 alunos do Ensino Médio, com internet estável, ainda este ano." },
      { role: "assistant", text: "Posso registrar seu nome e seu melhor e-mail ou WhatsApp para o time continuar essa conversa?" },
      { role: "user", text: "Pode sim, meu nome é Rafael e meu e-mail é contato@escola.com.br." },
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
    expect(state.leadStage).toBe("qualifying");
  });

  it("does not confuse a preferred name with permission for commercial contact", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Pode me chamar de Leonardo." },
    ]));
    expect(state.qualification.name).toBe("Leonardo");
    expect(state.qualification.contactConsent).toBe(false);
    expect(state.qualification.contactRevoked).toBe(false);
  });

  it("keeps a contact refusal active until a later explicit consent", () => {
    const refused = analyzeAnaConversation(messages([
      { role: "user", text: "Quero uma proposta para a escola." },
      { role: "assistant", text: "Quer que alguém do time entre em contato com você?" },
      { role: "user", text: "Não, prefiro não receber contato." },
      { role: "assistant", text: "Tudo bem." },
      { role: "user", text: "Obrigado." },
    ]));
    expect(refused.qualification.contactConsent).toBe(false);
    expect(refused.qualification.contactRevoked).toBe(true);

    const consented = analyzeAnaConversation(messages([
      { role: "user", text: "Quero uma proposta para a escola." },
      { role: "assistant", text: "Quer que alguém do time entre em contato com você?" },
      { role: "user", text: "Não, prefiro não receber contato." },
      { role: "assistant", text: "Tudo bem." },
      { role: "user", text: "Pensando melhor, autorizo o contato." },
    ]));
    expect(consented.qualification.contactConsent).toBe(true);
    expect(consented.qualification.contactRevoked).toBe(false);
  });

  it.each([
    "Não quero que entrem em contato comigo.",
    "Pare de me contatar.",
    "Não me mandem e-mail.",
    "Prefiro que não entrem em contato comigo.",
    "Não quero mais contato.",
    "Retiro minha autorização de contato.",
    "Não mandem mais mensagens.",
  ])("understands natural contact revocation: %s", (refusal) => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Autorizo o contato." },
      { role: "assistant", text: "Tudo bem." },
      { role: "user", text: refusal },
    ]));
    expect(state.qualification.contactConsent).toBe(false);
    expect(state.qualification.contactRevoked).toBe(true);
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
    expect(state.answerRequired).toBe(true);
    expect(state.nextQuestion).toBeUndefined();
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
    expect(state.answerRequired).toBe(true);
    expect(state.nextQuestion).toBeUndefined();
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
      { role: "user", text: "Meu nome é Leonardo. Sou dono de uma escola do 9º ano, com 90 alunos e internet estável. Quero contratar o programa para ensinar IA aos estudantes este ano." },
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

  it("answers a multi-need school request before asking for contact or timing", () => {
    const conversation = messages([
      { role: "user", text: "Oi" },
      { role: "assistant", text: "Oi! Tudo bem? Eu sou a Ana. Qual é o seu nome?" },
      { role: "user", text: "Meu nome é Leo." },
      { role: "assistant", text: "Prazer, Leo. Como posso te ajudar?" },
      { role: "user", text: "Eu queria ver como vcs podem ajudar minha escola." },
      { role: "assistant", text: "Sua escola atende do 9º ano ao Ensino Médio?" },
      { role: "user", text: "Sim" },
      { role: "assistant", text: "Quantos estudantes vocês imaginam atender?" },
      { role: "user", text: "90" },
      { role: "assistant", text: "A escola tem conexão estável à internet?" },
      { role: "user", text: "Tem sim" },
      { role: "assistant", text: "Qual é a principal necessidade da escola com IA hoje?" },
      { role: "user", text: "São duas frentes: ensinar IA para meus alunos e melhorar meu negócio com soluções de IA implementadas." },
    ]);

    const state = analyzeAnaConversation(conversation);
    expect(state.answerRequired).toBe(true);
    expect(state.shouldRetrieveKnowledge).toBe(true);
    expect(state.qualification.needs).toEqual(expect.arrayContaining(["students", "processes", "product"]));
    expect(state.nextQuestion).toBeUndefined();
    expect(immediateAnaReply(state, conversation)).toBeUndefined();
  });

  it("treats refusal plus a repeated information request as an answer-first correction", () => {
    const conversation = messages([
      { role: "user", text: "Quero ensinar IA aos alunos e melhorar a operação da escola." },
      { role: "assistant", text: "Quer que eu peça para alguém do nosso time entrar em contato com você?" },
      { role: "user", text: "Não. Quero saber como vocês podem me ajudar." },
    ]);

    const state = analyzeAnaConversation(conversation);
    expect(state.turnKind).toBe("request");
    expect(state.answerRequired).toBe(true);
    expect(state.shouldRetrieveKnowledge).toBe(true);
    expect(state.qualification.contactRevoked).toBe(true);
    expect(state.nextQuestion).toBeUndefined();
    expect(immediateAnaReply(state, conversation)).toBeUndefined();
  });

  it("asks which business front is the priority before offering contact", () => {
    const conversation = messages([
      { role: "user", text: "oi" },
      { role: "assistant", text: "Oi! Tudo bem? Eu sou a Ana. Qual é o seu nome?" },
      { role: "user", text: "Sou o Leo. Sou dono de uma escola." },
      { role: "assistant", text: "Prazer, Leo. Qual é a principal necessidade da escola com IA hoje?" },
      { role: "user", text: "Quero ensinar IA para meus alunos." },
      { role: "assistant", text: "O L.E.I.A. pode ajudar nessa frente. Se quiser, eu posso explicar como ele funciona." },
      { role: "user", text: "Legal, quero sim" },
      { role: "assistant", text: "O L.E.I.A. é um programa anual para estudantes. Se quiser, eu posso explicar como a escola começa." },
      { role: "user", text: "Além do L.E.I.A., o que mais vcs poderiam oferecer pra mim?" },
      { role: "assistant", text: "Também podemos apoiar a gestão da escola com consultoria e capacitação. Alguma dessas áreas parece ser o que você busca?" },
      { role: "user", text: "Legal! Gostei viu" },
      { role: "assistant", text: "Que bom, Leo. Fico feliz." },
      { role: "user", text: "Qual seria o próximo passo?" },
    ]);

    const state = analyzeAnaConversation(conversation);
    expect(state.qualification.advancementIntent).toBe(true);
    expect(state.qualification.multiOfferInterest).toBe(true);
    expect(state.stage).toBe("qualification");
    expect(state.leadStage).toBe("qualifying");
    expect(state.nextQuestion).toEqual({
      key: "priority",
      text: "Como você está olhando tanto para os alunos quanto para a gestão da escola, qual dessas duas frentes é mais urgente agora: implementar o L.E.I.A. ou aplicar IA na operação da escola?",
    });
    expect(state.nextQuestion?.key).not.toBe("contactConsent");
  });

  it("continues the selected consulting qualification before requesting contact", () => {
    const conversation = messages([
      { role: "user", text: "Sou o Leo, dono de uma escola. Quero ensinar IA aos alunos e melhorar a operação." },
      { role: "assistant", text: "Qual dessas duas frentes é mais urgente agora: implementar o L.E.I.A. ou aplicar IA na operação da escola?" },
      { role: "user", text: "A operação da escola." },
    ]);

    const state = analyzeAnaConversation(conversation, "/lab/ana", {
      advancementIntent: true,
      commercialIntent: true,
    });
    expect(state.qualification.qualificationFocus).toBe("consulting");
    expect(state.nextQuestion).toEqual({
      key: "businessChallenge",
      text: "Na gestão da escola, qual problema ou processo você mais gostaria de melhorar com IA?",
    });
  });

  it("only requests contact consent after consulting qualification is complete", () => {
    const conversation = messages([
      { role: "user", text: "Sou a Marina, diretora de uma escola. Quero avançar com uma consultoria para melhorar a operação." },
      { role: "assistant", text: "Na gestão da escola, qual problema ou processo você mais gostaria de melhorar com IA?" },
      { role: "user", text: "Quero reduzir o retrabalho da equipe administrativa." },
      { role: "assistant", text: "Quando vocês gostariam de começar?" },
      { role: "user", text: "No próximo semestre." },
    ]);

    const state = analyzeAnaConversation(conversation, "/lab/ana", {
      qualificationFocus: "consulting",
      advancementIntent: true,
      commercialIntent: true,
    });
    expect(state.qualification.businessChallenge).toBe("Quero reduzir o retrabalho da equipe administrativa.");
    expect(state.leadStage).toBe("qualified");
    expect(state.nextQuestion?.key).toBe("contactConsent");
  });

  it("does not hand off a lead who supplied contact before qualification", () => {
    const conversation = messages([
      { role: "user", text: "Quero marcar uma reunião. Podem me chamar no WhatsApp 11 99999-0000." },
    ]);

    const state = analyzeAnaConversation(conversation);
    expect(state.qualification.contactConsent).toBe(true);
    expect(state.qualification.phone).toBeDefined();
    expect(state.leadStage).toBe("qualifying");
    expect(state.stage).toBe("qualification");
    expect(state.nextQuestion?.key).toBe("name");
  });

  it("does not qualify a L.E.I.A. lead without stable internet", () => {
    const state = analyzeAnaConversation(messages([
      { role: "user", text: "Sou diretor de uma escola de Ensino Médio com 120 alunos. Quero contratar o L.E.I.A. este ano, mas ainda estamos sem internet estável." },
    ]));

    expect(state.qualification.internetReady).toBe(false);
    expect(state.leadStage).toBe("qualifying");
    expect(state.nextQuestion?.key).not.toBe("contactConsent");
  });
});
