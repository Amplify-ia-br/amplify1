import { Star } from "lucide-react";
import { useState } from "react";
import { sendFeedback } from "./diagnostics";

type Props = {
  sessionId: string;
  onClose: () => void;
};

export default function SessionFeedback({ sessionId, onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [helped, setHelped] = useState<boolean | undefined>();
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async () => {
    setStatus("sending");
    const ok = await sendFeedback({
      kind: "session",
      sessionId,
      rating,
      helped,
      comment: comment.trim() || undefined,
    });
    setStatus(ok ? "sent" : "error");
  };

  if (status === "sent") {
    return (
      <section className="az-session" role="status">
        <strong>Obrigado pelo feedback.</strong>
        <p>Você pode continuar a conversa ou começar outra missão em &quot;Nova conversa&quot;.</p>
        <button type="button" className="az-submit" onClick={onClose}>Fechar</button>
      </section>
    );
  }

  return (
    <section className="az-session" aria-labelledby="az-session-title">
      <h2 id="az-session-title">Como foi a conversa inteira?</h2>
      <div className="az-stars" role="radiogroup" aria-label="Nota de 1 a 5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} de 5`}
            className={value <= rating ? "is-on" : undefined}
            onClick={() => setRating(value)}
          >
            <Star aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="az-yesno" role="radiogroup" aria-label="A conversa te ajudou?">
        <span>Isso te ajudou?</span>
        <button type="button" role="radio" aria-checked={helped === true} onClick={() => setHelped(true)}>Sim</button>
        <button type="button" role="radio" aria-checked={helped === false} onClick={() => setHelped(false)}>Não</button>
      </div>
      <textarea
        aria-label="Comentário sobre a conversa"
        value={comment}
        maxLength={2000}
        rows={3}
        placeholder="Onde a Ana foi bem, onde falhou, o que faltou? (opcional)"
        onChange={(event) => setComment(event.target.value)}
      />
      {status === "error" && <p role="alert" className="az-bad">Não foi possível enviar. Tente de novo.</p>}
      <div className="az-session-actions">
        <button type="button" className="az-submit" disabled={rating === 0 || status === "sending"} onClick={() => void submit()}>
          Enviar avaliação
        </button>
        <button type="button" className="az-link" onClick={onClose}>Agora não</button>
      </div>
    </section>
  );
}
