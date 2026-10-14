import { normalizeKnowledgeText } from "../okf/core.js";
import { validateAnaZeroAnswer } from "./guardrails.js";
import type { CompareScenario } from "./scenarios.js";

export type CompareFlag = { reply: number; kind: string; detail: string };

const PRICE_INTENT = /pre[cç]o|valor|quanto|custa|invest|or[cç]amento|mensalidade/i;
const MONEY = /R\$\s*\d|\d+\s*reais/i;

function questions(text: string) {
  return text.split(/(?<=[.!?])\s+|\n+/u).filter((sentence) => sentence.trim().endsWith("?")).map(normalizeKnowledgeText);
}

export function analyzeTranscript(scenario: CompareScenario, replies: string[]): CompareFlag[] {
  const flags: CompareFlag[] = [];
  const seenQuestions = new Set<string>();
  const seenReplies = new Set<string>();

  replies.forEach((reply, index) => {
    const normalized = normalizeKnowledgeText(reply);
    if (seenReplies.has(normalized)) flags.push({ reply: index, kind: "repeated_reply", detail: reply });
    seenReplies.add(normalized);

    for (const question of questions(reply)) {
      if (seenQuestions.has(question)) flags.push({ reply: index, kind: "repeated_question", detail: question });
      seenQuestions.add(question);
    }
    if (questions(reply).length > 1) flags.push({ reply: index, kind: "multiple_questions", detail: String(questions(reply).length) });

    for (const issue of validateAnaZeroAnswer(reply, []).issues) {
      if (issue === "markdown" || issue === "internal_term" || issue === "promise_of_action") {
        flags.push({ reply: index, kind: issue, detail: reply });
      }
    }

    const userSoFar = scenario.userTurns.slice(0, index + 1).join(" ");
    if (MONEY.test(reply) && !PRICE_INTENT.test(userSoFar)) {
      flags.push({ reply: index, kind: "unrequested_price", detail: reply });
    }
  });

  for (const rule of scenario.forbidAfter ?? []) {
    replies.forEach((reply, index) => {
      if (index >= rule.afterReply && rule.pattern.test(reply)) {
        flags.push({ reply: index, kind: "forbidden", detail: rule.reason });
      }
    });
  }
  for (const rule of scenario.requireIn ?? []) {
    const reply = replies[rule.reply];
    if (reply === undefined || !rule.pattern.test(reply)) {
      flags.push({ reply: rule.reply, kind: "missing", detail: rule.reason });
    }
  }
  for (const rule of scenario.maxWordsIn ?? []) {
    const words = (replies[rule.reply] ?? "").split(/\s+/).filter(Boolean).length;
    if (words > rule.words) flags.push({ reply: rule.reply, kind: "too_long", detail: `${words} palavras` });
  }
  for (const index of scenario.noQuestionIn ?? []) {
    if (questions(replies[index] ?? "").length) flags.push({ reply: index, kind: "unneeded_question", detail: replies[index] });
  }
  return flags;
}
