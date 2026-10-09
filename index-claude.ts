import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const { text } = await generateText({
  model: anthropic("claude-haiku-5-5"),
  prompt: "Invente um novo feriado e descreva suas principais tradições.",
});

console.log(text);
