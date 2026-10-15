import type { AnaZeroMemoryEntry, AnaZeroMessage } from "@/lib/ana-zero/schema";

export const textOf = (message: AnaZeroMessage) =>
  message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");

const memoryLabels: Record<AnaZeroMemoryEntry["key"], string> = {
  name: "nome",
  organization: "organização",
  role: "papel",
  need: "necessidade",
  audience: "público",
  timeline: "prazo",
  decision_maker: "decisor",
  contact_preference: "contato",
  other: "outro",
};

export const memoryLabel = (key: AnaZeroMemoryEntry["key"]) => memoryLabels[key];

export const describeMetadata = (metadata: AnaZeroMessage["metadata"]) => {
  if (!metadata) return "";
  const parts = [
    metadata.resolvedModel,
    `ferramentas: ${metadata.toolCalls?.length ? metadata.toolCalls.join(", ") : "nenhuma"}`,
    metadata.memory?.length ? `memória: ${metadata.memory.map((entry) => `${entry.key}=${entry.value}`).join("; ")}` : "",
    metadata.handoff ? "pedido de contato registrado" : "",
    metadata.regenerated ? "regenerada" : "",
    metadata.issues?.length ? `validações: ${metadata.issues.join(", ")}` : "",
    metadata.errors?.length ? `erro técnico: ${metadata.errors.join(" | ")}` : "",
    metadata.estimatedCostUsd != null ? `US$ ${metadata.estimatedCostUsd.toFixed(5)}` : "",
  ].filter(Boolean);
  return `[${parts.join(" · ")}]`;
};

export const buildTranscript = (messages: AnaZeroMessage[], header?: string) => {
  const body = messages
    .map((message) => {
      const text = textOf(message).trim();
      if (!text) return "";
      if (message.role === "user") return `VOCÊ: ${text}`;
      const diagnostics = describeMetadata(message.metadata);
      return `ANA: ${text}${diagnostics ? `\n${diagnostics}` : ""}`;
    })
    .filter(Boolean)
    .join("\n\n");
  return header ? `${header}\n\n${body}` : body;
};

export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
};

export const getTestToken = () =>
  typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("t") ?? "";

export const testHeaders = (): Record<string, string> => {
  const token = getTestToken();
  return token ? { "x-ana-test-token": token } : {};
};

export async function sendFeedback(body: Record<string, unknown>) {
  try {
    const response = await fetch("/api/ana-zero-feedback", {
      method: "POST",
      headers: { "content-type": "application/json", ...testHeaders() },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}
