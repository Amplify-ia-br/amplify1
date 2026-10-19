import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ generateText: vi.fn() }));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: mocks.generateText,
  gateway: vi.fn((model: string) => ({ model })),
}));

import { runAnaZeroTurn } from "./agent";
import { analyzeTranscript } from "./compare";
import { ANA_ZERO_SAFE_REPLY, ANA_ZERO_TECHNICAL_REPLY, redactAnaZeroAnswer, validateAnaZeroAnswer } from "./guardrails";
import { buildAnaZeroSystem, hasIntroducedLeia, PROMPT_VERSION } from "./prompt";
import { COMPARE_SCENARIOS } from "./scenarios";
import { anaZeroRequestSchema } from "./schema";
import { createTestKnowledgeService } from "@/lib/okf/test-fixtures";
import { createAnaZeroToolState, createAnaZeroTools, forgivingSearch, quoteIsFromUser, sanitizeMemory } from "./tools";

const reader = {
  listDocuments: vi.fn(async () => []),
  getDocument: vi.fn(async () => undefined),
} as never;

const result = (text: string) => ({ text, usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }, finalStep: { response: { modelId: "m" } } });
const history = [{ role: "user" as const, text: "oi" }];

describe("guardrails factuais", () => {
  it("aceita resposta natural", () => {
    expect(validateAnaZeroAnswer("Oi! Eu sou a Ana. Como posso ajudar?", []).valid).toBe(true);
  });
  it("bloqueia preço sem base e aceita preço presente na evidência", () => {
    expect(validateAnaZeroAnswer("Custa R$ 500 por mês.", []).issues).toContain("ungrounded_price");
    expect(validateAnaZeroAnswer("Custa R$ 500 por mês.", ['{"text":"plano de R$ 500"}']).valid).toBe(true);
  });
  it("bloqueia promessa de ação, markdown e termos internos", () => {
    expect(validateAnaZeroAnswer("Agendei a reunião para você.", []).issues).toContain("promise_of_action");
    expect(validateAnaZeroAnswer("Nosso time vai entrar em contato.", []).issues).toContain("promise_of_action");
    expect(validateAnaZeroAnswer("# Título", []).issues).toContain("markdown");
    expect(validateAnaZeroAnswer("Consultei o MCP.", []).issues).toContain("internal_term");
  });
  it("redige apenas frases problemáticas", () => {
    expect(redactAnaZeroAnswer("Posso explicar o programa. Agendei sua reunião.", [])).toBe("Posso explicar o programa.");
  });
});

describe("ferramentas e memória com evidência", () => {
  it("aceita citação literal do usuário e rejeita invenção", () => {
    expect(quoteIsFromUser("sou o Leo", ["Oi, sou o Leo"])).toBe(true);
    expect(quoteIsFromUser("sou a Marina", ["Oi, sou o Leo"])).toBe(false);
    expect(quoteIsFromUser("sim", ["Isso é simples"])).toBe(false);
  });
  it("descarta memória do cliente sem evidência no histórico", () => {
    const kept = sanitizeMemory(
      [{ key: "name", value: "Leo", evidence: "Leo" }, { key: "role", value: "CEO", evidence: "sou CEO" }],
      ["Leo"],
    );
    expect(kept).toEqual([{ key: "name", value: "Leo", evidence: "Leo" }]);
  });
  it("remember e request_handoff validam evidência", async () => {
    const state = createAnaZeroToolState([]);
    const tools = createAnaZeroTools(reader, state, ["quero uma proposta, pode me chamar em leo@exemplo.com"]);
    const run = <T,>(t: { execute?: (...args: never[]) => unknown }, input: unknown) => (t.execute as (i: unknown, o: unknown) => Promise<T>)(input, {});
    expect(await run(tools.remember, { key: "name", value: "Marina", evidence: "sou a Marina" })).toEqual({ ok: false, error: "evidence_not_found_in_user_messages" });
    expect(await run(tools.request_handoff, { summary: "s", consentQuote: "pode me chamar", contact: "outro@x.com" })).toMatchObject({ ok: false });
    expect(await run(tools.request_handoff, { summary: "s", consentQuote: "pode me chamar", contact: "leo@exemplo.com" })).toMatchObject({ ok: true });
    expect(state.handoff?.contact).toBe("leo@exemplo.com");
  });
});

describe("busca tolerante", () => {
  const service = createTestKnowledgeService();
  const longQuery = "Amplify escola alunos inteligência artificial formação";

  it("a busca literal volta vazia para uma consulta em frase longa", async () => {
    expect(await service.searchKnowledge(longQuery)).toEqual([]);
  });
  it("recupera documentos relevantes termo a termo, do mais ao menos aderente", async () => {
    const results = await forgivingSearch(service, longQuery);
    expect(results.map((item) => item.id)).toEqual(["amplify-academy", "company"]);
  });
  it("mantém o resultado exato quando a consulta simples já casa", async () => {
    expect((await forgivingSearch(service, "academy")).map((item) => item.id)).toEqual(["amplify-academy"]);
  });
  it("lista os documentos publicados quando nenhum termo casa, sem expor conteúdo não público", async () => {
    const ids = (await forgivingSearch(service, "xyzzy plugh")).map((item) => item.id);
    expect([...ids].sort()).toEqual(["amplify-academy", "company"]);
  });
});

describe("turno do agente", () => {
  beforeEach(() => {
    mocks.generateText.mockReset();
  });

  it("passa a conversa completa e a memória ao modelo", async () => {
    mocks.generateText.mockResolvedValueOnce(result("Prazer, Leo. Como posso ajudar?"));
    const turn = await runAnaZeroTurn({
      model: "openai/gpt-5.4-mini-fast", reader,
      memory: [{ key: "name", value: "Leo", evidence: "Leo" }],
      history: [{ role: "user", text: "oi" }, { role: "assistant", text: "Oi! Qual é o seu nome?" }, { role: "user", text: "Leo" }],
    });
    const call = mocks.generateText.mock.calls[0][0];
    expect(call.messages).toHaveLength(3);
    expect(call.system).toContain("name: Leo");
    expect(turn.regenerated).toBe(false);
    expect(turn.text).toBe("Prazer, Leo. Como posso ajudar?");
  });

  it("regenera uma vez quando a resposta viola um limite factual", async () => {
    mocks.generateText
      .mockResolvedValueOnce(result("Agendei a reunião."))
      .mockResolvedValueOnce(result("Posso registrar seu pedido. Qual canal prefere?"));
    const turn = await runAnaZeroTurn({ model: "openai/gpt-5.4-mini-fast", reader, memory: [], history });
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
    expect(turn.regenerated).toBe(true);
    expect(turn.text).toContain("registrar seu pedido");
  });

  it("não usa resposta fixa quando só parte da segunda tentativa é aproveitável", async () => {
    mocks.generateText
      .mockResolvedValueOnce(result("Agendei a reunião."))
      .mockResolvedValueOnce(result("Posso explicar o programa. Agendei sua reunião."));
    const turn = await runAnaZeroTurn({ model: "openai/gpt-5.4-mini-fast", reader, memory: [], history });
    expect(turn.text).toBe("Posso explicar o programa.");
  });

  it("assume falha técnica e expõe o erro quando o modelo lança erro duas vezes", async () => {
    mocks.generateText.mockRejectedValue(new Error("indisponível"));
    const turn = await runAnaZeroTurn({ model: "openai/gpt-5.4-mini-fast", reader, memory: [], history });
    expect(turn.text).toBe(ANA_ZERO_TECHNICAL_REPLY);
    expect(turn.errors).toHaveLength(2);
    expect(turn.errors[0]).toContain("indisponível");
  });

  it("usa resposta segura mínima quando o modelo responde vazio, sem erro técnico", async () => {
    mocks.generateText.mockResolvedValue(result(""));
    const turn = await runAnaZeroTurn({ model: "openai/gpt-5.4-mini-fast", reader, memory: [], history });
    expect(turn.text).toBe(ANA_ZERO_SAFE_REPLY);
    expect(turn.errors).toEqual([]);
  });
});

describe("contrato HTTP e prompt", () => {
  it("versiona a política conversacional consolidada", () => {
    expect(PROMPT_VERSION).toBe("2026-10-19.1");
  });
  it("exige que a última mensagem seja do usuário e limita o histórico", () => {
    const base = { messages: [{ id: "1", role: "assistant", parts: [{ type: "text", text: "oi" }] }] };
    expect(anaZeroRequestSchema.safeParse(base).success).toBe(false);
    const ok = { messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "oi" }] }] };
    const parsed = anaZeroRequestSchema.safeParse(ok);
    expect(parsed.success && parsed.data.memory).toEqual([]);
  });
  it("o prompt não deixa regra de nome obrigatório", () => {
    expect(buildAnaZeroSystem([])).toContain("O nome é opcional");
  });
  it("o prompt orienta a reformular buscas vazias e a não abrir com recusa", () => {
    const system = buildAnaZeroSystem([]);
    expect(system).toContain("Uma busca vazia nunca prova");
    expect(system).toContain("nunca \"não encontrei uma descrição pública\"");
    expect(system).toContain("devolver a pergunta");
  });
  it("o prompt proíbe fecho repetitivo, frases de esquiva e pedido de contato formal", () => {
    const system = buildAnaZeroSystem([]);
    expect(system).toContain('Nunca use a fórmula "Se quiser, eu posso..."');
    expect(system).toContain('Nunca escreva "não tenho isso confirmado"');
    expect(system).toContain("Se a pessoa falar da escola como negócio");
    expect(system).toContain("Prefere WhatsApp ou e-mail?");
    expect(system).toContain("mas não é o contato");
    expect(system).toContain("número com DDD ou o endereço de e-mail");
    expect(system).toContain("não pergunte de novo");
    expect(system).toContain('Nunca use "consentiria"');
  });
  it("o prompt mantém a saudação calorosa e sem consulta à base", () => {
    const system = buildAnaZeroSystem([]);
    expect(system).toContain("Oi! Eu sou a Ana. Como posso te ajudar?");
    expect(system).toContain("sem consultar a base e sem apresentar a Amplify");
    expect(system).toContain("não é afirmação sobre a Amplify e não pede consulta");
    expect(system).toContain("Isso não vale para saudação");
  });
  it("o prompt não deixa a resposta ao nome sem caminho nem presume a frente do dono de escola", () => {
    const system = buildAnaZeroSystem([]);
    expect(system).toContain("Responder só \"Oi, Leonardo.\" deixa a pessoa sem caminho");
    expect(system).toContain("não presuma a frente");
    expect(system).toContain('Nunca diga que o L.E.I.A. "não é indicado"');
  });
  it("distingue interesse ativo de encerramento sem violar os limites de perguntas", () => {
    const system = buildAnaZeroSystem([]);
    expect(system).toContain("indicam interesse ativo");
    expect(system).toContain("indicam encerramento");
    expect(system).toContain("no máximo uma pergunta");
    expect(system).toContain('Nunca use a fórmula "Se quiser, eu posso..."');
  });
  it("prioriza o tema explícito e mantém respostas sobre o L.E.I.A. dentro do L.E.I.A.", () => {
    const system = buildAnaZeroSystem([]);
    expect(system).toContain("O assunto escolhido explicitamente pela pessoa tem prioridade");
    expect(system).toContain("responda primeiro com conteúdo concreto sustentado por ela");
    expect(system).toContain("nas perguntas seguintes, não repita essa introdução");
    expect(system).toContain("nunca use essa resposta para voltar a gestão");
    expect(system).toContain("sem criar um rótulo ou uma frase pronta para essa segunda frente");
    expect(system).not.toContain("Escola também é uma organização");
  });
  it("o nome por extenso do L.E.I.A. só é pedido na primeira menção", () => {
    expect(hasIntroducedLeia(["Oi!", "O L.E.I.A. — Laboratório Escolar de Inteligência Artificial é um programa anual."])).toBe(true);
    expect(hasIntroducedLeia(["Oi! Eu sou a Ana."])).toBe(false);
    expect(buildAnaZeroSystem([], undefined, true)).toContain('escreva apenas "L.E.I.A."');
    expect(buildAnaZeroSystem([], undefined, false)).not.toContain("já foi apresentado por extenso");
  });
});

describe("análise de transcrições", () => {
  const capture = COMPARE_SCENARIOS.find((s) => s.name === "captura-oi-oi-leo")!;
  it("marca o loop da captura original", () => {
    const flags = analyzeTranscript(capture, ["Entendi. Qual é o seu nome?", "Entendi. Qual é o seu nome?"]);
    expect(flags.map((f) => f.kind)).toEqual(expect.arrayContaining(["repeated_reply", "repeated_question", "forbidden", "missing"]));
  });
  it("não marca uma conversa que acompanha o nome", () => {
    expect(analyzeTranscript(capture, ["Oi! Eu sou a Ana. Como posso ajudar?", "Prazer, Leo. No que posso ajudar?"])).toEqual([]);
  });
  it("marca desvio para gestão numa resposta pedida diretamente sobre o L.E.I.A.", () => {
    const scenario = COMPARE_SCENARIOS.find((s) => s.name === "pergunta-direta-leia")!;
    const flags = analyzeTranscript(scenario, ["O L.E.I.A. é para alunos. Também oferecemos consultoria de gestão para a escola."]);
    expect(flags.map((flag) => flag.kind)).toContain("forbidden");
  });
  it("aceita explicação concreta do L.E.I.A. sem desvio de assunto", () => {
    const scenario = COMPARE_SCENARIOS.find((s) => s.name === "pergunta-direta-leia")!;
    expect(analyzeTranscript(scenario, ["O L.E.I.A. é um programa para estudantes da Educação Básica aprenderem a usar IA."])).toEqual([]);
  });
  it("distingue avanço após interesse de reabertura após encerramento", () => {
    const active = COMPARE_SCENARIOS.find((s) => s.name === "legal-depois-de-interesse")!;
    expect(analyzeTranscript(active, ["O L.E.I.A. atende estudantes.", "O próximo passo é definir a turma da escola."])).toEqual([]);
    expect(analyzeTranscript(active, ["O L.E.I.A. atende estudantes.", "Que bom que você gostou do L.E.I.A."]).map((flag) => flag.kind)).toContain("missing");

    const terminal = COMPARE_SCENARIOS.find((s) => s.name === "ok-seco")!;
    expect(analyzeTranscript(terminal, ["O L.E.I.A. é um programa para estudantes.", "Tudo certo!"])).toEqual([]);
    expect(analyzeTranscript(terminal, ["O L.E.I.A. é um programa para estudantes.", "Quer conhecer as opções?"]).map((flag) => flag.kind)).toContain("unneeded_question");
  });
});
