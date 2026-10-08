import { generateText } from "ai";

const { text } = await generateText({
  model: "moonshotai/kimi-k3",
  prompt: "Invente um novo feriado e descreva suas principais tradições.",
});

console.log(text);
