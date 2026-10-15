import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { FEEDBACK_REASONS, type FeedbackReason } from "@/lib/ana-zero/schema";
import { sendFeedback } from "./diagnostics";

const reasonLabels: Record<FeedbackReason, string> = {
  robotica: "Robótica",
  repetitiva: "Repetitiva",
  errou_fato: "Errou um fato",
  pergunta_desnecessaria: "Pergunta desnecessária",
  travou: "Conversa travou",
  tom: "Tom estranho",
};

type Props = {
  sessionId: string;
  turnIndex: number;
};

type Status = "idle" | "sending" | "sent" | "error";

export default function FeedbackBar({ sessionId, turnIndex }: Props) {
  const [verdict, setVerdict] = useState<1 | -1 | null>(null);
  const [reasons, setReasons] = useState<FeedbackReason[]>([]);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (nextVerdict: 1 | -1, nextReasons: FeedbackReason[], nextComment: string) => {
    setStatus("sending");
    const ok = await sendFeedback({
      kind: "turn",
      sessionId,
      turnIndex,
      verdict: nextVerdict,
      reasons: nextVerdict === -1 ? nextReasons : [],
      comment: nextComment.trim() || undefined,
    });
    setStatus(ok ? "sent" : "error");
  };

  const choose = (nextVerdict: 1 | -1) => {
    setVerdict(nextVerdict);
    setStatus("idle");
    if (nextVerdict === 1) void submit(1, [], "");
  };

  const toggleReason = (reason: FeedbackReason) =>
    setReasons((current) => (current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]));

  return (
    <div className="az-feedback">
      <div className="az-feedback-row" role="group" aria-label="Avaliar esta resposta">
        <button type="button" aria-pressed={verdict === 1} aria-label="Resposta boa" onClick={() => choose(1)}>
          <ThumbsUp aria-hidden="true" />
        </button>
        <button type="button" aria-pressed={verdict === -1} aria-label="Resposta ruim" onClick={() => choose(-1)}>
          <ThumbsDown aria-hidden="true" />
        </button>
        {status === "sending" && <span role="status">Enviando…</span>}
        {status === "sent" && (
          <span role="status" className="az-ok"><Check aria-hidden="true" /> Registrado</span>
        )}
        {status === "error" && <span role="alert" className="az-bad">Não foi possível registrar. Tente de novo.</span>}
      </div>

      {verdict === -1 && status !== "sent" && (
        <div className="az-feedback-detail">
          <div className="az-chips" role="group" aria-label="O que deu errado">
            {FEEDBACK_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                aria-pressed={reasons.includes(reason)}
                onClick={() => toggleReason(reason)}
              >
                {reasonLabels[reason]}
              </button>
            ))}
          </div>
          <textarea
            aria-label="Comentário sobre a resposta"
            value={comment}
            maxLength={2000}
            rows={2}
            placeholder="O que a Ana deveria ter dito? (opcional)"
            onChange={(event) => setComment(event.target.value)}
          />
          <button
            type="button"
            className="az-submit"
            disabled={status === "sending" || (reasons.length === 0 && !comment.trim())}
            onClick={() => void submit(-1, reasons, comment)}
          >
            Enviar feedback
          </button>
        </div>
      )}
    </div>
  );
}
