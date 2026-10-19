import { describe, expect, it, vi } from "vitest";
import { NoObjectGeneratedError } from "ai";
import { z } from "zod-v4";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateRecommendations,
  runAnalystWithRetry,
  sanitizeRecommendations,
  sessionAnalysisSchema,
  type Analyst,
} from "./analyzer";
import type { Dataset, RecommendationRow } from "./types";

const recommendationDataset = {
  sessions: [],
  turns: [
    {
      session_id: "session-1",
      turn_index: 1,
      created_at: "2026-10-19T12:00:00.000Z",
      user_text: "Quero saber mais.",
      assistant_text: "Certo.",
      resolved_model: null,
      tool_calls: null,
      memory: null,
      issues: null,
      regenerated: false,
      errors: null,
      total_tokens: null,
      estimated_cost_usd: null,
      latency_ms: null,
    },
  ],
  feedback: [],
  turnAnalyses: [],
  sessionAnalyses: [],
} satisfies Dataset;

const evidence = [{ sessionId: "session-1", turnIndex: 1, note: "Falha observada." }];

function recommendation(
  title: string,
  rationale: string,
  proposedChange: string,
): Parameters<typeof sanitizeRecommendations>[0][number] {
  return {
    title,
    rationale,
    evidence,
    proposedChange,
    regressionScenario: "Repetir a conversa e confirmar a correção.",
  };
}

function existingRecommendation(
  title: string,
  rationale: string,
  proposedChange: string,
  status: RecommendationRow["status"] = "aceita",
): RecommendationRow {
  return {
    id: title,
    run_id: null,
    title,
    rationale,
    evidence,
    proposed_change: proposedChange,
    regression_scenario: "Repetir a conversa e confirmar a correção.",
    status,
    decision_note: null,
    decided_at: null,
    implemented_commit: null,
    prompt_version: null,
    created_at: "2026-10-19T12:00:00.000Z",
  };
}

describe("runAnalystWithRetry", () => {
  it("retries transient failures and returns the successful result", async () => {
    const run = vi
      .fn<Analyst["run"]>()
      .mockRejectedValueOnce(new Error("rate_limited"))
      .mockRejectedValueOnce(new Error("gateway_busy"))
      .mockResolvedValue({ object: { ok: true }, inputTokens: 10, outputTokens: 5 });
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await runAnalystWithRetry(
      { model: "test-model", run },
      { system: "system", prompt: "prompt", schema: z.object({ ok: z.boolean() }) },
      sleep,
    );

    expect(result.object).toEqual({ ok: true });
    expect(run).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 300);
    expect(sleep).toHaveBeenNthCalledWith(2, 900);
  });

  it("throws after the retry budget is exhausted", async () => {
    const failure = new Error("persistent_failure");
    const run = vi.fn<Analyst["run"]>().mockRejectedValue(failure);

    await expect(
      runAnalystWithRetry(
        { model: "test-model", run },
        { system: "system", prompt: "prompt", schema: z.object({ ok: z.boolean() }) },
        vi.fn().mockResolvedValue(undefined),
      ),
    ).rejects.toThrow("persistent_failure");
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("recovers a parseable analyst response that only violates bounded fields", async () => {
    const invalidObject = {
      goalReached: true,
      stageReached: "finished",
      topics: ["x".repeat(80)],
      intent: "intent",
      objections: [],
      summary: "summary",
      turns: [
        {
          turnIndex: "1",
          naturalness: 7,
          relevance: 4,
          factuality: 5,
          commercialProgress: 3,
          conciseness: 2,
          tags: [],
          failureCategory: "unknown",
          summary: "summary",
        },
      ],
    };
    const failure = new NoObjectGeneratedError({
      message: "No object generated: response did not match schema.",
      cause: Object.assign(new Error("invalid"), { value: invalidObject }),
      text: JSON.stringify(invalidObject),
      response: undefined,
      usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
      finishReason: "stop",
    });
    const run = vi.fn<Analyst["run"]>().mockRejectedValue(failure);

    const result = await runAnalystWithRetry(
      { model: "test-model", run },
      { system: "system", prompt: "prompt", schema: sessionAnalysisSchema },
      vi.fn().mockResolvedValue(undefined),
    );

    expect(result.object.stageReached).toBe("abandono");
    expect(result.object.turns[0]).toMatchObject({ turnIndex: 1, naturalness: 5, failureCategory: "nenhuma" });
    expect(result.object.topics[0]).toHaveLength(60);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("sanitizeRecommendations", () => {
  it.each([
    {
      theme: "continuidade após interesse positivo",
      existing: existingRecommendation(
        "Manter a conversa após sinal positivo",
        "A Ana encerra quando a pessoa demonstra interesse ativo.",
        "Ao perceber interesse ativo, continuar com um próximo passo contextual em vez de finalizar.",
      ),
      candidate: recommendation(
        "Prosseguir quando o usuário disser que gostou",
        "Aceites como 'legal, quero saber mais' não podem encerrar o diálogo.",
        "Depois de uma aceitação positiva, aprofundar o assunto e manter a conversa.",
      ),
    },
    {
      theme: "foco no conteúdo do L.E.I.A.",
      existing: existingRecommendation(
        "Responder sobre L.E.I.A. antes de mudar de assunto",
        "A resposta desviou do pedido explícito sobre o L.E.I.A. para gestão.",
        "Priorizar a explicação pedida sobre o L.E.I.A. antes de perguntar ou reintroduzir gestão.",
      ),
      candidate: recommendation(
        "Manter o foco no programa escolar",
        "Quando a pessoa pedir detalhes do L.E.I.A., a Ana deve permanecer no tema.",
        "Responder primeiro com conteúdo concreto do L.E.I.A. e não voltar para gestão.",
      ),
    },
    {
      theme: "linguagem natural sobre escolas",
      existing: existingRecommendation(
        "Usar linguagem natural ao perguntar pela escola",
        "A expressão 'organização educacional' soa artificial para um dono de escola.",
        "Adotar uma formulação natural, como 'qual é o nome da sua escola?'.",
      ),
      candidate: recommendation(
        "Evitar redação robótica sobre a organização escolar",
        "O vocabulário usado para se referir à escola prejudica o tom da conversa.",
        "Trocar o termo artificial por uma frase que soe natural para o interlocutor.",
      ),
    },
    {
      theme: "qualificação, contato e handoff",
      existing: existingRecommendation(
        "Validar contato antes do handoff",
        "A escolha de WhatsApp foi tratada como se fosse um telefone válido.",
        "Só encaminhar ao time comercial após qualificação, consentimento e número de contato válido.",
      ),
      candidate: recommendation(
        "Qualificar antes de encaminhar ao comercial",
        "A Ana iniciou o handoff sem ter um canal autorizado e válido.",
        "Pedir consentimento e o dado de contato antes do encaminhamento.",
      ),
    },
  ])("rejeita uma paráfrase do tema $theme", ({ existing, candidate }) => {
    expect(sanitizeRecommendations([candidate], recommendationDataset, [existing])).toEqual([]);
  });

  it.each([
    {
      boundary: "preço mesmo quando há interesse",
      existing: existingRecommendation(
        "Manter a conversa após sinal positivo",
        "A Ana encerra quando a pessoa demonstra interesse ativo.",
        "Ao perceber interesse ativo, continuar a conversa em vez de finalizar.",
      ),
      candidate: recommendation(
        "Responder preço quando houver interesse",
        "A pessoa demonstrou interesse ativo e perguntou qual era o investimento.",
        "Responder o preço antes de avançar para outro passo.",
      ),
    },
    {
      boundary: "profundidade das métricas do L.E.I.A.",
      existing: existingRecommendation(
        "Responder sobre L.E.I.A. antes de mudar de assunto",
        "A resposta desviou do pedido explícito sobre o L.E.I.A. para gestão.",
        "Explicar o L.E.I.A. antes de fazer uma pergunta de qualificação.",
      ),
      candidate: recommendation(
        "Aprofundar as métricas do L.E.I.A.",
        "A gestão precisa comparar indicadores de adoção e resultados do programa.",
        "Explicar as métricas disponíveis e como elas são acompanhadas.",
      ),
    },
    {
      boundary: "linguagem natural sobre preço para uma escola",
      existing: existingRecommendation(
        "Usar linguagem natural ao perguntar pela escola",
        "A expressão 'organização educacional' soa artificial para um dono de escola.",
        "Trocar o termo organização por nome da escola.",
      ),
      candidate: recommendation(
        "Usar linguagem natural ao explicar preços para a escola",
        "A explicação financeira ficou robótica e difícil de entender.",
        "Trocar o jargão financeiro por uma formulação natural de preço.",
      ),
    },
    {
      boundary: "dado de canal de aquisição",
      existing: existingRecommendation(
        "Validar contato antes do handoff",
        "A escolha de WhatsApp foi tratada como telefone válido.",
        "Coletar um número válido antes de encaminhar ao time comercial.",
      ),
      candidate: recommendation(
        "Registrar o canal de aquisição",
        "O dado sobre o canal de origem do lead foi perdido.",
        "Preservar se a aquisição veio de busca, indicação ou evento.",
      ),
    },
  ])("não funde uma recomendação de $boundary", ({ existing, candidate }) => {
    expect(sanitizeRecommendations([candidate], recommendationDataset, [existing])).toEqual([candidate]);
  });

  it("não usa o cenário de regressão para classificar o tema", () => {
    const existing = existingRecommendation(
      "Continuar após interesse positivo",
      "A conversa terminou apesar do sinal positivo.",
      "Manter a conversa quando a pessoa demonstrar interesse.",
    );
    const candidate = recommendation(
      "Responder dúvidas de investimento",
      "A resposta omitiu o preço solicitado.",
      "Explicar o investimento de forma objetiva.",
    );
    candidate.regressionScenario =
      "A pessoa demonstra interesse ativo; confirmar que a Ana não encerra e continua a conversa.";

    expect(sanitizeRecommendations([candidate], recommendationDataset, [existing])).toEqual([candidate]);
  });

  it.each([
    { status: "nova" as const, blocked: true },
    { status: "aceita" as const, blocked: true },
    { status: "rejeitada" as const, blocked: false },
    { status: "implementada" as const, blocked: false },
  ])("aplica deduplicação temática conforme o status $status", ({ status, blocked }) => {
    const existing = existingRecommendation(
      "Validar o telefone antes do handoff",
      "A escolha de WhatsApp não contém o número de contato.",
      "Coletar e validar um telefone antes do encaminhamento.",
      status,
    );
    const candidate = recommendation(
      "Não confundir canal com dado de contato",
      "Dizer 'WhatsApp' informa a preferência, mas não um telefone válido.",
      "Pedir o número de celular antes de encaminhar ao comercial.",
    );

    expect(sanitizeRecommendations([candidate], recommendationDataset, [existing])).toEqual(blocked ? [] : [candidate]);
  });

  it("mantém a deduplicação exata de título mesmo para itens históricos", () => {
    const existing = existingRecommendation(
      "Validar contato!",
      "Item já implementado.",
      "Validar o contato.",
      "implementada",
    );
    const candidate = recommendation(
      "  válidar contato ",
      "Uma nova justificativa.",
      "Uma nova mudança.",
    );

    expect(sanitizeRecommendations([candidate], recommendationDataset, [existing])).toEqual([]);
  });

  it("mantém recomendações relacionadas ao mesmo produto quando tratam de problemas diferentes", () => {
    const existing = [
      existingRecommendation(
        "Responder sobre L.E.I.A. antes de mudar de assunto",
        "A Ana desviou do pedido explícito sobre o L.E.I.A. para gestão.",
        "Priorizar a explicação pedida sobre o L.E.I.A. antes de perguntar.",
      ),
      existingRecommendation(
        "Validar contato antes do handoff",
        "A escolha de WhatsApp foi tratada como telefone válido.",
        "Só encaminhar após qualificação e um contato válido.",
      ),
      existingRecommendation(
        "Usar linguagem natural ao perguntar pela escola",
        "A formulação atual soa artificial para donos de escola.",
        "Usar redação natural ao falar da escola.",
      ),
    ];
    const candidates = [
      recommendation(
        "Padronizar a escrita da sigla L.E.I.A.",
        "A sigla apareceu sem pontuação em uma resposta.",
        "Escrever L.E.I.A. com pontos em todas as menções.",
      ),
      recommendation(
        "Explicar o investimento antes de avançar",
        "Uma pergunta sobre preço não foi respondida.",
        "Responder objetivamente sobre investimento antes de sugerir o próximo passo.",
      ),
      recommendation(
        "Registrar o porte da escola",
        "O número de alunos é relevante para a implantação.",
        "Registrar o porte informado sem inferir dados ausentes.",
      ),
    ];

    expect(sanitizeRecommendations(candidates, recommendationDataset, existing).map((item) => item.title)).toEqual(
      candidates.map((item) => item.title),
    );
  });

  it("deduplica paráfrases produzidas no mesmo lote", () => {
    const first = recommendation(
      "Continuar após um sinal positivo",
      "A pessoa demonstrou interesse ativo, mas a conversa terminou.",
      "Manter a conversa e oferecer um próximo passo contextual.",
    );
    const paraphrase = recommendation(
      "Não encerrar quando o usuário disser que gostou",
      "A aceitação positiva deveria permitir aprofundar o assunto.",
      "Prosseguir após o interesse em vez de finalizar.",
    );

    expect(sanitizeRecommendations([first, paraphrase], recommendationDataset, [])).toEqual([first]);
  });

  it("continua descartando recomendações sem evidência válida", () => {
    const candidate = recommendation(
      "Nova regra sem evidência",
      "A justificativa não aponta para um turno existente.",
      "Não aplicar esta mudança.",
    );
    candidate.evidence = [{ sessionId: "missing", turnIndex: 99, note: "Turno inexistente." }];

    expect(sanitizeRecommendations([candidate], recommendationDataset, [])).toEqual([]);
  });
});

describe("generateRecommendations", () => {
  it("envia somente recomendações ativas recentes, com campos limitados e sem evidências históricas", async () => {
    const active = Array.from({ length: 30 }, (_, index) => ({
      ...existingRecommendation(
        `Recomendação ativa ${index}`,
        `Justificativa ${index} ${"x".repeat(700)}`,
        `Mudança ${index} ${"y".repeat(1_000)}`,
        index % 2 ? "nova" : "aceita",
      ),
      id: `active-${index}`,
      created_at: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    }));
    const historical = [
      {
        ...existingRecommendation("Rejeitada recente", "Não enviar.", "Não enviar.", "rejeitada"),
        created_at: "2026-10-19T23:59:00.000Z",
      },
      {
        ...existingRecommendation("Implementada recente", "Não enviar.", "Não enviar.", "implementada"),
        created_at: "2026-10-19T23:58:00.000Z",
      },
    ];
    let sentPayload: Record<string, unknown> | undefined;
    const analyst: Analyst = {
      model: "test-model",
      async run({ prompt, schema }) {
        sentPayload = JSON.parse(prompt) as Record<string, unknown>;
        return { object: schema.parse({ recommendations: [] }), inputTokens: 0, outputTokens: 0 };
      },
    };
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: "run-1" }, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    } as unknown as SupabaseClient;

    await generateRecommendations(client, recommendationDataset, {
      analyst,
      existing: [historical[0], ...active.slice().reverse(), historical[1]],
      systemPrompt: "Prompt atual",
    });

    const sent = sentPayload?.recomendacoesExistentes as Array<Record<string, unknown>>;
    expect(sent).toHaveLength(24);
    expect(sent[0].titulo).toBe("Recomendação ativa 29");
    expect(sent.some((item) => item.titulo === "Rejeitada recente" || item.titulo === "Implementada recente")).toBe(false);
    expect(sent.every((item) => !("evidencias" in item))).toBe(true);
    expect(String(sent[0].justificativa).length).toBeLessThanOrEqual(501);
    expect(String(sent[0].mudancaProposta).length).toBeLessThanOrEqual(801);
  });
});
