import { existsSync } from "node:fs";
import { convertToModelMessages } from "ai";
import { normalizeKnowledgeText } from "../src/lib/okf/core.js";
import { fileKnowledgeService } from "../src/lib/okf/file-service.js";
import { generateAnaAnswer } from "../src/lib/ana/agent.js";
import { ANA_MODELS, type AnaKnowledgeMode, type AnaModelId } from "../src/lib/ana/config.js";
import { analyzeAnaConversation, immediateAnaReply } from "../src/lib/ana/conversation.js";
import { validateAnaAnswer } from "../src/lib/ana/guardrails.js";
import { ANA_REFERENCE_SUITE, type AnaReferenceScenario } from "../src/lib/ana/reference-suite.js";
import { emptyAnaRetrieval, retrieveAnaKnowledge } from "../src/lib/ana/retrieval.js";
import type { AnaMessage } from "../src/lib/ana/types.js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const APPROVED_MODELS: AnaModelId[] = [
  "openai/gpt-5.4-mini-fast",
  "google/gemini-3.1-flash-lite",
];

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function uiMessages(scenario: AnaReferenceScenario): AnaMessage[] {
  return scenario.turns.map((turn, index) => ({
    id: `eval-${index}`,
    role: turn.role,
    parts: [{ type: "text", text: turn.text }],
  })) as AnaMessage[];
}

function includes(haystack: string, needle: string) {
  return normalizeKnowledgeText(haystack).includes(normalizeKnowledgeText(needle));
}

function evaluateCriteria(text: string, scenario: AnaReferenceScenario) {
  const failures: string[] = [];
  const criteria = scenario.response;
  if (!criteria) return failures;

  for (const expected of criteria.containsAll ?? []) {
    if (!includes(text, expected)) failures.push(`não contém "${expected}"`);
  }
  if (criteria.containsAny?.length && !criteria.containsAny.some((expected) => includes(text, expected))) {
    failures.push(`não contém nenhum de: ${criteria.containsAny.join(", ")}`);
  }
  for (const forbidden of criteria.excludes ?? []) {
    if (includes(text, forbidden)) failures.push(`contém termo proibido "${forbidden}"`);
  }
  const questions = (text.match(/\?/g) ?? []).length;
  if (criteria.maxQuestions !== undefined && questions > criteria.maxQuestions) {
    failures.push(`${questions} perguntas; máximo ${criteria.maxQuestions}`);
  }
  return failures;
}

function parseModels(): AnaModelId[] {
  const requested = argument("models");
  if (!requested) return APPROVED_MODELS;
  const models = requested.split(",").filter(Boolean);
  for (const model of models) {
    if (!(model in ANA_MODELS)) throw new Error(`Modelo inválido: ${model}`);
  }
  return models as AnaModelId[];
}

async function runScenario(
  scenario: AnaReferenceScenario,
  model: AnaModelId,
  mode: AnaKnowledgeMode,
) {
  const messages = uiMessages(scenario);
  const state = analyzeAnaConversation(messages, scenario.pagePath);
  const latest = scenario.turns.filter(({ role }) => role === "user").at(-1)?.text ?? "";
  const retrieval = state.shouldRetrieveKnowledge
    ? await retrieveAnaKnowledge(mode, latest, fileKnowledgeService)
    : emptyAnaRetrieval(mode, latest, `conversa-${state.turnKind}`);
  const immediate = immediateAnaReply(state, messages, true);
  const generated = immediate
    ? undefined
    : await generateAnaAnswer(mode, model, await convertToModelMessages(messages), retrieval, state);
  const text = immediate ?? generated?.text ?? "";
  const guardrail = validateAnaAnswer(text, state, retrieval);
  const failures = [
    ...(!guardrail.valid ? guardrail.issues.map((issue) => `guardrail: ${issue}`) : []),
    ...evaluateCriteria(text, scenario),
    ...(generated?.qualityFallback ? ["modelo caiu no fallback determinístico"] : []),
  ];
  return {
    scenario: scenario.name,
    category: scenario.category,
    selectedModel: model,
    resolvedModel: generated?.resolvedModel ?? "ana-conversation-policy",
    qualityRetries: generated?.qualityRetryCount ?? 0,
    passed: failures.length === 0,
    failures,
  };
}

async function main() {
  if (!process.argv.includes("--live")) {
    console.log("Avaliação não executada: use --live para autorizar chamadas pagas aos modelos.");
    console.log(`Cenários disponíveis: ${ANA_REFERENCE_SUITE.length}. Modelos padrão: ${APPROVED_MODELS.join(", ")}.`);
    return;
  }

  const runs = Number(argument("runs") ?? 3);
  if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error("--runs deve estar entre 1 e 10.");
  const mode = (argument("mode") ?? "direct") as AnaKnowledgeMode;
  if (mode !== "direct" && mode !== "mcp") throw new Error("--mode deve ser direct ou mcp.");
  const category = argument("category");
  const scenarios = category
    ? ANA_REFERENCE_SUITE.filter((scenario) => scenario.category === category)
    : ANA_REFERENCE_SUITE;
  if (!scenarios.length) throw new Error(`Nenhum cenário encontrado para a categoria ${category}.`);

  const results = [];
  for (const model of parseModels()) {
    for (let run = 1; run <= runs; run += 1) {
      for (const scenario of scenarios) {
        const result = await runScenario(scenario, model, mode);
        results.push({ ...result, run });
        const marker = result.passed ? "PASS" : "FAIL";
        console.log(`${marker} | ${model} | rodada ${run} | ${scenario.name}`);
        if (!result.passed) console.log(`  ${result.failures.join("; ")}`);
      }
    }
  }

  const failures = results.filter((result) => !result.passed);
  const retries = results.filter((result) => result.qualityRetries > 0).length;
  console.log(JSON.stringify({
    scenarios: scenarios.length,
    models: parseModels(),
    runs,
    executions: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    executionsWithQualityRetry: retries,
  }, null, 2));
  if (failures.length) process.exitCode = 1;
}

await main();
