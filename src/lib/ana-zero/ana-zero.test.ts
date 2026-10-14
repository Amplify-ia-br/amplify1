import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ generateText: vi.fn() }));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: mocks.generateText,
  gateway: vi.fn((model: string) => ({ model })),
}));

import { runAnaZeroTurn } from "./agent";
import { analyzeTranscript } from "./compare";
import { ANA_ZERO_SAFE_REPLY, redactAnaZeroAnswer, validateAnaZeroAnswer } from "./guardrails";
import { buildAnaZeroSystem } from "./prompt";
import { COMPARE_SCENARIOS } from "./scenarios";
import { anaZeroRequestSchema } from "./schema";
import { createAnaZeroToolState, createAnaZeroTools, quoteIsFromUser, sanitizeMemory } from "./tools";

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

  it("usa resposta segura mínima quando o modelo falha duas vezes", async () => {
    mocks.generateText.mockRejectedValue(new Error("indisponível"));
    const turn = await runAnaZeroTurn({ model: "openai/gpt-5.4-mini-fast", reader, memory: [], history });
    expect(turn.text).toBe(ANA_ZERO_SAFE_REPLY);
  });
});

describe("contrato HTTP e prompt", () => {
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
});
