import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Coins,
  Database,
  FileText,
  Gauge,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Send,
  Sparkles,
  Square,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ANA_MODELS, DEFAULT_ANA_MODEL, type AnaKnowledgeMode, type AnaModelId } from "@/lib/ana/config";
import type { AnaMessage } from "@/lib/ana/types";
import "./AnaLab.css";

const SUGGESTIONS = [
  "O que é o L.E.I.A. e para quem ele foi criado?",
  "Quais são os diferenciais da Amplify?",
  "Como funciona a metodologia da Amplify?",
];

type ToolTrace = {
  id: string;
  name: string;
  state: string;
  input?: unknown;
  output?: unknown;
};

type Source = { id: string; title: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrapStructuredOutput(output: unknown): unknown {
  if (!isRecord(output)) return output;
  if (isRecord(output.structuredContent)) return output.structuredContent;
  if (Array.isArray(output.content)) {
    const text = output.content.find((item) => isRecord(item) && item.type === "text" && typeof item.text === "string");
    if (isRecord(text) && typeof text.text === "string") {
      try { return JSON.parse(text.text); } catch { return output; }
    }
  }
  return output;
}

function extractSources(output: unknown): Source[] {
  const value = unwrapStructuredOutput(output);
  if (!isRecord(value)) return [];
  const candidates = [value.document];
  return candidates.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.id !== "string") return [];
    return [{ id: candidate.id, title: typeof candidate.title === "string" ? candidate.title : candidate.id }];
  });
}

function collectToolTraces(messages: AnaMessage[]): ToolTrace[] {
  return messages.flatMap((message) => message.parts.flatMap((part, index) => {
    const candidate = part as unknown as Record<string, unknown>;
    const type = typeof candidate.type === "string" ? candidate.type : "";
    if (type !== "dynamic-tool" && !type.startsWith("tool-")) return [];
    return [{
      id: typeof candidate.toolCallId === "string" ? candidate.toolCallId : `${message.id}-${index}`,
      name: typeof candidate.toolName === "string" ? candidate.toolName : type.replace(/^tool-/, ""),
      state: typeof candidate.state === "string" ? candidate.state : "unknown",
      input: candidate.input,
      output: candidate.output,
    }];
  }));
}

function formatDuration(value?: number) {
  if (value == null) return "—";
  return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(2)} s`;
}

function formatCost(value?: number) {
  if (value == null) return "—";
  return `US$ ${value.toFixed(6)}`;
}

function textFromMessage(message: AnaMessage) {
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
}

export default function AnaLab() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AnaKnowledgeMode>("mcp");
  const [model, setModel] = useState<AnaModelId>(DEFAULT_ANA_MODEL);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<number>();
  const [firstTokenAt, setFirstTokenAt] = useState<number>();
  const [finishedAt, setFinishedAt] = useState<number>();
  const modeRef = useRef(mode);
  const modelRef = useRef(model);
  const activeRequest = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { modelRef.current = model; }, [model]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/ana-chat",
    prepareSendMessagesRequest: ({ messages }) => ({
      body: { messages, mode: modeRef.current, model: modelRef.current },
    }),
  }), []);

  const { messages, sendMessage, setMessages, status, stop, error } = useChat<AnaMessage>({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "streaming" && activeRequest.current && firstTokenAt == null) setFirstTokenAt(Date.now());
    if ((status === "ready" || status === "error") && activeRequest.current) {
      activeRequest.current = false;
      setFinishedAt(Date.now());
    }
  }, [status, firstTokenAt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status]);

  const traces = useMemo(() => collectToolTraces(messages), [messages]);
  const sources = useMemo(() => {
    const unique = new Map<string, Source>();
    traces.flatMap((trace) => extractSources(trace.output)).forEach((source) => unique.set(source.id, source));
    return [...unique.values()];
  }, [traces]);
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const metadata = lastAssistant?.metadata;

  const submit = (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    const now = Date.now();
    activeRequest.current = true;
    setStartedAt(now);
    setFirstTokenAt(undefined);
    setFinishedAt(undefined);
    sendMessage({ text: clean });
    setInput("");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(input);
  };

  const reset = () => {
    if (busy) stop();
    setMessages([]);
    setInput("");
    setStartedAt(undefined);
    setFirstTokenAt(undefined);
    setFinishedAt(undefined);
  };

  return (
    <div className="ana-lab">
      <header className="ana-header">
        <div className="ana-brand" aria-label="Amplify Ana Lab">
          <span className="ana-mark" />
          <strong>amplify</strong>
          <span className="ana-divider" />
          <span>Ana Lab</span>
          <em>preview</em>
        </div>

        <div className="ana-controls">
          <div className="ana-mode" role="group" aria-label="Modo da base de conhecimento">
            <button className={mode === "mcp" ? "is-active" : ""} onClick={() => setMode("mcp")} type="button">MCP</button>
            <button className={mode === "direct" ? "is-active" : ""} onClick={() => setMode("direct")} type="button">Direto</button>
          </div>
          <label className="ana-model">
            <span className="sr-only">Modelo</span>
            <Sparkles aria-hidden="true" />
            <select value={model} onChange={(event) => setModel(event.target.value as AnaModelId)}>
              {Object.entries(ANA_MODELS).map(([id, option]) => (
                <option key={id} value={id}>{option.label} · {option.hint}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" />
          </label>
          <button className="ana-new" onClick={reset} type="button"><Plus aria-hidden="true" /> <span>Nova conversa</span></button>
          <button className="ana-diagnostics-toggle" onClick={() => setDiagnosticsOpen((value) => !value)} aria-label="Alternar diagnósticos" type="button">
            {diagnosticsOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </button>
        </div>
      </header>

      <div className="ana-workspace">
        <main className="ana-chat">
          <div className="ana-thread" aria-live="polite">
            {messages.length === 0 ? (
              <section className="ana-welcome">
                <div className="ana-avatar"><Bot aria-hidden="true" /></div>
                <p className="ana-eyebrow">Agente de teste · OKF Amplify</p>
                <h1>Converse com a <span>Ana</span></h1>
                <p>Faça perguntas reais e acompanhe, ao lado, como a resposta foi construída a partir da base de conhecimento.</p>
                <div className="ana-suggestions">
                  {SUGGESTIONS.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => submit(suggestion)}>{suggestion}<Send aria-hidden="true" /></button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="ana-messages">
                {messages.map((message) => {
                  const text = textFromMessage(message);
                  if (!text && message.role === "assistant") return null;
                  return (
                    <article className={`ana-message ana-message-${message.role}`} key={message.id}>
                      <div className="ana-message-label">{message.role === "user" ? "Você" : "Ana"}</div>
                      <div className="ana-message-text">{text}</div>
                    </article>
                  );
                })}
                {status === "submitted" && <div className="ana-thinking"><span /><span /><span /> Consultando a documentação</div>}
                {error && (
                  <div className="ana-error">
                    Os modelos gratuitos estão temporariamente indisponíveis. Aguarde alguns segundos e tente novamente.
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <form className="ana-composer" onSubmit={onSubmit}>
            <div>
              <textarea
                aria-label="Mensagem para Ana"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit(input);
                  }
                }}
                placeholder="Pergunte algo sobre a Amplify ou o L.E.I.A."
                rows={1}
              />
              {busy ? (
                <button type="button" onClick={stop} aria-label="Interromper resposta"><Square aria-hidden="true" /></button>
              ) : (
                <button type="submit" disabled={!input.trim()} aria-label="Enviar mensagem"><Send aria-hidden="true" /></button>
              )}
            </div>
            <p>Respostas limitadas ao conteúdo público aprovado no OKF.</p>
          </form>
        </main>

        <aside className={`ana-diagnostics ${diagnosticsOpen ? "is-open" : ""}`} aria-label="Diagnósticos da resposta">
          <div className="ana-panel-heading">
            <div><Activity aria-hidden="true" /><span>Diagnósticos</span></div>
            <button type="button" onClick={() => setDiagnosticsOpen(false)} aria-label="Fechar diagnósticos"><X /></button>
          </div>

          <section className="ana-status-card">
            <div className="ana-section-title"><CircleDot aria-hidden="true" /> Status</div>
            <div className="ana-status-row">
              <span className={`ana-status-light ${error ? "has-error" : busy ? "is-busy" : ""}`} />
              <div>
                <strong>{error ? "Erro na execução" : busy ? "Executando" : messages.length ? "Resposta concluída" : "Pronto para testar"}</strong>
                <small>{mode === "mcp" ? "MCP remoto · amplify.ia.br" : "Serviço OKF direto · preview"}</small>
              </div>
            </div>
          </section>

          <section>
            <div className="ana-section-title"><Wrench aria-hidden="true" /> Ferramentas <span>{traces.length}</span></div>
            <div className="ana-tool-list">
              {traces.length === 0 ? <p className="ana-muted">Nenhuma ferramenta chamada ainda.</p> : traces.map((trace) => (
                <details key={trace.id}>
                  <summary>
                    <span>{trace.state === "output-available" ? <Check /> : <Zap />}</span>
                    <div><strong>{trace.name}</strong><small>{trace.state.split("-").join(" ")}</small></div>
                    <ChevronDown />
                  </summary>
                  <pre>{JSON.stringify({ input: trace.input, output: unwrapStructuredOutput(trace.output) }, null, 2)}</pre>
                </details>
              ))}
            </div>
          </section>

          <section>
            <div className="ana-section-title"><Database aria-hidden="true" /> Fontes consultadas <span>{sources.length}</span></div>
            <div className="ana-source-list">
              {sources.length === 0 ? <p className="ana-muted">Os documentos usados aparecerão aqui.</p> : sources.map((source) => (
                <a href={`/knowledge/${source.id}`} target="_blank" rel="noreferrer" key={source.id}>
                  <FileText aria-hidden="true" /><span><strong>{source.title}</strong><small>{source.id}</small></span>
                </a>
              ))}
            </div>
          </section>

          <section className="ana-metrics">
            <div className="ana-section-title"><Gauge aria-hidden="true" /> Performance</div>
            <dl>
              <div><dt><Clock3 /> Primeiro token</dt><dd>{formatDuration(startedAt && firstTokenAt ? firstTokenAt - startedAt : undefined)}</dd></div>
              <div><dt><Activity /> Tempo total</dt><dd>{formatDuration(startedAt && finishedAt ? finishedAt - startedAt : undefined)}</dd></div>
              <div><dt><Zap /> Tokens</dt><dd>{metadata?.totalTokens?.toLocaleString("pt-BR") ?? "—"}</dd></div>
              <div><dt><Coins /> Custo estimado</dt><dd>{formatCost(metadata?.estimatedCostUsd)}</dd></div>
            </dl>
            <p>{metadata?.model ? ANA_MODELS[metadata.model]?.label : ANA_MODELS[model].label} · {metadata?.mode?.toUpperCase() ?? mode.toUpperCase()}</p>
            {metadata?.generationId && <code title="Generation ID do Vercel AI Gateway">{metadata.generationId}</code>}
          </section>
        </aside>
      </div>
    </div>
  );
}
