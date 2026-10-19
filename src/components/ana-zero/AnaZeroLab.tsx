import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Check, ChevronDown, ClipboardCheck, Copy, Plus, Send, Sparkles, Square } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ANA_MODELS, type AnaModelId } from "@/lib/ana/config";
import { formatAnaAssistantText } from "@/lib/ana/text";
import { MISSION_MAPPING_VERSION, recommendedMissionForProfile, TEST_MISSIONS } from "@/lib/ana-zero/missions";
import { ANA_ZERO_DEFAULT_MODEL, type AnaZeroMemoryEntry, type AnaZeroMessage } from "@/lib/ana-zero/schema";
import "../ana/AnaLab.css";
import "./AnaZeroTesting.css";
import FeedbackBar from "./FeedbackBar";
import SessionFeedback from "./SessionFeedback";
import TesterSetup from "./TesterSetup";
import { buildTranscript, copyText, describeMetadata, memoryLabel, testHeaders, textOf } from "./diagnostics";

const gatewayModels = Object.keys(ANA_MODELS) as AnaModelId[];

export default function AnaZeroLab({ account }: { account?: { name: string; profile: string } }) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [model, setModel] = useState<AnaModelId>(ANA_ZERO_DEFAULT_MODEL);
  const [tester, setTester] = useState(account?.name ?? "");
  const [missionId, setMissionId] = useState(() => recommendedMissionForProfile(account?.profile));
  const [missionOrigin, setMissionOrigin] = useState<"recommended" | "manual">(account ? "recommended" : "manual");
  const [showMissionPicker, setShowMissionPicker] = useState(!account);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [reviewing, setReviewing] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const modelRef = useRef(model);
  const testerRef = useRef(tester);
  const missionRef = useRef(missionId);
  const missionOriginRef = useRef(missionOrigin);
  const sessionRef = useRef(sessionId);
  const memoryRef = useRef<AnaZeroMemoryEntry[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { modelRef.current = model; }, [model]);
  useEffect(() => { testerRef.current = tester; }, [tester]);
  useEffect(() => { missionRef.current = missionId; }, [missionId]);
  useEffect(() => { missionOriginRef.current = missionOrigin; }, [missionOrigin]);
  useEffect(() => { sessionRef.current = sessionId; }, [sessionId]);
  useEffect(() => { setDevMode(new URLSearchParams(window.location.search).has("dev")); }, []);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/ana-zero-chat",
    prepareSendMessagesRequest: ({ messages }) => ({
      headers: testHeaders(),
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
        sessionId: sessionRef.current,
        tester: testerRef.current,
        mission: missionRef.current,
        missionOrigin: missionOriginRef.current,
        missionMappingVersion: MISSION_MAPPING_VERSION,
      },
    }),
  }), []);

  const { messages, sendMessage, setMessages, status, stop, error, clearError } = useChat<AnaZeroMessage>({ transport });
  const busy = status === "submitted" || status === "streaming";

  const mission = TEST_MISSIONS.find((item) => item.id === missionId) ?? TEST_MISSIONS[TEST_MISSIONS.length - 1];
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const memory = lastAssistant?.metadata?.memory ?? [];
  const savedTurns = messages.filter((message) => message.metadata?.saved).length;

  useEffect(() => {
    if (lastAssistant?.metadata?.memory) memoryRef.current = lastAssistant.metadata.memory;
  }, [lastAssistant?.metadata?.memory]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status, reviewing]);

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

  const copyConversation = async () => {
    const header = `TESTADOR: ${tester.trim() || "anônimo"} · MISSÃO: ${mission.title} · SESSÃO: ${sessionId}`;
    if (!(await copyText(buildTranscript(messages, header)))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    if (busy) stop();
    clearError();
    setMessages([]);
    memoryRef.current = [];
    setInput("");
    setReviewing(false);
    setSessionId(crypto.randomUUID());
    setShowMissionPicker(true);
  };

  const chooseMission = (nextMissionId: string) => {
    setMissionId(nextMissionId);
    setMissionOrigin("manual");
  };

  const invalidToken = error?.message?.includes("invalid_token");
  const labPaused = error?.message?.includes("lab_paused");

  return (
    <div className="ana-lab">
      <header className="ana-header">
        <div className="ana-brand" aria-label="Amplify Teste da Ana">
          <span className="ana-mark" />
          <strong>amplify</strong>
          <span className="ana-divider" />
          <span>Teste da Ana</span>
          <em>voluntários</em>
        </div>
        <div className="ana-controls">
          {devMode && (
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
          )}
          <button
            className="ana-new"
            onClick={() => setReviewing(true)}
            type="button"
            disabled={savedTurns === 0 || reviewing}
            aria-label="Avaliar a conversa inteira"
          >
            <ClipboardCheck aria-hidden="true" />
            <span>Finalizar teste</span>
          </button>
          <button
            className="ana-new"
            onClick={copyConversation}
            type="button"
            disabled={messages.length === 0}
            aria-label="Copiar conversa com diagnósticos"
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copied ? "Copiado" : "Copiar conversa"}</span>
          </button>
          <button className="ana-new" onClick={reset} type="button"><Plus aria-hidden="true" /> <span>Nova conversa</span></button>
        </div>
      </header>

      <div className="ana-workspace">
        <main className="ana-chat">
          <div className="ana-thread" aria-live="polite">
            {messages.length === 0 ? (
              <section className="ana-welcome">
                <div className="ana-avatar"><Bot aria-hidden="true" /></div>
                <p className="ana-eyebrow">Teste com voluntários · Amplify</p>
                <h1>Converse com a <span>Ana</span></h1>
                <p>Simule uma necessidade real, faça de 3 a 5 perguntas e avalie as respostas. Leva cerca de 5 minutos.</p>
                <ol className="az-test-guide" aria-label="Como participar do teste">
                  <li><b>1</b><span>Use o cenário abaixo como ponto de partida.</span></li>
                  <li><b>2</b><span>Converse naturalmente e tente atingir o objetivo.</span></li>
                  <li><b>3</b><span>Avalie cada resposta e finalize o teste no topo.</span></li>
                </ol>
                <TesterSetup
                  tester={tester}
                  showName={!account}
                  missionId={missionId}
                  onTesterChange={setTester}
                  onMissionChange={chooseMission}
                  recommended={Boolean(account) && !showMissionPicker}
                  onChooseOther={() => setShowMissionPicker(true)}
                />
                <p className="az-consent">
                  As conversas de teste são gravadas, junto com o seu feedback, para melhorar a Ana. Não escreva dados
                  pessoais sensíveis (CPF, senhas, documentos). Nenhum contato é enviado para o time comercial.
                </p>
              </section>
            ) : (
              <div className="ana-messages">
                <p className="az-mission-banner">
                  <strong>Cenário em teste: {mission.title}</strong>
                  <span>{mission.brief}</span>
                </p>
                {messages.map((message) => {
                  const text = message.role === "assistant" ? formatAnaAssistantText(textOf(message)) : textOf(message);
                  if (!text) return null;
                  const metadata = message.metadata;
                  const diagnostics = message.role === "assistant" ? describeMetadata(metadata) : "";
                  return (
                    <article className={`ana-message ana-message-${message.role}`} key={message.id}>
                      <div className="ana-message-label">{message.role === "user" ? "Você" : "Ana"}</div>
                      <div className="ana-message-text">{text}</div>
                      {message.role === "assistant" && metadata?.turnIndex != null && (
                        metadata.saved ? (
                          <FeedbackBar key={`${sessionId}-${metadata.turnIndex}`} sessionId={sessionId} turnIndex={metadata.turnIndex} />
                        ) : (
                          <p className="az-unsaved">Esta resposta não foi gravada, então não dá para avaliá-la.</p>
                        )
                      )}
                      {diagnostics && (
                        <details className="az-details">
                          <summary>Detalhes técnicos</summary>
                          <p>{diagnostics}</p>
                        </details>
                      )}
                    </article>
                  );
                })}
                {busy && <div className="ana-thinking"><span /><span /><span /> Pensando</div>}
                {error && (
                  <div className="ana-error" role="alert">
                    {invalidToken
                      ? "Este link de teste não é válido. Peça um novo link para quem convidou você."
                      : labPaused
                        ? "Os testes estão pausados no momento. Tente novamente mais tarde."
                        : "Não foi possível responder agora."}
                  </div>
                )}
                {reviewing && <SessionFeedback sessionId={sessionId} onClose={() => setReviewing(false)} />}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {memory.length > 0 && (
            <p className="az-memory" aria-label="O que a Ana lembra sobre você">
              <b>A Ana lembra:</b>
              {memory.map((entry) => (
                <span key={`${entry.key}-${entry.value}`}>{memoryLabel(entry.key)}: {entry.value}</span>
              ))}
            </p>
          )}

          <form className="ana-composer" onSubmit={onSubmit}>
            <div>
              <textarea
                aria-label="Mensagem para a Ana"
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
            <p>Ambiente de teste. A conversa e o feedback são gravados para melhorar a Ana.</p>
          </form>
        </main>
      </div>
    </div>
  );
}
