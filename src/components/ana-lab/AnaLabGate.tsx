import { useEffect, useState } from "react";
import AnaZeroLab from "@/components/ana-zero/AnaZeroLab";
import "../ana/AnaLab.css";
import "./AnaLabAccess.css";

type Gate = { phase: "loading" } | { phase: "denied" } | { phase: "unavailable" } | { phase: "ready"; name: string };

export default function AnaLabGate() {
  const [gate, setGate] = useState<Gate>({ phase: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ana-lab?me=1", { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return setGate({ phase: "denied" });
        if (!response.ok) return setGate({ phase: "unavailable" });
        const data = (await response.json()) as { tester: { name: string } };
        setGate({ phase: "ready", name: data.tester.name });
      })
      .catch((cause: unknown) => {
        if ((cause as { name?: string }).name !== "AbortError") setGate({ phase: "unavailable" });
      });
    return () => controller.abort();
  }, []);

  if (gate.phase === "ready") return <AnaZeroLab account={{ name: gate.name }} />;
  if (gate.phase === "loading") return <div className="alx-center">Carregando...</div>;

  return (
    <main className="alx-page">
      <div className="alx-card">
        <div className="alx-brand" aria-label="Amplify">
          <i />
          <strong>amplify</strong>
        </div>
        <h1>Teste da <span>Ana</span></h1>
        <p className="alx-notice" role="alert">
          {gate.phase === "denied"
            ? "O acesso é por convite. Abra o link que você recebeu da equipe da Amplify. Se já fez o cadastro e voltou aqui, use o mesmo link e o mesmo e-mail para entrar de novo."
            : "Não foi possível verificar seu acesso agora. Recarregue a página em instantes."}
        </p>
      </div>
    </main>
  );
}
