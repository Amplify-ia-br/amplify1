import type { AnaReferenceScenario } from "./reference-suite.js";
import type { AnaMessage } from "./types.js";

export const progressMessages = (...turns: string[]): AnaMessage[] => turns.map((text, i) => ({
  id: `progress-${i}`, role: i % 2 ? "assistant" : "user", parts: [{ type: "text", text }],
}));

// User-supplied transcripts, including typos. The final assistant failure is
// intentionally excluded: each fixture observes the decision that caused it.
export const schoolIntro = ["BOm dia.", "Bom dia! Eu sou a Ana. Qual é o seu nome?", "Leonardo", "Prazer, Leonardo. Como posso te ajudar?", "Eu tenho uma escola e queria saber como a Amplify pode me ajudar"];
export const schoolOffer1 = "Claro. Para uma escola, a Amplify pode ajudar de forma bem concreta em duas frentes: • L.E.I.A. — Laboratório Escolar de Inteligência Artificial: um programa anual para estudantes do 9º ano do Ensino Fundamental à 3ª série do Ensino Médio. Ele trabalha uso responsável de IA, verificação do que a IA produz e autoria, com mediação de professor em todos os encontros. • Implantação e apoio para colocar isso em prática: formação inicial dos professores da escola, definição do calendário, mapeamento pedagógico e organização da infraestrutura conforme o plano escolhido. A escola pode usar sua própria estrutura ou contratar planos em que a Amplify organiza o acesso à IA e, em alguns casos, disponibiliza equipamentos. Se você quiser, posso te explicar primeiro como funciona o L.E.I.A. na escola.";
export const schoolOffer2 = "A Amplify pode ajudar sua escola principalmente com o L.E.I.A. — Laboratório Escolar de Inteligência Artificial, um programa anual para alunos do 9º ano do Ensino Fundamental à 3ª série do Ensino Médio. Ele ensina os estudantes a usar IA com critério, verificar o que ela produz e assumir responsabilidade pelo que criam, sempre com mediação de um professor. A escola pode usar o L.E.I.A. no contraturno ou integrá-lo ao currículo, como eletiva ou itinerário formativo. O programa inclui formação docente, atividades práticas, acompanhamento da aprendizagem e pode funcionar com a infraestrutura da própria escola ou com planos em que a Amplify organiza o acesso à IA e disponibiliza equipamentos durante as aulas. Se quiser, eu também posso te explicar como funciona na prática ao longo do ano.";
export const consultingTranscript = [
  "Quais são os diferenciais da Amplify?",
  "A Amplify se diferencia por fechar a distância entre ter acesso à IA e conseguir usar bem no trabalho real. Em vez de ficar só em teste ou treinamento genérico, o trabalho pode envolver: • ajudar a escolher os problemas certos • preparar pessoas • organizar processos • colocar soluções em operação • deixar algo funcionando depois do projeto, como equipe preparada, processo melhor, regra de governança ou solução implantada. Ela atua com educação, consultoria e desenvolvimento de produtos em IA, para profissionais, equipes, empresas, governo e escolas. Qual é o seu nome?",
  "Leonardo", "Prazer, Leonardo. Como posso te ajudar?",
  "Quero um diagnóstico sobre como a IA pode ajudar meu negócios.",
  "Dá para ajudar, sim. O diagnóstico entra na frente de Consultoria e serve para entender o negócio, as rotinas atuais, as pessoas envolvidas, os dados disponíveis, as restrições e os riscos antes de falar de ferramenta. Nesse tipo de trabalho, a Amplify pode olhar: • oportunidades de uso de IA • viabilidade • processos e dados • segurança, privacidade e governança • roadmap e indicadores • desenho do modelo operacional. Se quiser, posso seguir a partir daí e te explicar como funciona esse diagnóstico na prática.",
  "Quero sim",
  "Perfeito. O próximo passo é entender qual frente do negócio você quer priorizar no diagnóstico: operação, vendas, atendimento, marketing ou outra?",
  "Eu nao tenho essa visoa clara ainda.",
  "Sem problema. Se a visão ainda não está clara, dá para começar pelo que hoje mais consome tempo, gera retrabalho ou trava resultado. Qual área da operação mais está te incomodando hoje?",
  "A Operação mesmo.",
  "Entendo, Leonardo. Focar na operação costuma trazer ganhos imediatos de eficiência. Para eu compreender melhor seus desafios, você poderia me contar quais atividades operacionais hoje demandam mais tempo da sua equipe ou geram mais gargalos?",
  "Atendimento ao clientes, resolução de chamados e cobrança.",
  "Entendi, isso já aponta três frentes operacionais bem claras: atendimento ao cliente, resolução de chamados e cobrança. Qual delas hoje pesa mais para a sua equipe?",
  "As três mesmo",
  "Perfeito, então as três entram no diagnóstico. Hoje, qual delas você quer atacar primeiro?",
  "As três juntas",
  "Entendi, as três podem entrar no mesmo diagnóstico. Para eu organizar o foco inicial, o que hoje mais trava resultado entre atendimento, chamados e cobrança?",
  "As tres juntas",
];
export const carlitosTranscript = [
  "Oi Bom dia! Meu nome é Carlitos e eu sou dono de um escritório de advocacia. Gostaria de fazer um orçamento para implementação de IA no meu processo de atendimento ao cliente.",
  "Bom dia, Carlitos. Para implementação de IA no atendimento ao cliente, a Amplify trabalha pela frente de Consultoria, começando pelo problema e pelo contexto antes de escolher a tecnologia. O processo normalmente passa por entender a rotina atual, desenhar o fluxo, preparar as pessoas, implementar no processo real e acompanhar os resultados. Como você pediu um orçamento, ele depende do escopo e das condições da solução. Se você quiser, eu posso seguir com a qualificação mínima para esse orçamento. Qual é o principal objetivo da IA no seu atendimento: reduzir tempo de resposta, organizar triagem, apoiar a equipe com informações ou automatizar alguma parte do fluxo?",
  "Eu quero reduzir custos e amentar a qualidade do atendimento.",
  "Entendi. Qual é o seu nome?", "Carlitos (já falei)",
  "Perfeito, Carlitos. Para eu te orientar melhor, você quer focar primeiro em reduzir custos ou em melhorar a qualidade do atendimento?",
  "ambos",
];

function replay(name: string, turns: string[], expected: AnaReferenceScenario["expected"], expectedQualification?: AnaReferenceScenario["expectedQualification"], response?: AnaReferenceScenario["response"]): AnaReferenceScenario {
  return { name, category: "commercial", turns: turns.map((text, i) => ({ role: i % 2 ? "assistant" : "user", text })), expected, expectedQualification, response };
}

export const ANA_PROGRESS_REPLAYS: AnaReferenceScenario[] = [
  replay("real: escola explica então", [...schoolIntro, schoolOffer1, "Legal! Me explique entao"], { answerRequired: true, shouldAskQuestion: false }, { contactConsent: false }, { containsAny: ["L.E.I.A.", "programa"], maxQuestions: 0 }),
  replay("real: escola ok quero sim", [...schoolIntro, schoolOffer2, "ok quero sim,"], { answerRequired: true, shouldAskQuestion: false }, { contactConsent: false }, { containsAny: ["L.E.I.A.", "programa"], maxQuestions: 0 }),
  replay("real: aceite diagnóstico", consultingTranscript.slice(0, 7), { answerRequired: true, shouldAskQuestion: false }, { contactConsent: false }, { containsAll: ["diagnóstico"], maxQuestions: 0 }),
  replay("real: prioridade desconhecida", consultingTranscript.slice(0, 9), { nextQuestionKey: "organization" }, { name: "Leonardo", contactConsent: false }),
  replay("real: processos espontâneos", consultingTranscript.slice(0, 13), { nextQuestionKey: "organization" }, { businessChallenge: "Atendimento ao clientes, resolução de chamados e cobrança." }),
  ...[15, 17, 19].map(length => replay(`real: três juntas turno ${length}`, consultingTranscript.slice(0, length), { nextQuestionKey: "organization" }, { qualificationFocus: "consulting", businessChallenge: "Atendimento ao clientes, resolução de chamados e cobrança.", contactConsent: false })),
  replay("real: Carlitos apresentado", carlitosTranscript.slice(0, 3), { nextQuestionKey: "organization" }, { name: "Carlitos", contactConsent: false }),
  replay("real: Carlitos ambos", carlitosTranscript, { nextQuestionKey: "organization" }, { name: "Carlitos", qualificationFocus: "consulting", contactConsent: false }),
];
