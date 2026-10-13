import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, openSync, closeSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { convertToModelMessages, gateway } from "ai";
import { fileKnowledgeService } from "../src/lib/okf/file-service.js";
import { ANA_REFERENCE_SUITE } from "../src/lib/ana/reference-suite.js";
import { ANA_PROGRESS_MULTITURN as ANA_MULTITURN_SUITE } from "../src/lib/ana/progress-multiturn.js";
import { ANA_PROGRESS_REPLAYS } from "../src/lib/ana/progress-suite.js";
import { evaluateState, evaluateQualification, evaluateResponse, evaluateHandoff, evaluateQuestion, type EvaluationFailure } from "../src/lib/ana/evaluation.js";
import type { AnaConversationState, AnaLeadQualification } from "../src/lib/ana/conversation.js";
import type { AnaMessage } from "../src/lib/ana/types.js";
import type { AnaModelId } from "../src/lib/ana/config.js";
import type { AnaGeneratedAnswer } from "../src/lib/ana/agent.js";

const arg = (name: string) => process.argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const live = process.argv.includes("--live");
const engineRoot = resolve(arg("engine-root") ?? ".");
const engineHash = createHash("sha256");
for (const file of readdirSync(join(engineRoot, "src/lib/ana")).filter(f => f.endsWith(".ts")).sort()) {
  engineHash.update(file); engineHash.update(readFileSync(join(engineRoot, "src/lib/ana", file)));
}
const engineFingerprint = engineHash.digest("hex");
const output = resolve(arg("output") ?? `.ana-eval/${live ? "live" : "offline"}-${Date.now()}.json`);
const budgetDirectory = resolve(arg("budget-dir") ?? ".ana-eval");
const ledgerPath = join(budgetDirectory, "budget.json");
const lockPath = join(budgetDirectory, "live.lock");
const approved: AnaModelId[] = ["openai/gpt-5.4-mini-fast", "google/gemini-3.1-flash-lite"];
const models = (arg("models")?.split(",") ?? approved) as AnaModelId[];
if (models.some(m => !approved.includes(m))) throw new Error("Only existing approved Gateway models allowed");
const runs = Number(arg("runs") ?? 1);
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error("Invalid --runs (1..10)");
const reference = [...ANA_REFERENCE_SUITE, ...ANA_PROGRESS_REPLAYS].filter(s => !arg("scenario") || s.name.includes(arg("scenario")!));
const sequences = ANA_MULTITURN_SUITE.filter(s => !arg("scenario") || s.name.includes(arg("scenario")!));
const offset = Number(arg("offset") ?? 0);
if (!Number.isInteger(offset) || offset < 0 || offset >= ANA_REFERENCE_SUITE.length) throw new Error("Invalid --offset");
const mode = arg("mode") ?? "direct";
if (mode !== "direct" && mode !== "mcp") throw new Error("Invalid mode");
const stagingMcp = "https://aplify-site-env-staging-leonardocamacho-7240s-projects.vercel.app/api/mcp";
if (mode === "mcp") process.env.ANA_MCP_URL = stagingMcp;

const controller = await import(join(engineRoot, "src/lib/ana/conversation.ts"));
const agent = await import(join(engineRoot, "src/lib/ana/agent.ts"));
const retrievalModule = await import(join(engineRoot, "src/lib/ana/retrieval.ts"));
const guardrails = await import(join(engineRoot, "src/lib/ana/guardrails.ts"));
const http = await import(join(engineRoot, "src/lib/ana/http.ts"));
type Row = { scenario: string; suite: string; model: string; run: number; turn: number; status: "PASS" | "FAIL"; failures: EvaluationFailure[]; state: unknown; text?: string; totalMs: number; generation?: AnaGeneratedAnswer; responseChecked: boolean; retrievalMs?: number; sources?: string[] };
const results: Row[] = [];
let interrupted = false;
const originalFetch = globalThis.fetch;
let gatewayCalls = 0;
const observedGenerationIds: string[] = [];
let budgetWaitMs = 0;
let budgetStopped = false;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const isGeneration = url.hostname === "ai-gateway.vercel.sh" && url.pathname.endsWith("/language-model");
  let reservation: number | undefined;
  if (isGeneration) {
    const waitStart = performance.now();
    try {
      if (typeof init?.body !== "string") throw new Error("BUDGET_LIMIT: unknown request body");
      reservation = await reserve(init.body);
    } catch (error) { budgetStopped = true; throw error; }
    finally { budgetWaitMs += performance.now() - waitStart; }
    gatewayCalls++;
  }
  const response = await originalFetch(input, init);
  if (isGeneration && response.ok) try {
    // Read only the billing identifier, never log raw response bodies or headers.
    const body = await response.clone().json();
    const id = body.providerMetadata?.gateway?.generationId;
    if (typeof id === "string") {
      observedGenerationIds.push(id);
      const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
      Object.assign(ledger.entries[reservation!], { gatewayCalls: 1, qualityRetries: 0, generationIds: [id], accounting: "conservative-reservation" });
      writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), { mode: 0o600 });
    }
  } catch { /* Unknown billing retains conservative reservation. */ }
  return response;
};
function report() {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({
    engineRoot, engineFingerprint, sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: engineRoot, encoding: "utf8" }).trim(),
    dirty: Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: engineRoot, encoding: "utf8" }).trim()),
    budgetDirectory, models, runs, mode: live ? "live" : "deterministic", knowledgeMode: mode, offset, interrupted, date: new Date().toISOString(),
    summary: { total: results.length, passed: results.filter(r => r.status === "PASS").length, failed: results.filter(r => r.status === "FAIL").length, responseUnchecked: results.filter(r => !r.responseChecked).length },
    limitations: ["Keyword checks do not certify naturalness or factual correctness.", "In-process timings exclude HTTP, database and client transport.", "No commercial action or persistence is executed by this runner."], results,
  }, null, 2));
}

// Shared durable reservation: retained on error/crash, never reset per variant.
// Reserve before EVERY HTTP generation, including SDK and quality retries.
// Each request can route to the primary and one existing fallback model.
// UTF-8 bytes conservatively upper-bound tokens; framing/repair has 8192 extra.
// No key values, headers or provider error objects are recorded.
const prices = { input: 0, output: 0 };
async function refreshBilling() {
  if (!existsSync(ledgerPath)) return;
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  for (const entry of ledger.entries) {
    const ids = entry.generationIds as string[] | undefined;
    if (entry.accounting === "gateway-confirmed" || !ids?.length || entry.gatewayCalls !== ids.length
      || ids.length !== entry.qualityRetries + 1) continue;
    try {
      const invoices = await Promise.all(ids.map(id => gateway.getGenerationInfo({ id })));
      if (!invoices.every(x => Number.isFinite(x.totalCost) && x.totalCost >= 0)) continue;
      const actual = invoices.reduce((sum, x) => sum + x.totalCost, 0);
      ledger.reservedUsd += actual - entry.usd;
      entry.usd = actual; entry.confirmedUsd = actual; entry.accounting = "gateway-confirmed";
    } catch { /* Billing ingestion may lag; retain reservation. */ }
  }
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), { mode: 0o600 });
}
async function reserve(payload: string) {
  if (budgetStopped) throw new Error("BUDGET_LIMIT: stopped");
  const usd = 2 * ((Buffer.byteLength(payload, "utf8") + 8192) * prices.input + 500 * prices.output);
  let ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, "utf8")) : { limitUsd: 5, reservedUsd: 0, entries: [] };
  // Wait for billing ingestion, not for a larger budget. No generations while waiting.
  for (let i = 0; ledger.reservedUsd + usd > 5 && i < 12; i++) {
    console.log("Waiting for confirmed billing; no new model call.");
    await new Promise(resolve => setTimeout(resolve, 10000));
    await refreshBilling();
    ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  }
  if (ledger.limitUsd !== 5 || !Number.isFinite(ledger.reservedUsd) || ledger.reservedUsd + usd > 5) throw new Error("BUDGET_LIMIT: incomplete; no further calls authorized");
  ledger.reservedUsd += usd;
  ledger.entries.push({ date: new Date().toISOString(), usd, report: output, engineRoot });
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), { mode: 0o600 });
  return ledger.entries.length - 1;
}
function messages(turns: Array<{ role: "user" | "assistant"; text: string }>): AnaMessage[] {
  return turns.map((t, i) => ({ id: `eval-${i}`, role: t.role, parts: [{ type: "text", text: t.text }] }));
}
async function evaluate(name: string, suite: string, history: AnaMessage[], criteria: typeof ANA_REFERENCE_SUITE[number], model: AnaModelId, run: number, turn: number, previous?: AnaLeadQualification) {
  const start = performance.now();
  const state: AnaConversationState = controller.analyzeAnaConversation(history, criteria.pagePath, previous);
  const failures = [...evaluateState(state, criteria.expected), ...evaluateQualification(state, criteria.expectedQualification)];
  const last = history.at(-1)?.parts.find(p => p.type === "text");
  const query = http.buildAnaRetrievalQuery(last?.type === "text" ? last.text : "", state);
  const immediate = controller.immediateAnaReply(state, history, false);
  let generated: AnaGeneratedAnswer | undefined;
  let measuredMs: number | undefined;
  let retrieval;
  let text = immediate ?? "";
  if (live || immediate) {
    try {
      retrieval = state.shouldRetrieveKnowledge ? await retrievalModule.retrieveAnaKnowledge(mode, query, fileKnowledgeService) : retrievalModule.emptyAnaRetrieval(mode, query, `conversa-${state.turnKind}`);
    } catch { failures.push({ layer: "retrieval", rule: "retrieval_failed" }); }
    if (live && !immediate && retrieval) {
      const modelMessages = await convertToModelMessages(history);
      const callsBefore = gatewayCalls;
      const idsBefore = observedGenerationIds.length;
      const waitBefore = budgetWaitMs;
      generated = await agent.generateAnaAnswer(mode, model, modelMessages, retrieval, state);
      measuredMs = performance.now() - start - (budgetWaitMs - waitBefore);
      if (budgetStopped || gatewayCalls === callsBefore) throw new Error("BUDGET_LIMIT: request accounting incomplete");
      // Include every returned attempt ID in the report, even for the old engine.
      (generated as AnaGeneratedAnswer & { billingIds?: string[] }).billingIds = observedGenerationIds.slice(idsBefore);
      text = generated?.text ?? "";
    }
    failures.push(...evaluateResponse(text, criteria.response), ...evaluateHandoff(state, text), ...evaluateQuestion(state, text));
    if (retrieval) failures.push(...guardrails.validateAnaAnswer(text, state, retrieval).issues.map((rule: string) => ({ layer: "guardrail" as const, rule })));
    if (generated?.qualityFallback) failures.push({ layer: "generation", rule: "deterministic_fallback" });
  }
  const row: Row = { scenario: name, suite, model: live ? model : "no-llm", run, turn, status: failures.length ? "FAIL" : "PASS", failures, state, text, totalMs: measuredMs ?? performance.now() - start, generation: generated, responseChecked: Boolean(live || immediate), retrievalMs: retrieval?.totalMs, sources: retrieval?.documents.map((d: {id: string}) => d.id) };
  results.push(row); report();
  console.log(`${row.status} | ${suite} | ${model} | ${name} | turn ${turn}`);
  return { state, text };
}

let lock: number | undefined;
try {
  if (live) {
    mkdirSync(budgetDirectory, { recursive: true });
    lock = openSync(lockPath, "wx", 0o600);
    const envFile = arg("env-file") ?? ".env.local";
    if (existsSync(envFile)) process.loadEnvFile(envFile);
    if (mode === "mcp") process.env.ANA_MCP_URL = stagingMcp;
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) throw new Error("Gateway credential missing");
    const response = await fetch("https://ai-gateway.vercel.sh/v1/models");
    if (!response.ok) throw new Error("Cannot verify current prices");
    const catalog = await response.json();
    for (const model of approved) {
      const item = catalog.data.find((x: {id: string}) => x.id === model);
      const input = Number(item?.pricing?.input), output = Number(item?.pricing?.output);
      if (!Number.isFinite(input) || input <= 0 || !Number.isFinite(output) || output <= 0) throw new Error("Missing prices");
      prices.input = Math.max(prices.input, input * 1.1); prices.output = Math.max(prices.output, output * 1.1);
    }
  }
  if (live) await refreshBilling();
  for (const model of live ? models : [approved[0]]) {
    for (let run = 1; run <= (live ? runs : 1); run++) {
      if (arg("suite") !== "multiturn") for (const scenario of reference.slice(offset).filter(s => !arg("category") || s.category === arg("category"))) {
        await evaluate(scenario.name, "reference-50", messages(scenario.turns), scenario, model, run, 1);
      }
      if (arg("suite") !== "reference") for (const scenario of sequences) {
        const history: AnaMessage[] = messages(scenario.seed ?? []);
        let previous: AnaLeadQualification | undefined;
        for (const [i, item] of scenario.turns.entries()) {
          history.push({ id: `multi-u-${i}`, role: "user", parts: [{ type: "text", text: item.user }] });
          const next = await evaluate(scenario.name, live ? "real-multiturn" : "deterministic-state-sequence", history, { name: scenario.name, category: "commercial", turns: [], expected: item.expected, expectedQualification: item.expectedQualification, response: item.response }, model, run, i + 1, previous);
          previous = next.state.qualification;
          history.push({ id: `multi-a-${i}`, role: "assistant", parts: [{ type: "text", text: live ? next.text : (item.offlineReply ?? next.text) || next.state.nextQuestion?.text || "Resposta simulada para testar apenas transições de estado." }] });
        }
      }
    }
  }
} catch (error) {
  interrupted = true;
  console.error(error instanceof Error && error.message.startsWith("BUDGET_LIMIT") ? error.message : "Evaluation interrupted (configuration/runtime). Secrets are not logged.");
  process.exitCode = 2;
} finally {
  if (live && lock !== undefined) await refreshBilling();
  report();
  globalThis.fetch = originalFetch;
  if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath); }
}
console.log(`Report: ${output}`);
if (results.some(r => r.status === "FAIL")) process.exitCode = process.exitCode || 1;
