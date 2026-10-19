import { FormEvent, useEffect, useState } from "react";
import { CONSENT_TEXT, LAB_PROFILES } from "@/lib/ana-zero/lab/profiles";
import "../ana/AnaLab.css";
import "../ana-zero/AnaZeroTesting.css";
import "./AnaLabAccess.css";

type InviteState =
  | { phase: "loading" }
  | { phase: "ready"; used: boolean }
  | { phase: "blocked"; message: string }
  | { phase: "unavailable" };

const BLOCKED_MESSAGES: Record<string, string> = {
  not_found: "Convite não encontrado. Confira se o link está completo.",
  revoked: "Este convite foi revogado. Peça um novo link para quem convidou você.",
  expired: "Este convite expirou. Peça um novo link para quem convidou você.",
};

const SIGNUP_ERRORS: Record<string, string> = {
  invite_used: "Este convite já foi usado com outro e-mail. Se foi você, digite o mesmo e-mail do primeiro cadastro.",
  invite_revoked: "Este convite ou o seu acesso foi revogado.",
  invite_expired: "Este convite expirou.",
  invite_not_found: "Convite não encontrado.",
  rate_limited: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
};

export default function AnaLabSignup({ code }: { code: string }) {
  const [invite, setInvite] = useState<InviteState>({ phase: "loading" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState("");
  const [organization, setOrganization] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/ana-lab?invite=${encodeURIComponent(code)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return setInvite({ phase: "unavailable" });
        const data = (await response.json()) as { status: string; label?: string; email?: string };
        if (data.status === "ok" || data.status === "used") {
          if (data.label) setName(data.label);
          if (data.email) setEmail(data.email);
          return setInvite({ phase: "ready", used: data.status === "used" });
        }
        setInvite({ phase: "blocked", message: BLOCKED_MESSAGES[data.status] ?? BLOCKED_MESSAGES.not_found });
      })
      .catch((cause: unknown) => {
        if ((cause as { name?: string }).name !== "AbortError") setInvite({ phase: "unavailable" });
      });
    return () => controller.abort();
  }, [code]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/ana-lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name, email, profile, organization: organization || undefined, consent }),
      });
      if (response.ok) {
        window.location.assign("/ana-lab");
        return;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(SIGNUP_ERRORS[data.error ?? ""] ?? "Não foi possível concluir o cadastro. Confira os dados e tente de novo.");
    } catch {
      setError("Sem conexão no momento. Tente de novo.");
    }
    setSubmitting(false);
  };

  const canSubmit = name.trim().length >= 2 && email.includes("@") && profile && consent && !submitting;

  return (
    <main className="alx-page">
      <div className="alx-card">
        <div className="alx-brand" aria-label="Amplify">
          <i />
          <strong>amplify</strong>
        </div>
        <h1>Teste da <span>Ana</span></h1>

        {invite.phase === "loading" && <p className="alx-lead">Verificando seu convite...</p>}
        {invite.phase === "unavailable" && (
          <p className="alx-notice" role="alert">Não foi possível verificar o convite agora. Tente de novo em instantes.</p>
        )}
        {invite.phase === "blocked" && <p className="alx-notice" role="alert">{invite.message}</p>}

        {invite.phase === "ready" && (
          <>
            <p className="alx-lead">
              {invite.used
                ? "Este convite já foi usado. Se foi você, digite o mesmo e-mail do primeiro cadastro para entrar de novo."
                : "Você foi convidado para testar a Ana, a assistente da Amplify. Faça seu cadastro para começar. Leva menos de um minuto."}
            </p>
            <form className="alx-form" onSubmit={onSubmit}>
              {error && <p className="alx-error" role="alert">{error}</p>}
              <label className="az-field">
                <span>Nome</span>
                <input type="text" value={name} maxLength={80} autoComplete="name" required onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="az-field">
                <span>E-mail</span>
                <input type="email" value={email} maxLength={160} autoComplete="email" required onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="az-field">
                <span>Seu perfil</span>
                <select value={profile} required onChange={(event) => setProfile(event.target.value)}>
                  <option value="" disabled>Selecione</option>
                  {LAB_PROFILES.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="az-field">
                <span>Escola ou empresa (opcional)</span>
                <input type="text" value={organization} maxLength={120} autoComplete="organization" onChange={(event) => setOrganization(event.target.value)} />
              </label>
              <label className="alx-consent">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span>{CONSENT_TEXT}</span>
              </label>
              <button className="alx-submit" type="submit" disabled={!canSubmit}>
                {submitting ? "Entrando..." : "Concordar e começar"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
