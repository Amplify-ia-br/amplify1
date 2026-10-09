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
  Eye,
  EyeOff,
  KeyRound,
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
import type { AnaRetrievalTrace } from "@/lib/ana/retrieval";
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

function retrievalFromMessage(message?: AnaMessage): AnaRetrievalTrace | undefined {
  const part = message?.parts.find((candidate) => candidate.type === "data-retrieval");
  return part?.type === "data-retrieval" ? part.data : undefined;
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

function cleanAssistantText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/L\s*\.\s*E\s*\.\s*I\s*\.\s*A\s*\.?/gi, "L.E.I.A.")
    .replace(/([.!?])(?=[A-ZÀ-Ý])/g, "$1 ")
    .trim();
}

export default function AnaLab() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [mode, setMode] = useState<AnaKnowledgeMode>("mcp");
  const [model, setModel] = useState<AnaModelId>(DEFAULT_ANA_MODEL);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyError, setKeyError] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<number>();
  const [firstTokenAt, setFirstTokenAt] = useState<number>();
  const [finishedAt, setFinishedAt] = useState<number>();
  const modeRef = useRef(mode);
  const modelRef = useRef(model);
  const apiKeyRef = useRef(apiKey);
  const conversationIdRef = useRef(conversationId);
  const activeRequest = useRef(false);
  const assistantCountAtStart = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { modelRef.current = model; }, [model]);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/ana-chat",
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        messages,
        mode: modeRef.current,
        model: modelRef.current,
        conversationId: conversationIdRef.current,
        pagePath: "/lab/ana",
        ...(ANA_MODELS[modelRef.current].provider === "anthropic"
          ? { apiKey: apiKeyRef.current }
          : {}),
      },
    }),
  }), []);

  const { messages, sendMessage, setMessages, status, stop, error, clearError } = useChat<AnaMessage>({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const assistantMessages = messages.filter((message) => message.role === "assistant");
    const latestText = assistantMessages.length > assistantCountAtStart.current
      ? textFromMessage(assistantMessages[assistantMessages.length - 1])
      : "";
    if (latestText && activeRequest.current && firstTokenAt == null) setFirstTokenAt(Date.now());
    if ((status === "ready" || status === "error") && activeRequest.current) {
      activeRequest.current = false;
      setFinishedAt(Date.now());
    }
  }, [messages, status, firstTokenAt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status]);

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const retrieval = retrievalFromMessage(lastAssistant);
  const usedKnowledgeTool = Boolean(
    retrieval && (retrieval.documents.length || retrieval.ranked.length || retrieval.listMs || retrieval.fetchMs),
  );
  const traces: ToolTrace[] = retrieval && usedKnowledgeTool ? [{
    id: `retrieval-${lastAssistant?.id}`,
    name: "retrieve_knowledge",
    state: "output-available",
    input: { query: retrieval.query, intent: retrieval.intent, mode: retrieval.mode },
    output: { ranked: retrieval.ranked, documents: retrieval.documents.map(({ id, title }) => ({ id, title })) },
  }] : [];
  const sources: Source[] = retrieval?.documents.map(({ id, title }) => ({ id, title })) ?? [];
  const metadata = lastAssistant?.metadata;
  const conversationStageLabel = metadata?.conversationStage ? {
    opening: "abertura",
    discovery: "descoberta",
    solution: "solução",
    qualification: "qualificação",
    contact: "contato",
    handoff: "encaminhamento",
    closing: "encerramento",
  }[metadata.conversationStage] : undefined;
  const turnKindLabel = metadata?.turnKind ? {
    greeting: "cumprimento",
    acknowledgement: "confirmação",
    gratitude: "agradecimento",
    farewell: "despedida",
    disclosure: "contexto",
    request: "pergunta",
  }[metadata.turnKind] : undefined;
  const leadStageLabel = metadata?.leadStage ? {
    engaged: "engajado",
    qualifying: "em qualificação",
    qualified: "qualificado",
    meeting_requested: "reunião solicitada",
    handoff: "encaminhamento pronto",
    nurture: "nutrição",
  }[metadata.leadStage] : undefined;
  const nextQuestionLabel = metadata?.nextQuestionKey ? {
    need: "necessidade",
    grades: "séries atendidas",
    students: "número de estudantes",
    internet: "infraestrutura",
    timeline: "prazo",
    contact: "contato consentido",
  }[metadata.nextQuestionKey] : undefined;
  const assistantText = lastAssistant ? textFromMessage(lastAssistant) : "";
  const completedWithoutText = Boolean(
    lastAssistant && retrieval && status === "ready" && finishedAt && !assistantText,
  );
  const degraded = Boolean((error || completedWithoutText) && retrieval?.fallbackText && !assistantText);
  const selectedModel = ANA_MODELS[model];
  const requiresApiKey = selectedModel.provider === "anthropic";

  const submit = (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    if (requiresApiKey && !apiKey.trim()) {
      setKeyError(true);
      return;
    }
    setKeyError(false);
    clearError();
    const now = Date.now();
    activeRequest.current = true;
    assistantCountAtStart.current = messages.filter((message) => message.role === "assistant").length;
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
    clearError();
    setMessages([]);
    const nextConversationId = crypto.randomUUID();
    conversationIdRef.current = nextConversationId;
    setConversationId(nextConversationId);
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
            <select value={model} onChange={(event) => {
              setModel(event.target.value as AnaModelId);
              setKeyError(false);
            }}>
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
        <main className={`ana-chat ${requiresApiKey ? "has-byok" : ""}`}>
          {requiresApiKey && (
            <section className="ana-byok" aria-label="Chave Anthropic da sessão">
              <div className="ana-byok-copy">
                <KeyRound aria-hidden="true" />
                <span><strong>Chave Anthropic</strong><small>Usada só nesta aba; o backend encaminha à Anthropic sem armazenar.</small></span>
              </div>
              <label className={keyError ? "has-error" : ""}>
                <span className="sr-only">Chave de API da Anthropic</span>
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    setKeyError(false);
                  }}
                  placeholder="sk-ant-…"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((value) => !value)}
                  aria-label={showApiKey ? "Ocultar chave" : "Mostrar chave"}
                >
                  {showApiKey ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </label>
              {apiKey && <button className="ana-byok-clear" type="button" onClick={() => setApiKey("")}>Limpar</button>}
              {keyError && <p role="alert">Informe sua chave Anthropic para testar este modelo.</p>}
            </section>
          )}
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
                  const text = message.role === "assistant"
                    ? cleanAssistantText(textFromMessage(message))
                    : textFromMessage(message);
                  if (!text && message.role === "assistant") return null;
                  return (
                    <article className={`ana-message ana-message-${message.role}`} key={message.id}>
                      <div className="ana-message-label">{message.role === "user" ? "Você" : "Ana"}</div>
                      <div className="ana-message-text">{text}</div>
                    </article>
                  );
                })}
                {busy && !assistantText && <div className="ana-thinking"><span /><span /><span /> Consultando a documentação</div>}
                {degraded && (
                  <article className="ana-message ana-message-assistant ana-message-degraded">
                    <div className="ana-message-label">Ana</div>
                    <div className="ana-message-text">
                      {retrieval?.fallbackText}
                      <small>Resposta básica da documentação · modelo temporariamente indisponível</small>
                    </div>
                  </article>
                )}
                {error && !degraded && <div className="ana-error">Não foi possível consultar a documentação agora.</div>}
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
                <button type="submit" disabled={!input.trim() || (requiresApiKey && !apiKey.trim())} aria-label="Enviar mensagem"><Send aria-hidden="true" /></button>
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
              <span className={`ana-status-light ${degraded ? "is-degraded" : error ? "has-error" : busy ? "is-busy" : ""}`} />
              <div>
                <strong>{degraded ? "Modo degradado" : error ? "Erro na execução" : busy ? "Executando" : assistantText ? "Resposta concluída" : "Pronto para testar"}</strong>
                <small>{requiresApiKey ? "Anthropic direto · BYOK da sessão" : mode === "mcp" ? "MCP remoto · amplify.ia.br" : "Serviço OKF direto · preview"}</small>
                {conversationStageLabel && <small>Estado: {conversationStageLabel} · {turnKindLabel}</small>}
                {leadStageLabel && <small>Lead: {leadStageLabel} · qualificação {metadata?.qualificationScore ?? 0}%</small>}
                {nextQuestionLabel && <small>Próximo dado: {nextQuestionLabel}</small>}
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
                  <pre>{JSON.stringify({ input: trace.input, output: trace.output }, null, 2)}</pre>
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
              <div><dt><Database /> Recuperação</dt><dd>{formatDuration(retrieval?.totalMs)}</dd></div>
              <div><dt><Clock3 /> Primeiro token</dt><dd>{formatDuration(startedAt && firstTokenAt ? firstTokenAt - startedAt : undefined)}</dd></div>
              <div><dt><Activity /> Tempo total</dt><dd>{formatDuration(startedAt && finishedAt ? finishedAt - startedAt : undefined)}</dd></div>
              <div><dt><Zap /> Tokens</dt><dd>{metadata?.totalTokens?.toLocaleString("pt-BR") ?? "—"}</dd></div>
              <div><dt><Coins /> Custo estimado</dt><dd>{formatCost(metadata?.estimatedCostUsd)}</dd></div>
            </dl>
            <p>{metadata?.resolvedModel ?? (metadata?.model ? ANA_MODELS[metadata.model]?.label : ANA_MODELS[model].label)} · {metadata?.mode?.toUpperCase() ?? mode.toUpperCase()}</p>
            {metadata?.generationId && <code title="Generation ID do Vercel AI Gateway">{metadata.generationId}</code>}
          </section>
        </aside>
      </div>
    </div>
  );
}
