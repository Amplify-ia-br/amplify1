import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { convertToModelMessages, gateway } from "ai";
import { estimateAnaCost, type AnaModelId } from "../src/lib/ana/config.js";
import { generateAnaAnswer } from "../src/lib/ana/agent.js";
import { analyzeAnaConversation, immediateAnaReply, type AnaLeadQualification } from "../src/lib/ana/conversation.js";
import { buildAnaRetrievalQuery } from "../src/lib/ana/http.js";
import { emptyAnaRetrieval, retrieveAnaKnowledge } from "../src/lib/ana/retrieval.js";
import type { AnaMessage } from "../src/lib/ana/types.js";
import { fileKnowledgeService } from "../src/lib/okf/file-service.js";
import { runAnaZeroTurn } from "../src/lib/ana-zero/agent.js";
import { analyzeTranscript, type CompareFlag } from "../src/lib/ana-zero/compare.js";
import { COMPARE_SCENARIOS } from "../src/lib/ana-zero/scenarios.js";
import type { AnaZeroMemoryEntry } from "../src/lib/ana-zero/schema.js";

const arg = (name: string) => process.argv.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const live = process.argv.includes("--live");
const engines = (arg("engine") ?? "both") === "both" ? ["zero", "legacy"] : [arg("engine")!];
const approved: AnaModelId[] = ["openai/gpt-5.4-mini-fast", "google/gemini-3.1-flash-lite"];
const models = (arg("models")?.split(",") ?? approved) as AnaModelId[];
if (models.some((m) => !approved.includes(m))) throw new Error("Somente modelos aprovados do Gateway.");
if (engines.some((e) => e !== "zero" && e !== "legacy")) throw new Error("--engine deve ser zero, legacy ou both.");
const maxUsd = Number(arg("max-usd") ?? 0.5);
const scenarios = COMPARE_SCENARIOS.filter((s) => !arg("scenario") || s.name.includes(arg("scenario")!));
const output = resolve(arg("output") ?? `.ana-eval/compare-${live ? "live" : "dry"}-${Date.now()}.json`);

type TurnLog = { user: string; reply: string; ms: number; costUsd: number; tokens: number; tools?: string[]; memory?: number };
type Row = { engine: string; model: string; scenario: string; flags: CompareFlag[]; turns: TurnLog[] };

if (!live) {
  const turns = scenarios.reduce((sum, s) => sum + s.userTurns.length, 0);
  console.log(`Modo seco: nenhuma chamada paga. ${scenarios.length} cenários, ${turns} turnos por motor/modelo.`);
  console.log(`Chamadas aproximadas com --live: ${turns * engines.length * models.length} turnos (cada turno pode ter várias chamadas de modelo).`);
  scenarios.forEach((s) => console.log(`- ${s.name}: ${s.userTurns.map((t) => JSON.stringify(t)).join(" → ")}`));
  process.exit(0);
}

let spentUsd = 0;
const uiMessage = (role: "user" | "assistant", text: string, i: number): AnaMessage => ({ id: `cmp-${i}`, role, parts: [{ type: "text", text }] });

async function legacyTurn(model: AnaModelId, history: AnaMessage[], qualification?: Partial<AnaLeadQualification>) {
  const latest = history.filter((m) => m.role === "user").at(-1)!.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const conversation = analyzeAnaConversation(history, "/lab/ana", qualification);
  const retrieval = conversation.shouldRetrieveKnowledge
    ? await retrieveAnaKnowledge("direct", buildAnaRetrievalQuery(latest, conversation), fileKnowledgeService)
    : emptyAnaRetrieval("direct", latest, `conversa-${conversation.turnKind}`);
  const immediate = immediateAnaReply(conversation, history);
  if (immediate) return { text: immediate, costUsd: 0, tokens: 0, qualification: conversation.qualification };
  const answer = await generateAnaAnswer("direct", model, await convertToModelMessages(history), retrieval, conversation);
  return {
    text: answer.text,
    costUsd: estimateAnaCost(model, answer.usage) ?? 0,
    tokens: answer.usage.totalTokens ?? 0,
    qualification: conversation.qualification,
  };
}

const rows: Row[] = [];
function save(interrupted = false) {
  mkdirSync(dirname(output), { recursive: true });
  const byEngine = Object.fromEntries(engines.map((engine) => {
    const mine = rows.filter((r) => r.engine === engine);
    const kinds: Record<string, number> = {};
    mine.flatMap((r) => r.flags).forEach((f) => { kinds[f.kind] = (kinds[f.kind] ?? 0) + 1; });
    return [engine, {
      transcripts: mine.length,
      cleanTranscripts: mine.filter((r) => r.flags.length === 0).length,
      flagsByKind: kinds,
      costUsd: mine.flatMap((r) => r.turns).reduce((s, t) => s + t.costUsd, 0),
      avgMs: Math.round(mine.flatMap((r) => r.turns).reduce((s, t) => s + t.ms, 0) / Math.max(1, mine.flatMap((r) => r.turns).length)),
    }];
  }));
  writeFileSync(output, JSON.stringify({
    date: new Date().toISOString(), interrupted, models, maxUsd, spentUsd, byEngine, rows,
    limitations: ["Checagens por regex não certificam naturalidade nem correção factual.", "Histórico passado em memória para ambos os motores; falhas de persistência não são testadas.", "Nenhuma persistência ou envio comercial é executado."],
  }, null, 2));
}

try {
  outer: for (const model of models) {
    for (const scenario of scenarios) {
      for (const engine of engines) {
        const history: AnaMessage[] = [];
        const replies: string[] = [];
        const turns: TurnLog[] = [];
        let memory: AnaZeroMemoryEntry[] = [];
        let qualification: Partial<AnaLeadQualification> | undefined;
        for (const userText of scenario.userTurns) {
          if (spentUsd >= maxUsd) { console.log(`Limite de US$ ${maxUsd} atingido; interrompendo.`); save(true); break outer; }
          history.push(uiMessage("user", userText, history.length));
          const started = Date.now();
          let reply = ""; let costUsd = 0; let tokens = 0; let tools: string[] | undefined;
          try {
            if (engine === "zero") {
              const turn = await runAnaZeroTurn({
                model, memory, reader: fileKnowledgeService, pagePath: "/lab/ana-zero",
                history: history.map((m) => ({ role: m.role as "user" | "assistant", text: m.parts.map((p) => (p.type === "text" ? p.text : "")).join("") })),
              });
              reply = turn.text; costUsd = turn.estimatedCostUsd ?? 0; tokens = turn.usage.totalTokens; tools = turn.toolCalls; memory = turn.memory;
            } else {
              const turn = await legacyTurn(model, history, qualification);
              reply = turn.text; costUsd = turn.costUsd; tokens = turn.tokens; qualification = turn.qualification;
            }
          } catch (error) {
            reply = `[erro: ${error instanceof Error ? error.message.slice(0, 120) : "desconhecido"}]`;
          }
          spentUsd += costUsd;
          history.push(uiMessage("assistant", reply, history.length));
          replies.push(reply);
          turns.push({ user: userText, reply, ms: Date.now() - started, costUsd, tokens, tools, memory: engine === "zero" ? memory.length : undefined });
        }
        const flags = analyzeTranscript(scenario, replies);
        rows.push({ engine, model, scenario: scenario.name, flags, turns });
        console.log(`${flags.length ? "FLAG" : "OK  "} ${engine.padEnd(6)} ${model.split("/")[1].padEnd(22)} ${scenario.name}${flags.length ? ` → ${[...new Set(flags.map((f) => f.kind))].join(", ")}` : ""}`);
      }
    }
  }
} finally {
  save();
  console.log(`Gasto estimado: US$ ${spentUsd.toFixed(4)} (limite US$ ${maxUsd}). Relatório: ${output}`);
}
