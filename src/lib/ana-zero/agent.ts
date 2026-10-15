import { createAnthropic } from "@ai-sdk/anthropic";
import { createGateway, generateText, stepCountIs, type LanguageModel, type ModelMessage } from "ai";
import { ANA_MODELS, estimateAnaCost, getAnaFallbackModels, getAnaQualityRetryModel, type AnaModelId } from "../ana/config.js";
import type { KnowledgeReader } from "../okf/http.js";
import { readServerEnv } from "./env.js";
import { ANA_ZERO_SAFE_REPLY, ANA_ZERO_TECHNICAL_REPLY, redactAnaZeroAnswer, validateAnaZeroAnswer, type AnaZeroIssue } from "./guardrails.js";
import { buildAnaZeroSystem } from "./prompt.js";
import type { AnaZeroHandoff, AnaZeroMemoryEntry } from "./schema.js";
import { createAnaZeroToolState, createAnaZeroTools, sanitizeMemory } from "./tools.js";

export type AnaZeroTurnInput = {
  model: AnaModelId;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  memory: AnaZeroMemoryEntry[];
  reader: KnowledgeReader;
  pagePath?: string;
  languageModel?: (model: AnaModelId) => LanguageModel;
};

export type AnaZeroTurnResult = {
  text: string;
  memory: AnaZeroMemoryEntry[];
  handoff?: AnaZeroHandoff;
  toolCalls: string[];
  sources: Array<{ id: string; title: string }>;
  regenerated: boolean;
  issues: AnaZeroIssue[];
  errors: string[];
  resolvedModel: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  estimatedCostUsd?: number;
};

const MAX_STEPS = 6;

export async function runAnaZeroTurn(input: AnaZeroTurnInput): Promise<AnaZeroTurnResult> {
  const userTexts = input.history.filter((turn) => turn.role === "user").map((turn) => turn.text);
  const state = createAnaZeroToolState(sanitizeMemory(input.memory, userTexts));
  const tools = createAnaZeroTools(input.reader, state, userTexts);
  const messages: ModelMessage[] = input.history.map((turn) => ({ role: turn.role, content: turn.text }));
  const resolve = input.languageModel ?? ((id: AnaModelId) =>
    ANA_MODELS[id].provider === "anthropic"
      ? createAnthropic({ apiKey: readServerEnv("ANTHROPIC_API_KEY") })(id.replace("byok/anthropic/", ""))
      : createGateway({ apiKey: readServerEnv("AI_GATEWAY_API_KEY") })(id));
  const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let resolvedModel: string = input.model;

  const attempt = async (model: AnaModelId, correction?: AnaZeroIssue[]) => {
    const result = await generateText({
      model: resolve(model),
      system: `${buildAnaZeroSystem(state.memory, input.pagePath)}${
        correction?.length
          ? `\n\nSua resposta anterior foi rejeitada (${correction.join(", ")}). Reescreva do zero respeitando os limites factuais.`
          : ""
      }`,
      messages,
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      maxOutputTokens: 700,
      maxRetries: 1,
      providerOptions: ANA_MODELS[model].provider === "anthropic"
        ? { anthropic: { thinking: { type: "disabled" } } }
        : { gateway: { tags: ["ana-zero"], models: getAnaFallbackModels(model) } },
    });
    usage.inputTokens += result.usage?.inputTokens ?? 0;
    usage.outputTokens += result.usage?.outputTokens ?? 0;
    usage.totalTokens += result.usage?.totalTokens ?? 0;
    resolvedModel = result.finalStep?.response?.modelId || model;
    return result.text;
  };

  let issues: AnaZeroIssue[] = [];
  let regenerated = false;
  let text = "";
  const errors: string[] = [];
  const recordError = (model: string, error: unknown) => {
    const message = (error instanceof Error ? error.message : String(error))
      .replace(/\u001b\[[0-9;]*m/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 240);
    errors.push(`${model}: ${message}`);
    console.error("[Ana Zero] Falha na chamada ao modelo", model, message);
  };

  try {
    const first = validateAnaZeroAnswer(await attempt(input.model), state.evidenceText);
    if (first.valid) text = first.text;
    else issues = first.issues;
  } catch (error) {
    recordError(input.model, error);
    issues = ["empty"];
  }

  if (!text) {
    regenerated = true;
    const retryModel = getAnaQualityRetryModel(input.model);
    try {
      const second = validateAnaZeroAnswer(await attempt(retryModel, issues), state.evidenceText);
      if (second.valid) text = second.text;
      else {
        issues = [...new Set([...issues, ...second.issues])];
        text = redactAnaZeroAnswer(second.text, state.evidenceText);
      }
    } catch (error) {
      recordError(retryModel, error);
      issues = [...new Set([...issues, "empty" as const])];
    }
  }

  const technicalFailure = !text && errors.length > 0;

  return {
    text: text || (technicalFailure ? ANA_ZERO_TECHNICAL_REPLY : ANA_ZERO_SAFE_REPLY),
    errors,
    memory: state.memory,
    handoff: state.handoff,
    toolCalls: state.toolCalls,
    sources: [...state.sources].map(([id, title]) => ({ id, title })),
    regenerated,
    issues,
    resolvedModel,
    usage,
    estimatedCostUsd: estimateAnaCost(input.model, usage),
  };
}
