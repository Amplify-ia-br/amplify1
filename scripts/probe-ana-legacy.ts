import { analyzeAnaConversation, immediateAnaReply } from "../src/lib/ana/conversation.js";
import type { AnaMessage } from "../src/lib/ana/types.js";

function thread(...turns: string[]): AnaMessage[] {
  return turns.map((text, i) => ({
    id: `p-${i}`,
    role: i % 2 === 0 ? "user" : "assistant",
    parts: [{ type: "text", text }],
  })) as AnaMessage[];
}

function probe(label: string, ...turns: string[]) {
  const messages = thread(...turns);
  const state = analyzeAnaConversation(messages, "/");
  const canned = immediateAnaReply(state, messages);
  console.log(`\n## ${label}`);
  console.log(`último usuário : ${turns.at(-1)}`);
  console.log(`turnKind       : ${state.turnKind}`);
  console.log(`nome extraído  : ${state.qualification.name ?? "-"}`);
  console.log(`nextQuestion   : ${state.nextQuestion?.key ?? "-"} ${state.nextQuestion ? `"${state.nextQuestion.text}"` : ""}`);
  console.log(`resposta pronta: ${canned ?? "(vai para o modelo)"}`);
  console.log(`offerInterests : ${(state.qualification.offerInterests ?? []).join(",") || "-"}`);
  console.log(`retrieval      : ${state.shouldRetrieveKnowledge}`);
}

// 1. Nome capturado de forma errada
probe("Cargo vira nome", "Oi", "Oi! Eu sou a Ana. Qual é o seu nome?", "Sou professor de matemática");
probe("Origem vira nome", "Oi", "Oi! Eu sou a Ana. Qual é o seu nome?", "Sou de São Paulo");
probe("Profissão vira nome", "Oi", "Oi! Eu sou a Ana. Qual é o seu nome?", "Sou consultora financeira");

// 2. Respostas enlatadas que ignoram o conteúdo
probe("Relato rico vira 'Entendi.'", "Oi", "Oi! Eu sou a Ana. Qual é o seu nome?", "Marina", "Prazer, Marina. Como posso te ajudar?", "Tenho uma escola particular com 400 alunos e os professores estão com medo de IA");
probe("'sim' sem pergunta", "Oi", "Oi! Eu sou a Ana. Qual é o seu nome?", "Marina", "Prazer, Marina. Como posso te ajudar?", "Minha escola quer usar IA", "Que bom! Qual é a principal necessidade da escola com IA hoje?", "sim");

// 3. Palavra solta muda a trilha comercial
probe("Menção a escola força trilha L.E.I.A.", "Oi", "Oi! Eu sou a Ana. Qual é o seu nome?", "Ricardo", "Prazer, Ricardo. Como posso te ajudar?", "Sou diretor financeiro de uma empresa e meu filho estuda numa escola, quero consultoria para automatizar cobrança");

// 4. Entrevista fixa: sequência de perguntas para quem pede proposta
let turns: string[] = ["Oi", "Oi! Eu sou a Ana. Qual é o seu nome?", "Paula", "Prazer, Paula. Como posso te ajudar?", "Somos uma clínica e queremos automatizar atendimento. Quero uma proposta"];
const sequence: string[] = [];
for (let i = 0; i < 14; i += 1) {
  const messages = thread(...turns);
  const state = analyzeAnaConversation(messages, "/");
  const key = state.nextQuestion?.key;
  if (!key) { sequence.push("(fim)"); break; }
  sequence.push(key);
  turns = [...turns, state.nextQuestion!.text, "Ainda não sei dizer com precisão"];
}
console.log(`\n## Sequência de perguntas até o contato (pedido de proposta, respostas vagas)\n${sequence.join(" -> ")}\ntotal de perguntas antes do contato: ${sequence.filter(k => !["contactConsent", "contact", "(fim)"].includes(k)).length}`);
