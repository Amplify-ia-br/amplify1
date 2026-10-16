import { Check, MessageSquarePlus, ThumbsDown, ThumbsUp } from "lucide-react";
import { FormEvent, useState } from "react";

export type AnaFeedbackContext = {
  sessionId: string;
  messageId: string;
  question?: string;
  answer: string;
  model?: string;
  mode?: string;
  intent?: string;
  sources?: { id: string; title: string }[];
  generationId?: string;
};

type Rating = "up" | "down";
type Status = "idle" | "saving" | "saved" | "error";

async function sendFeedback(context: AnaFeedbackContext, rating: Rating, comment?: string) {
  const response = await fetch("/api/ana-feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...context, rating, comment: comment || undefined }),
  });
  if (!response.ok) throw new Error("feedback_failed");
}

export default function AnaFeedback({ context }: { context: AnaFeedbackContext }) {
  const [rating, setRating] = useState<Rating>();
  const [status, setStatus] = useState<Status>("idle");
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [commentSent, setCommentSent] = useState(false);

  const choose = async (next: Rating) => {
    setRating(next);
    setStatus("saving");
    if (next === "down") setCommentOpen(true);
    try {
      await sendFeedback(context, next, commentSent ? comment : undefined);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    const clean = comment.trim();
    if (!clean || !rating) return;
    setStatus("saving");
    try {
      await sendFeedback(context, rating, clean);
      setCommentSent(true);
      setCommentOpen(false);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="ana-feedback">
      <div className="ana-feedback-row" role="group" aria-label="Avaliar resposta da Ana">
        <button
          type="button"
          className={rating === "up" ? "is-active is-up" : ""}
          onClick={() => choose("up")}
          aria-pressed={rating === "up"}
          aria-label="Resposta boa"
          title="Resposta boa"
        >
          <ThumbsUp aria-hidden="true" />
        </button>
        <button
          type="button"
          className={rating === "down" ? "is-active is-down" : ""}
          onClick={() => choose("down")}
          aria-pressed={rating === "down"}
          aria-label="Resposta ruim"
          title="Resposta ruim"
        >
          <ThumbsDown aria-hidden="true" />
        </button>
        {rating && !commentOpen && (
          <button type="button" className="ana-feedback-comment-toggle" onClick={() => setCommentOpen(true)}>
            <MessageSquarePlus aria-hidden="true" /> {commentSent ? "Editar comentário" : "Comentar"}
          </button>
        )}
        <span className={`ana-feedback-status ${status === "error" ? "has-error" : ""}`} role="status">
          {status === "saving" && "Salvando…"}
          {status === "saved" && <><Check aria-hidden="true" /> Obrigado pelo feedback</>}
          {status === "error" && "Não foi possível salvar. Tente de novo."}
        </span>
      </div>

      {commentOpen && (
        <form className="ana-feedback-form" onSubmit={submitComment}>
          <label>
            <span className="sr-only">Comentário sobre a resposta</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={rating === "down"
                ? "O que estava errado ou faltando? Como a Ana deveria ter respondido?"
                : "Quer comentar algo sobre essa resposta?"}
              autoFocus
            />
          </label>
          <div>
            <button type="button" onClick={() => setCommentOpen(false)}>Cancelar</button>
            <button type="submit" disabled={!comment.trim() || status === "saving"}>Enviar comentário</button>
          </div>
        </form>
      )}
    </div>
  );
}
