export type CompareScenario = {
  name: string;
  userTurns: string[];
  // The pattern must NOT appear in any reply from this 0-based index onward (the user message that
  // provides or refuses the information is the one this reply answers).
  forbidAfter?: Array<{ afterReply: number; pattern: RegExp; reason: string }>;
  // Pattern that must appear in the reply at that index.
  requireIn?: Array<{ reply: number; pattern: RegExp; reason: string }>;
  maxWordsIn?: Array<{ reply: number; words: number }>;
  noQuestionIn?: number[];
};

const ASKS_NAME = /\b(?:qual|como).{0,25}\b(?:seu nome|se chama)\b|\bseu nome\b/i;

export const COMPARE_SCENARIOS: CompareScenario[] = [
  {
    name: "captura-oi-oi-leo",
    userTurns: ["oi\noi", "Leo"],
    forbidAfter: [{ afterReply: 1, pattern: ASKS_NAME, reason: "pediu o nome depois de recebê-lo" }],
    requireIn: [{ reply: 1, pattern: /Leo/i, reason: "não usou o nome informado" }],
  },
  {
    name: "saudacao-simples",
    userTurns: ["oi"],
    requireIn: [{ reply: 0, pattern: /\bAna\b/, reason: "não se apresentou" }],
  },
  {
    name: "nome-recusado",
    userTurns: ["oi", "prefiro não dizer", "o que é o L.E.I.A.?"],
    forbidAfter: [{ afterReply: 1, pattern: ASKS_NAME, reason: "insistiu no nome depois da recusa" }],
  },
  {
    name: "pergunta-direta-leia",
    userTurns: ["O que é o L.E.I.A. e para quem ele foi criado?"],
    requireIn: [{ reply: 0, pattern: /estudantes|alunos/i, reason: "não explicou o público" }],
  },
  {
    name: "preco-sem-valor-publico",
    userTurns: ["quanto custa a consultoria de vocês?"],
  },
  {
    name: "escola-nao-sei-quantos",
    userTurns: ["Sou coordenadora de uma escola e quero levar IA para os alunos", "ainda não sei quantos alunos"],
    forbidAfter: [{ afterReply: 1, pattern: /quantos (?:alunos|estudantes)/i, reason: "insistiu na quantidade depois de 'não sei'" }],
  },
  {
    name: "empresa-querendo-reuniao",
    userTurns: ["Tenho uma empresa de logística e quero automatizar processos", "quero marcar uma reunião"],
    forbidAfter: [{ afterReply: 1, pattern: /\b(?:reuni[aã]o|visita)\b.{0,20}\b(?:marcada|agendada|confirmada)\b/i, reason: "afirmou agendamento" }],
  },
  {
    name: "reparo-resposta-estranha",
    userTurns: ["oi", "Marina", "isso não fez sentido nenhum"],
    forbidAfter: [{ afterReply: 1, pattern: ASKS_NAME, reason: "voltou a pedir o nome" }],
  },
  {
    name: "agradecimento-encerra",
    userTurns: ["O que é a Amplify Academy?", "valeu, era só isso"],
    maxWordsIn: [{ reply: 1, words: 40 }],
    noQuestionIn: [1],
  },
  {
    name: "duas-frentes",
    userTurns: ["Quero IA para meus alunos e também para melhorar a operação da escola"],
  },
];
