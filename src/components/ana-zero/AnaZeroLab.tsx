import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, ChevronDown, Plus, Send, Sparkles, Square } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ANA_MODELS, type AnaModelId } from "@/lib/ana/config";
import { formatAnaAssistantText } from "@/lib/ana/text";
import { ANA_ZERO_DEFAULT_MODEL, type AnaZeroMemoryEntry, type AnaZeroMessage } from "@/lib/ana-zero/schema";
import "../ana/AnaLab.css";

const gatewayModels = (Object.keys(ANA_MODELS) as AnaModelId[]).filter((id) => ANA_MODELS[id].provider === "gateway");

const textOf = (message: AnaZeroMessage) =>
  message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");

export default function AnaZeroLab() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<AnaModelId>(ANA_ZERO_DEFAULT_MODEL);
  const modelRef = useRef(model);
  const memoryRef = useRef<AnaZeroMemoryEntry[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { modelRef.current = model; }, [model]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/ana-zero-chat",
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        messages: messages
          .map((message) => ({
            id: message.id,
            role: message.role,
            parts: [{ type: "text" as const, text: textOf(message as AnaZeroMessage) }],
          }))
          .filter((message) => message.parts[0].text.trim() && (message.role === "user" || message.role === "assistant")),
        memory: memoryRef.current,
        model: modelRef.current,
      },
    }),
  }), []);

  const { messages, sendMessage, setMessages, status, stop, error, clearError } = useChat<AnaZeroMessage>({ transport });
  const busy = status === "submitted" || status === "streaming";

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const metadata = lastAssistant?.metadata;
  useEffect(() => {
    if (metadata?.memory) memoryRef.current = metadata.memory;
  }, [metadata?.memory]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status]);

  const submit = (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    clearError();
    sendMessage({ text: clean });
    setInput("");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(input);
  };

  const reset = () => {
    if (busy) stop();
    clearError();
    setMessages([]);
    memoryRef.current = [];
    setInput("");
  };

  return (
    <div className="ana-lab">
      <header className="ana-header">
        <div className="ana-brand" aria-label="Amplify Ana Zero">
          <span className="ana-mark" />
          <strong>amplify</strong>
          <span className="ana-divider" />
          <span>Ana Zero</span>
          <em>experimento</em>
        </div>
        <div className="ana-controls">
          <label className="ana-model">
            <span className="sr-only">Modelo</span>
            <Sparkles aria-hidden="true" />
            <select value={model} onChange={(event) => setModel(event.target.value as AnaModelId)}>
              {gatewayModels.map((id) => (
                <option key={id} value={id}>{ANA_MODELS[id].label} · {ANA_MODELS[id].hint}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" />
          </label>
          <button className="ana-new" onClick={reset} type="button"><Plus aria-hidden="true" /> <span>Nova conversa</span></button>
        </div>
      </header>

      <div className="ana-workspace">
        <main className="ana-chat">
          <div className="ana-thread" aria-live="polite">
            {messages.length === 0 ? (
              <section className="ana-welcome">
                <div className="ana-avatar"><Bot aria-hidden="true" /></div>
                <p className="ana-eyebrow">Protótipo · agente único com histórico completo</p>
                <h1>Converse com a <span>Ana Zero</span></h1>
                <p>Sem controlador de regras: o modelo vê a conversa inteira e usa ferramentas para consultar a base e registrar fatos.</p>
              </section>
            ) : (
              <div className="ana-messages">
                {messages.map((message) => {
                  const text = message.role === "assistant" ? formatAnaAssistantText(textOf(message)) : textOf(message);
                  if (!text) return null;
                  return (
                    <article className={`ana-message ana-message-${message.role}`} key={message.id}>
                      <div className="ana-message-label">{message.role === "user" ? "Você" : "Ana"}</div>
                      <div className="ana-message-text">{text}</div>
                    </article>
                  );
                })}
                {busy && <div className="ana-thinking"><span /><span /><span /> Pensando</div>}
                {error && <div className="ana-error">Não foi possível responder agora.</div>}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {metadata && (
            <p className="ana-muted" style={{ padding: "0 1.5rem" }}>
              {metadata.resolvedModel} · ferramentas: {metadata.toolCalls?.length ? metadata.toolCalls.join(", ") : "nenhuma"}
              {metadata.memory?.length ? ` · memória: ${metadata.memory.map((entry) => `${entry.key}=${entry.value}`).join("; ")}` : ""}
              {metadata.handoff ? " · pedido de contato registrado" : ""}
              {metadata.regenerated ? " · regenerada" : ""}
              {metadata.issues?.length ? ` · validações: ${metadata.issues.join(", ")}` : ""}
  {metadata.errors?.length ? ` · erro técnico: ${metadata.errors.join(" | ")}` : ""}
              {metadata.estimatedCostUsd != null ? ` · US$ ${metadata.estimatedCostUsd.toFixed(5)}` : ""}
            </p>
          )}

          <form className="ana-composer" onSubmit={onSubmit}>
            <div>
              <textarea
                aria-label="Mensagem para Ana Zero"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                    event.preventDefault();
                    submit(input);
                  }
                }}
                placeholder="Escreva como escreveria no site"
                rows={1}
              />
              {busy ? (
                <button type="button" onClick={stop} aria-label="Interromper resposta"><Square aria-hidden="true" /></button>
              ) : (
                <button type="submit" disabled={!input.trim()} aria-label="Enviar mensagem"><Send aria-hidden="true" /></button>
              )}
            </div>
            <p>Experimento isolado. Nada é gravado no banco e nenhum contato é enviado.</p>
          </form>
        </main>
      </div>
    </div>
  );
}
