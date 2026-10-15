import { useEffect, useMemo, useState } from "react";
import { Heart, LogIn, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type SelectionAnchor = { exact: string; prefix: string; suffix: string; heading: string | null };
type Annotation = {
  id: string;
  kind: "like" | "comment" | "suggestion";
  exact_quote: string;
  body: string | null;
  suggested_text: string | null;
  status: string;
  created_at: string;
};

export default function KnowledgeAnnotations({ okfId, returnTo }: { okfId: string; returnTo: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [documentRow, setDocumentRow] = useState<{ id: string; published_revision_id: string | null } | null>(null);
  const [selection, setSelection] = useState<SelectionAnchor | null>(null);
  const [mode, setMode] = useState<"actions" | "comment" | "suggestion">("actions");
  const [body, setBody] = useState("");
  const [suggestedText, setSuggestedText] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    db.from("knowledge_documents")
      .select("id, published_revision_id")
      .eq("okf_id", okfId)
      .maybeSingle()
      .then(({ data }: any) => setDocumentRow(data ?? null));
  }, [okfId, userId]);

  useEffect(() => {
    if (!documentRow) return;
    db.from("knowledge_annotations")
      .select("id, kind, exact_quote, body, suggested_text, status, created_at")
      .eq("document_id", documentRow.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }: any) => setAnnotations(data ?? []));
  }, [documentRow]);

  useEffect(() => {
    const capture = () => {
      const browserSelection = window.getSelection();
      const exact = browserSelection?.toString().trim() ?? "";
      if (!browserSelection || !exact || exact.length > 4000) return;
      const root = document.querySelector<HTMLElement>(".knowledge-prose");
      const anchorElement = browserSelection.anchorNode?.parentElement;
      if (!root || !anchorElement || !root.contains(anchorElement)) return;
      const fullText = root.innerText;
      const index = fullText.indexOf(exact);
      const sectionHeading = anchorElement.closest("section")?.querySelector("h2,h3") ?? null;
      const previousHeading = anchorElement.previousElementSibling?.matches("h2,h3") ? anchorElement.previousElementSibling : null;
      const headingElement = sectionHeading ?? previousHeading;
      setSelection({
        exact,
        prefix: index >= 0 ? fullText.slice(Math.max(0, index - 80), index) : "",
        suffix: index >= 0 ? fullText.slice(index + exact.length, index + exact.length + 80) : "",
        heading: headingElement?.textContent?.trim() || null,
      });
      setMode("actions");
      setBody("");
      setSuggestedText(exact);
    };
    document.addEventListener("mouseup", capture);
    document.addEventListener("touchend", capture);
    return () => { document.removeEventListener("mouseup", capture); document.removeEventListener("touchend", capture); };
  }, []);

  const likeCount = useMemo(() => annotations.filter((annotation) => annotation.kind === "like").length, [annotations]);

  const submit = async (kind: "like" | "comment" | "suggestion") => {
    if (!selection || !userId || !documentRow) return;
    if (kind !== "like" && !body.trim()) return;
    setSaving(true);
    const { data, error } = await db.from("knowledge_annotations").insert({
      document_id: documentRow.id,
      revision_id: documentRow.published_revision_id,
      user_id: userId,
      kind,
      exact_quote: selection.exact,
      prefix_text: selection.prefix,
      suffix_text: selection.suffix,
      heading: selection.heading,
      body: kind === "like" ? null : body.trim(),
      suggested_text: kind === "suggestion" ? suggestedText.trim() : null,
    }).select("id, kind, exact_quote, body, suggested_text, status, created_at").single();
    setSaving(false);
    if (error) {
      if (error.code === "23505") setSelection(null);
      return;
    }
    setAnnotations((current) => [data, ...current]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  if (!selection && annotations.length === 0) return <p className="kb-annotation-hint">Selecione um trecho para curtir, comentar ou sugerir uma alteração.</p>;

  return <>
    {annotations.length > 0 && <section className="kb-annotation-list" aria-label="Comentários e sugestões">
      <div><MessageCircle aria-hidden="true" /><strong>Conversas sobre este documento</strong></div>
      {annotations.filter((annotation) => annotation.kind !== "like").map((annotation) => <article key={annotation.id}>
        <small>{annotation.kind === "suggestion" ? "Sugestão" : "Comentário"} · {new Date(annotation.created_at).toLocaleDateString("pt-BR")}</small>
        <blockquote>{annotation.exact_quote}</blockquote>
        <p>{annotation.body}</p>
        {annotation.suggested_text && <div className="kb-suggested"><span>Texto sugerido</span>{annotation.suggested_text}</div>}
      </article>)}
    </section>}

    {selection && <div className="kb-annotation-composer" role="dialog" aria-label="Interagir com o trecho selecionado">
      <button className="kb-annotation-close" onClick={() => setSelection(null)} aria-label="Fechar"><X /></button>
      <blockquote>{selection.exact}</blockquote>
      {!userId ? <a className="kb-annotation-login" href={`/auth?from=${encodeURIComponent(returnTo)}`}><LogIn />Entre para comentar ou sugerir</a> : !documentRow ? <p>Este documento ainda precisa ser sincronizado com a governança no Admin.</p> : mode === "actions" ? <div className="kb-annotation-actions">
        <button onClick={() => submit("like")} disabled={saving}><Heart />Curtir {likeCount > 0 && `(${likeCount})`}</button>
        <button onClick={() => setMode("comment")}><MessageCircle />Comentar</button>
        <button onClick={() => setMode("suggestion")}><Sparkles />Sugerir alteração</button>
      </div> : <div className="kb-annotation-form">
        <label>{mode === "suggestion" ? "Por que alterar?" : "Comentário"}<textarea value={body} onChange={(event) => setBody(event.target.value)} autoFocus /></label>
        {mode === "suggestion" && <label>Texto sugerido<textarea value={suggestedText} onChange={(event) => setSuggestedText(event.target.value)} /></label>}
        <div><button onClick={() => setMode("actions")}>Voltar</button><button onClick={() => submit(mode)} disabled={saving || !body.trim()}><Send />Enviar</button></div>
      </div>}
    </div>}
  </>;
}
