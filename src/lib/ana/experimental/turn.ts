import { generateText, Output, type ModelMessage } from "ai";
import { languageModel } from "../agent.js";
import { getAnaQualityRetryModel, type AnaModelId } from "../config.js";
import type { AnaConversationState, AnaLeadQualification } from "../conversation.js";
import type { AnaRetrievalTrace } from "../retrieval.js";
import { applyTurnUnderstanding, experimentalLeadStage, toLeadState } from "./memory.js";
import { validateExperimentalReply, type ExperimentalIssue } from "./policy.js";
import { buildExperimentalSystem } from "./prompt.js";
import { anaTurnOutputSchema, type AnaTurnOutput } from "./schema.js";

export type TurnGeneration = {
  output: AnaTurnOutput;
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  resolvedModel: string;
  generationId?: string;
  finishReason?: string;
};

export type TurnGenerator = (input: {
  model: AnaModelId;
  system: string;
  messages: ModelMessage[];
  apiKey?: string;
}) => Promise<TurnGeneration>;

export const generateStructuredTurn: TurnGenerator = async ({ model, system, messages, apiKey }) => {
  const result = await generateText({
    model: languageModel(model, apiKey),
    system,
    messages,
    output: Output.object({ schema: anaTurnOutputSchema }),
    maxOutputTokens: 1_000,
    maxRetries: 1,
    providerOptions: {
      anthropic: { thinking: { type: "disabled" } },
    },
  });
  const gateway = (result.providerMetadata as { gateway?: { generationId?: string } } | undefined)?.gateway;
  return {
    output: result.output,
    usage: result.usage,
    resolvedModel: result.response.modelId ?? model,
    generationId: gateway?.generationId,
    finishReason: result.finishReason,
  };
};

const SAFE_FALLBACK = "Desculpe, não consegui formular uma boa resposta agora. Pode me contar de novo, com suas palavras, o que você precisa?";

export function shouldExpandLeia(assistantTexts: string[]) {
  return !assistantTexts.some((text) => /L\.E\.I\.A\.\s*[—-]\s*Laboratório Escolar/iu.test(text));
}

export type ExperimentalTurnResult = {
  text: string;
  conversation: AnaConversationState;
  qualification: AnaLeadQualification;
  usage: TurnGeneration["usage"];
  resolvedModel: string;
  generationId?: string;
  finishReason?: string;
  modelCalls: number;
  qualityRetryCount: number;
  qualityFallback: boolean;
  validationIssues: ExperimentalIssue[];
};

export async function runExperimentalTurn(input: {
  model: AnaModelId;
  apiKey?: string;
  messages: ModelMessage[];
  userTexts: string[];
  assistantTexts: string[];
  retrieval: AnaRetrievalTrace;
  previousQualification?: Partial<AnaLeadQualification>;
  pagePath?: string;
  generate?: TurnGenerator;
}): Promise<ExperimentalTurnResult> {
  const generate = input.generate ?? generateStructuredTurn;
  const expandLeia = shouldExpandLeia(input.assistantTexts);
  const context = { userTurnCount: input.userTexts.length, pagePath: input.pagePath, shouldExpandLeia: expandLeia };

  let lastOutput: AnaTurnOutput | undefined;
  let lastGeneration: TurnGeneration | undefined;
  let issues: ExperimentalIssue[] = [];
  let modelCalls = 0;

  for (const attempt of [0, 1]) {
    const model = attempt === 0 ? input.model : getAnaQualityRetryModel(input.model);
    try {
      modelCalls += 1;
      const generation = await generate({
        model,
        apiKey: input.apiKey,
        messages: input.messages,
        system: buildExperimentalSystem({
          qualification: input.previousQualification,
          retrieval: input.retrieval,
          shouldExpandLeia: expandLeia,
          correction: attempt === 0 ? undefined : issues,
        }),
      });
      lastGeneration = generation;
      lastOutput = generation.output;

      const qualification = applyTurnUnderstanding(input.previousQualification, generation.output, input.userTexts);
      const verdict = validateExperimentalReply(generation.output.reply, generation.output, qualification, {
        shouldExpandLeia: expandLeia,
        leadStage: experimentalLeadStage(qualification),
        retrieval: input.retrieval,
      });
      if (verdict.valid) {
        return {
          text: verdict.text,
          qualification,
          conversation: toLeadState(qualification, generation.output, context),
          usage: generation.usage,
          resolvedModel: generation.resolvedModel,
          generationId: generation.generationId,
          finishReason: generation.finishReason,
          modelCalls,
          qualityRetryCount: attempt,
          qualityFallback: false,
          validationIssues: [],
        };
      }
      issues = verdict.issues;
    } catch (error) {
      issues = ["empty"];
      console.error("[Ana experimental] falha na geração do turno", error instanceof Error ? error.message : error);
    }
  }

  // Understanding extracted from a rejected reply is still valid memory; the reply itself is discarded.
  const qualification = lastOutput
    ? applyTurnUnderstanding(input.previousQualification, lastOutput, input.userTexts)
    : applyTurnUnderstanding(input.previousQualification, EMPTY_UNDERSTANDING, input.userTexts);
  return {
    text: SAFE_FALLBACK,
    qualification,
    conversation: toLeadState(qualification, lastOutput && { ...lastOutput, questionField: null }, context),
    usage: lastGeneration?.usage ?? {},
    resolvedModel: lastGeneration?.resolvedModel ?? input.model,
    generationId: lastGeneration?.generationId,
    finishReason: lastGeneration?.finishReason,
    modelCalls,
    qualityRetryCount: 1,
    qualityFallback: true,
    validationIssues: issues,
  };
}

const EMPTY_UNDERSTANDING: AnaTurnOutput = {
  reply: "",
  turnKind: "disclosure",
  userName: null,
  offerInterest: null,
  wantsToAdvance: false,
  wantsMeeting: false,
  asksPricing: false,
  contactConsent: null,
  schoolSector: null,
  gradeFit: null,
  studentCount: null,
  internetReady: null,
  facts: [],
  questionField: null,
};
