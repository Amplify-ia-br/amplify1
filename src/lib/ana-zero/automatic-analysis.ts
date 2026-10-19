import { waitUntil } from "@vercel/functions";
import { analyzeCompletedSession } from "./admin/automatic.js";

export function scheduleAutomaticAnalysis(sessionId: string) {
  const task = analyzeCompletedSession(sessionId).catch((error) => {
    console.error("[Ana Zero] Análise automática falhou", error instanceof Error ? error.message : error);
  });

  try {
    waitUntil(task);
  } catch {
    // O contexto local do Astro não oferece waitUntil. O trabalho ainda é iniciado
    // para permitir desenvolvimento e testes fora da Vercel.
    void task;
  }
}
