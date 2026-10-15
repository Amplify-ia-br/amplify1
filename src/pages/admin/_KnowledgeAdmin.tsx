import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BookOpenCheck, CheckCircle2, CloudDownload, FileClock, FilePlus2,
  Loader2, RefreshCw, Settings2, ShieldCheck, Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  extractGoogleDocId, googleDocumentToMarkdown, GOOGLE_DOC_MIME_TYPE, sha256, slugifyKnowledgeId,
  type GoogleDocumentPayload,
} from "@/lib/knowledge-workflow/google-doc";

const db = supabase as any;

type Area = {
  id: string;
  slug: string;
  name: string;
  description: string;
  owner_key: string;
  default_visibility: "public" | "internal" | "restricted";
  active: boolean;
};

type Profile = { id: string; email: string | null; full_name: string | null };
type Membership = { id: string; area_id: string; user_id: string; role: "owner" | "editor" };
type DocumentRow = {
  id: string;
  okf_id: string;
  title: string;
  description: string;
  area_id: string;
  owner_key: string;
  reviewer_key: string | null;
  document_type: string;
  visibility: "public" | "internal" | "restricted";
  status: "draft" | "review" | "approved" | "active" | "deprecated";
  published_revision_id: string | null;
  updated_at: string;
};
type Revision = {
  id: string;
  document_id: string;
  revision_number: number;
  content_markdown: string;
  metadata: Record<string, unknown>;
  change_summary: string;
  status: "draft" | "review" | "changes_requested" | "approved" | "publishing" | "published" | "rejected";
  author_id: string;
  review_note: string | null;
  updated_at: string;
};
type Source = {
  id: string;
  document_id: string;
  external_id: string;
  source_url: string;
  source_revision: string | null;
  sync_status: "current" | "changed" | "access_lost" | "detached";
};

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

const today = () => new Date().toISOString().slice(0, 10);

function loadScript(src: string, ready: () => boolean) {
  if (ready()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar integração Google.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar integração Google."));
    document.head.appendChild(script);
  });
}

async function requestGoogleAccessToken(prompt: "" | "consent" = "consent") {
  const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Configure PUBLIC_GOOGLE_CLIENT_ID para habilitar o Google Docs.");
  await loadScript("https://accounts.google.com/gsi/client", () => Boolean(window.google?.accounts?.oauth2));
  return new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error || !response.access_token) reject(new Error("A autorização do Google foi cancelada ou falhou."));
        else resolve(response.access_token);
      },
      error_callback: () => reject(new Error("Não foi possível abrir a autorização do Google.")),
    });
    client.requestAccessToken({ prompt });
  });
}

async function pickGoogleDocument(accessToken: string) {
  const apiKey = import.meta.env.PUBLIC_GOOGLE_API_KEY;
  const appId = import.meta.env.PUBLIC_GOOGLE_APP_ID;
  if (!apiKey || !appId) throw new Error("Configure PUBLIC_GOOGLE_API_KEY e PUBLIC_GOOGLE_APP_ID para habilitar o seletor do Drive.");
  await loadScript("https://apis.google.com/js/api.js", () => Boolean(window.gapi));
  await new Promise<void>((resolve) => window.gapi.load("picker", { callback: resolve }));
  return new Promise<{ id: string; name: string; url: string }>((resolve, reject) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setMimeTypes(GOOGLE_DOC_MIME_TYPE)
      .setSelectFolderEnabled(false);
    const picker = new window.google.picker.PickerBuilder()
      .setAppId(appId)
      .setDeveloperKey(apiKey)
      .setOAuthToken(accessToken)
      .addView(view)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const file = data.docs[0];
          resolve({ id: file.id, name: file.name, url: file.url || `https://docs.google.com/document/d/${file.id}/edit` });
        } else if (data.action === window.google.picker.Action.CANCEL) reject(new Error("Seleção cancelada."));
      })
      .build();
    picker.setVisible(true);
  });
}

function statusLabel(status: string) {
  return ({
    draft: "Rascunho", review: "Em revisão", changes_requested: "Ajustes solicitados",
    approved: "Aprovado", publishing: "Publicando", published: "Publicado", rejected: "Rejeitado",
    active: "Publicado", deprecated: "Descontinuado",
  } as Record<string, string>)[status] ?? status;
}

function okfAreaFor(document: { id: string; owner?: string }) {
  if (["leia", "amplify-academy"].includes(document.id)) return "education";
  if (["offers", "portfolio"].includes(document.id)) return "offers";
  if (document.owner === "commercial") return "commercial";
  if (document.owner === "product" || document.owner === "knowledge") return "technology";
  return "company";
}

const KnowledgeAdmin = () => {
  const { user, session } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isKnowledgeAdmin, setIsKnowledgeAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [importAreaId, setImportAreaId] = useState("");
  const [newArea, setNewArea] = useState({ slug: "", name: "", description: "", owner_key: "", default_visibility: "internal" as Area["default_visibility"] });
  const [assignment, setAssignment] = useState({ area_id: "", user_id: "", role: "owner" as Membership["role"] });

  const load = useCallback(async () => {
    setLoading(true);
    const [areasResult, documentsResult, revisionsResult, sourcesResult, membersResult, profilesResult, adminsResult] = await Promise.all([
      db.from("knowledge_areas").select("*").order("name"),
      db.from("knowledge_documents").select("*").order("updated_at", { ascending: false }),
      db.from("knowledge_revisions").select("*").order("revision_number", { ascending: false }),
      db.from("knowledge_sources").select("*"),
      db.from("knowledge_area_members").select("*"),
      db.from("profiles").select("id, email, full_name").order("full_name"),
      db.from("knowledge_admins").select("user_id"),
    ]);
    const error = [areasResult, documentsResult, revisionsResult, sourcesResult, membersResult, profilesResult, adminsResult].find((result) => result.error)?.error;
    if (error) toast.error(`Não foi possível carregar a governança: ${error.message}`);
    setAreas(areasResult.data ?? []);
    setDocuments(documentsResult.data ?? []);
    setRevisions(revisionsResult.data ?? []);
    setSources(sourcesResult.data ?? []);
    setMemberships(membersResult.data ?? []);
    setProfiles(profilesResult.data ?? []);
    setIsKnowledgeAdmin(Boolean(user && (adminsResult.data ?? []).some((admin: { user_id: string }) => admin.user_id === user.id)));
    setImportAreaId((current) => current || areasResult.data?.[0]?.id || "");
    setAssignment((current) => ({ ...current, area_id: current.area_id || areasResult.data?.[0]?.id || "", user_id: current.user_id || profilesResult.data?.[0]?.id || "" }));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const selectedDocument = documents.find((item) => item.id === selectedDocumentId) ?? null;
  const selectedRevision = useMemo(() => revisions
    .filter((item) => item.document_id === selectedDocumentId)
    .sort((a, b) => b.revision_number - a.revision_number)[0] ?? null, [revisions, selectedDocumentId]);
  const pendingCount = revisions.filter((revision) => revision.status === "review").length;
  const changedSources = sources.filter((source) => source.sync_status === "changed").length;
  const canReviewSelected = Boolean(selectedDocument && user && (
    isKnowledgeAdmin || memberships.some((member) => member.area_id === selectedDocument.area_id && member.user_id === user.id && member.role === "owner")
  ));

  useEffect(() => {
    setEditorContent(selectedRevision?.content_markdown ?? "");
    setChangeSummary(selectedRevision?.change_summary ?? "");
    setReviewNote(selectedRevision?.review_note ?? "");
  }, [selectedRevision]);

  const appendAudit = async (eventType: string, documentId?: string, revisionId?: string, areaId?: string, details: Record<string, unknown> = {}) => {
    if (!user) return;
    await db.from("knowledge_audit_events").insert({ actor_id: user.id, event_type: eventType, document_id: documentId, revision_id: revisionId, area_id: areaId, details });
  };

  const createDocument = async (input: {
    title: string; content: string; area: Area; source?: { id: string; url: string; revision?: string }; warnings?: string[];
  }) => {
    if (!user) throw new Error("Sessão expirada.");
    const baseId = slugifyKnowledgeId(input.title);
    const okfId = documents.some((document) => document.okf_id === baseId)
      ? `${baseId}-${input.source?.id.slice(0, 6).toLowerCase() ?? Date.now().toString().slice(-6)}`
      : baseId;
    const description = `Documento ${input.source ? "importado do Google Docs" : "criado na Base de Conhecimento"}.`;
    const { data: documentRow, error: documentError } = await db.from("knowledge_documents").insert({
      okf_id: okfId, title: input.title, description, area_id: input.area.id,
      owner_key: input.area.owner_key, reviewer_key: `${input.area.slug}-owner`, document_type: "reference",
      visibility: input.area.default_visibility, status: "draft", source_of_truth: true, tags: [], created_by: user.id,
    }).select("*").single();
    if (documentError) throw documentError;
    const metadata = {
      id: okfId, title: input.title, description, area: input.area.slug, type: "reference",
      visibility: input.area.default_visibility, status: "draft", owner: input.area.owner_key,
      reviewer: `${input.area.slug}-owner`, source_of_truth: true, tags: [],
      sources: input.source ? [input.source.url] : [], relationships: [], last_reviewed: today(), updated_at: today(),
    };
    const { data: revision, error: revisionError } = await db.from("knowledge_revisions").insert({
      document_id: documentRow.id, revision_number: 1, content_markdown: input.content,
      metadata, status: "draft", author_id: user.id,
      change_summary: input.source ? "Importação inicial do Google Docs" : "Criação inicial",
    }).select("*").single();
    if (revisionError) throw revisionError;
    if (input.source) {
      const checksum = await sha256(input.content);
      const { error: sourceError } = await db.from("knowledge_sources").insert({
        document_id: documentRow.id, provider: "google_docs", external_id: input.source.id,
        source_url: input.source.url, source_revision: input.source.revision ?? null,
        content_checksum: checksum, sync_status: "current", connected_by: user.id, last_checked_at: new Date().toISOString(),
      });
      if (sourceError) throw sourceError;
    }
    await appendAudit("document.created", documentRow.id, revision.id, input.area.id, { source: input.source ? "google_docs" : "editor", warnings: input.warnings ?? [] });
    await load();
    setSelectedDocumentId(documentRow.id);
    return documentRow;
  };

  const importGoogleDoc = async () => {
    const area = areas.find((item) => item.id === importAreaId);
    if (!area) return toast.error("Escolha a área responsável.");
    const pastedId = googleUrl ? extractGoogleDocId(googleUrl) : null;
    if (googleUrl && !pastedId) return toast.error("O link do Google Docs não é válido.");
    setBusy(true);
    try {
      const token = await requestGoogleAccessToken();
      const picked = await pickGoogleDocument(token);
      if (pastedId && picked.id !== pastedId) throw new Error("O arquivo escolhido é diferente do link informado.");
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${picked.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("O Google não liberou a leitura deste documento. Confirme o arquivo e tente novamente.");
      const payload = await response.json() as GoogleDocumentPayload;
      const converted = googleDocumentToMarkdown(payload);
      await createDocument({ title: converted.title || picked.name, content: converted.markdown, area, source: { id: picked.id, url: picked.url, revision: payload.revisionId }, warnings: converted.warnings });
      setGoogleUrl("");
      toast.success(converted.warnings.length ? `Importado com ${converted.warnings.length} aviso(s) para revisão.` : "Google Doc importado como rascunho.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar Google Doc.");
    } finally {
      setBusy(false);
    }
  };

  const createManualDocument = async () => {
    const area = areas.find((item) => item.id === importAreaId);
    if (!area) return toast.error("Escolha a área responsável.");
    setBusy(true);
    try {
      await createDocument({ title: "Novo documento", content: "# Novo documento\n\nComece a escrever aqui.", area });
      toast.success("Rascunho criado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar documento.");
    } finally { setBusy(false); }
  };

  const saveRevision = async () => {
    if (!selectedDocument || !user) return;
    setBusy(true);
    try {
      let revisionId = selectedRevision?.id;
      if (selectedRevision && ["draft", "changes_requested"].includes(selectedRevision.status)) {
        const { error } = await db.from("knowledge_revisions").update({ content_markdown: editorContent, change_summary: changeSummary }).eq("id", selectedRevision.id);
        if (error) throw error;
      } else {
        const number = Math.max(0, ...revisions.filter((item) => item.document_id === selectedDocument.id).map((item) => item.revision_number)) + 1;
        const metadata = { ...(selectedRevision?.metadata ?? {}), status: "draft", updated_at: today() };
        const { data, error } = await db.from("knowledge_revisions").insert({
          document_id: selectedDocument.id, revision_number: number, content_markdown: editorContent,
          metadata, change_summary: changeSummary, status: "draft", author_id: user.id,
        }).select("id").single();
        if (error) throw error;
        revisionId = data.id;
        await db.from("knowledge_documents").update({ status: "draft" }).eq("id", selectedDocument.id);
      }
      await appendAudit("revision.saved", selectedDocument.id, revisionId, selectedDocument.area_id);
      toast.success("Rascunho salvo.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao salvar."); }
    finally { setBusy(false); }
  };

  const submitForReview = async () => {
    if (!selectedDocument || !selectedRevision) return;
    setBusy(true);
    try {
      const submittedAt = new Date().toISOString();
      const [{ error: revisionError }, { error: documentError }] = await Promise.all([
        db.from("knowledge_revisions").update({ status: "review", submitted_at: submittedAt }).eq("id", selectedRevision.id),
        db.from("knowledge_documents").update({ status: "review" }).eq("id", selectedDocument.id),
      ]);
      if (revisionError || documentError) throw revisionError || documentError;
      await appendAudit("revision.submitted", selectedDocument.id, selectedRevision.id, selectedDocument.area_id);
      toast.success("Enviado ao dono da área para aprovação.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao enviar para revisão."); }
    finally { setBusy(false); }
  };

  const requestChanges = async (document = selectedDocument, revision = selectedRevision) => {
    if (!document || !revision || !reviewNote.trim()) return toast.error("Explique os ajustes necessários.");
    setBusy(true);
    try {
      const { error } = await db.from("knowledge_revisions").update({
        status: "changes_requested", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_note: reviewNote.trim(),
      }).eq("id", revision.id);
      if (error) throw error;
      await db.from("knowledge_documents").update({ status: "draft" }).eq("id", document.id);
      await appendAudit("revision.changes_requested", document.id, revision.id, document.area_id, { note: reviewNote.trim() });
      toast.success("Ajustes solicitados.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao solicitar ajustes."); }
    finally { setBusy(false); }
  };

  const approveAndPublish = async (document = selectedDocument, revision = selectedRevision) => {
    if (!document || !revision || !session) return;
    setBusy(true);
    try {
      if (revision.status === "review") {
        const reviewedAt = new Date().toISOString();
        const { error } = await db.from("knowledge_revisions").update({
          status: "approved", reviewed_by: user?.id, reviewed_at: reviewedAt, review_note: reviewNote.trim() || null,
        }).eq("id", revision.id);
        if (error) throw error;
        await db.from("knowledge_documents").update({ status: "approved" }).eq("id", document.id);
        await appendAudit("revision.approved", document.id, revision.id, document.area_id);
      } else if (revision.status !== "approved") {
        throw new Error("Esta revisão não está pronta para publicação.");
      }
      const response = await fetch("/api/knowledge-workflow/publish", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ documentId: document.id, revisionId: revision.id }),
      });
      const rawResult = await response.text();
      let result: { message?: string; error?: string } = {};
      try { result = rawResult ? JSON.parse(rawResult) : {}; }
      catch { result = { message: `O publicador respondeu com erro HTTP ${response.status}.` }; }
      if (!response.ok) {
        toast.warning(`Conteúdo aprovado; publicação pendente: ${result.message ?? result.error}`);
      } else {
        toast.success("Aprovado e enviado ao OKF. A publicação seguirá o deploy da main.");
      }
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao aprovar."); }
    finally { setBusy(false); }
  };

  const syncPublishedOkf = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/knowledge");
      if (!response.ok) throw new Error("Não foi possível ler o OKF publicado.");
      const summaries = await response.json() as Array<{ id: string }>;
      let imported = 0;
      for (const summary of summaries) {
        if (documents.some((document) => document.okf_id === summary.id)) continue;
        const detailResponse = await fetch(`/api/knowledge/${summary.id}`);
        if (!detailResponse.ok) continue;
        const detail = await detailResponse.json();
        const area = areas.find((item) => item.slug === okfAreaFor(detail));
        if (!area || !user) continue;
        const { data: row, error: insertError } = await db.from("knowledge_documents").insert({
          okf_id: detail.id, title: detail.title, description: detail.description, area_id: area.id,
          owner_key: detail.owner, reviewer_key: detail.reviewer ?? `${area.slug}-owner`, document_type: detail.type,
          visibility: detail.visibility, status: detail.status, source_of_truth: detail.source_of_truth,
          tags: detail.tags ?? [], created_by: user.id,
        }).select("*").single();
        if (insertError) throw insertError;
        const metadata = { ...detail, area: area.slug };
        delete metadata.content;
        const { data: revision, error: revisionError } = await db.from("knowledge_revisions").insert({
          document_id: row.id, revision_number: 1, content_markdown: detail.content,
          metadata, change_summary: "Sincronização inicial do OKF publicado", status: "published",
          author_id: user.id, reviewed_by: user.id, reviewed_at: new Date().toISOString(), published_at: new Date().toISOString(),
        }).select("id").single();
        if (revisionError) throw revisionError;
        await db.from("knowledge_documents").update({ published_revision_id: revision.id }).eq("id", row.id);
        await appendAudit("document.synced_from_okf", row.id, revision.id, area.id);
        imported += 1;
      }
      toast.success(imported ? `${imported} documento(s) publicado(s) sincronizado(s).` : "A governança já está alinhada com o OKF publicado.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao sincronizar OKF."); }
    finally { setBusy(false); }
  };

  const checkGoogleSources = async () => {
    if (sources.length === 0) return toast.info("Nenhuma fonte Google conectada.");
    setBusy(true);
    try {
      const token = await requestGoogleAccessToken("");
      let changed = 0;
      let lost = 0;
      for (const source of sources.filter((item) => item.sync_status !== "detached")) {
        const response = await fetch(`https://docs.googleapis.com/v1/documents/${source.external_id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
          await db.from("knowledge_sources").update({ sync_status: "access_lost", last_checked_at: new Date().toISOString() }).eq("id", source.id);
          lost += 1;
          continue;
        }
        const payload = await response.json() as GoogleDocumentPayload;
        const syncStatus = source.source_revision && payload.revisionId !== source.source_revision ? "changed" : "current";
        if (syncStatus === "changed") changed += 1;
        await db.from("knowledge_sources").update({ sync_status: syncStatus, last_checked_at: new Date().toISOString() }).eq("id", source.id);
      }
      toast.success(`${changed} fonte(s) alterada(s) e ${lost} acesso(s) perdido(s).`);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao verificar fontes."); }
    finally { setBusy(false); }
  };

  const reimportSelectedSource = async () => {
    if (!selectedDocument || !user) return;
    const source = sources.find((item) => item.document_id === selectedDocument.id && item.sync_status === "changed");
    if (!source) return;
    setBusy(true);
    try {
      const token = await requestGoogleAccessToken("");
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${source.external_id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("O Google não liberou a releitura desta fonte.");
      const payload = await response.json() as GoogleDocumentPayload;
      const converted = googleDocumentToMarkdown(payload);
      const number = Math.max(0, ...revisions.filter((item) => item.document_id === selectedDocument.id).map((item) => item.revision_number)) + 1;
      const metadata = { ...(selectedRevision?.metadata ?? {}), status: "draft", updated_at: today(), title: converted.title };
      const { data: revision, error } = await db.from("knowledge_revisions").insert({
        document_id: selectedDocument.id, revision_number: number, content_markdown: converted.markdown,
        metadata, change_summary: "Atualização detectada no Google Docs", status: "draft", author_id: user.id,
      }).select("id").single();
      if (error) throw error;
      await Promise.all([
        db.from("knowledge_documents").update({ status: "draft", title: converted.title }).eq("id", selectedDocument.id),
        db.from("knowledge_sources").update({ source_revision: payload.revisionId ?? null, content_checksum: await sha256(converted.markdown), sync_status: "current", last_checked_at: new Date().toISOString() }).eq("id", source.id),
      ]);
      await appendAudit("source.reimported", selectedDocument.id, revision.id, selectedDocument.area_id, { provider: "google_docs", warnings: converted.warnings });
      toast.success("Alteração importada em uma nova revisão. A versão publicada foi preservada.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao reimportar a fonte."); }
    finally { setBusy(false); }
  };

  const createArea = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await db.from("knowledge_areas").insert({ ...newArea, created_by: user?.id });
      if (error) throw error;
      setNewArea({ slug: "", name: "", description: "", owner_key: "", default_visibility: "internal" });
      toast.success("Área criada.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao criar área."); }
    finally { setBusy(false); }
  };

  const assignAreaMember = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await db.from("knowledge_area_members").insert({ ...assignment, created_by: user?.id });
      if (error) throw error;
      toast.success("Responsabilidade atribuída.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao atribuir responsável."); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando governança...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><BookOpenCheck className="h-6 w-6 text-primary" /><h1 className="text-2xl font-heading font-bold">Base de conhecimento</h1></div>
          <p className="mt-1 text-sm text-muted-foreground">Governança, contribuições, aprovação e publicação no OKF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={checkGoogleSources} disabled={busy || sources.length === 0}><CloudDownload className="mr-2 h-4 w-4" />Verificar fontes</Button>
          <Button variant="outline" onClick={syncPublishedOkf} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Sincronizar OKF</Button>
          <Button asChild><a href="/knowledge" target="_blank" rel="noreferrer"><BookOpenCheck className="mr-2 h-4 w-4" />Abrir Knowledge</a></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Documentos governados</CardDescription><CardTitle>{documents.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Aguardando aprovação</CardDescription><CardTitle>{pendingCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Fontes alteradas</CardDescription><CardTitle>{changedSources}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Áreas ativas</CardDescription><CardTitle>{areas.filter((area) => area.active).length}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="import">Criar ou importar</TabsTrigger>
          <TabsTrigger value="reviews">Aprovações {pendingCount > 0 && <Badge className="ml-2">{pendingCount}</Badge>}</TabsTrigger>
          {isKnowledgeAdmin && <TabsTrigger value="governance">Áreas e responsáveis</TabsTrigger>}
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {documents.length === 0 ? (
            <Card><CardContent className="py-10 text-center"><FileClock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">O fluxo editorial ainda está vazio.</p><p className="mt-1 text-sm text-muted-foreground">Sincronize os documentos publicados ou importe o primeiro Google Doc.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
              <Card className="overflow-hidden"><CardHeader><CardTitle className="text-lg">Documentos</CardTitle></CardHeader><CardContent className="space-y-2">
                {documents.map((document) => {
                  const area = areas.find((item) => item.id === document.area_id);
                  const revision = revisions.find((item) => item.document_id === document.id);
                  return <button key={document.id} type="button" onClick={() => setSelectedDocumentId(document.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedDocumentId === document.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <div className="flex items-start justify-between gap-2"><strong className="text-sm">{document.title}</strong><Badge variant="outline">{statusLabel(revision?.status ?? document.status)}</Badge></div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>{area?.name}</span><code>{document.okf_id}</code></div>
                  </button>;
                })}
              </CardContent></Card>

              <Card><CardHeader><CardTitle className="text-lg">{selectedDocument?.title ?? "Selecione um documento"}</CardTitle><CardDescription>{selectedDocument ? `${selectedDocument.okf_id} · ${areas.find((area) => area.id === selectedDocument.area_id)?.name}` : "Edite uma revisão sem interromper a versão publicada."}</CardDescription></CardHeader>
                {selectedDocument && <CardContent className="space-y-4">
                  <div className="grid gap-2"><Label htmlFor="change-summary">Resumo da alteração</Label><Input id="change-summary" value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} placeholder="O que mudou nesta revisão?" /></div>
                  <div className="grid gap-2"><Label htmlFor="knowledge-editor">Conteúdo em Markdown</Label><textarea id="knowledge-editor" value={editorContent} onChange={(event) => setEditorContent(event.target.value)} className="min-h-[420px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                  {sources.some((source) => source.document_id === selectedDocument.id && source.sync_status === "changed") && <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200"><p>A fonte Google foi alterada depois da última importação.</p><Button className="mt-2" size="sm" variant="outline" onClick={reimportSelectedSource} disabled={busy}>Criar revisão com a mudança</Button></div>}
                  <div className="flex flex-wrap gap-2"><Button onClick={saveRevision} disabled={busy}>Salvar rascunho</Button><Button variant="outline" onClick={submitForReview} disabled={busy || !selectedRevision || selectedRevision.status === "review"}>Enviar para aprovação</Button>{selectedRevision?.status === "approved" && canReviewSelected && <Button onClick={() => approveAndPublish(selectedDocument, selectedRevision)} disabled={busy}><ShieldCheck className="mr-2 h-4 w-4" />Publicar aprovado</Button>}{selectedDocument.status === "active" && <Button variant="ghost" asChild><a href={`/knowledge/${selectedDocument.okf_id}`} target="_blank" rel="noreferrer">Ver publicado</a></Button>}</div>
                </CardContent>}
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="import">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-lg">Importar Google Docs</CardTitle><CardDescription>O usuário autoriza o próprio arquivo; nenhuma conta técnica paga é necessária.</CardDescription></CardHeader><CardContent className="space-y-4">
              <div className="grid gap-2"><Label htmlFor="google-url">Link do Google Doc (opcional)</Label><Input id="google-url" value={googleUrl} onChange={(event) => setGoogleUrl(event.target.value)} placeholder="https://docs.google.com/document/d/..." /><p className="text-xs text-muted-foreground">O seletor do Drive confirmará exatamente qual arquivo pode ser lido.</p></div>
              <div className="grid gap-2"><Label htmlFor="import-area">Área responsável</Label><select id="import-area" value={importAreaId} onChange={(event) => setImportAreaId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div>
              <Button onClick={importGoogleDoc} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudDownload className="mr-2 h-4 w-4" />}Autorizar e importar</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-lg">Criar dentro da KB</CardTitle><CardDescription>Comece um rascunho no editor, sem documento externo.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-2"><Label htmlFor="manual-area">Área responsável</Label><select id="manual-area" value={importAreaId} onChange={(event) => setImportAreaId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div><Button variant="outline" onClick={createManualDocument} disabled={busy}><FilePlus2 className="mr-2 h-4 w-4" />Criar rascunho</Button></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {revisions.filter((revision) => revision.status === "review").length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-primary" />Nenhum documento aguardando aprovação.</CardContent></Card> : revisions.filter((revision) => revision.status === "review").map((revision) => {
            const document = documents.find((item) => item.id === revision.document_id);
            const canReview = Boolean(document && user && (isKnowledgeAdmin || memberships.some((member) => member.area_id === document.area_id && member.user_id === user.id && member.role === "owner")));
              return <Card key={revision.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-lg">{document?.title}</CardTitle><CardDescription>Revisão {revision.revision_number} · {revision.change_summary || "Sem resumo"}</CardDescription></div><Badge>{statusLabel(revision.status)}</Badge></div></CardHeader><CardContent className="space-y-3"><pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-xs">{revision.content_markdown}</pre>{canReview && document ? <><textarea value={selectedDocumentId === document.id ? reviewNote : ""} onFocus={() => setSelectedDocumentId(document.id)} onChange={(event) => setReviewNote(event.target.value)} placeholder="Comentário da revisão (obrigatório ao pedir ajustes)" className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /><div className="flex gap-2"><Button onClick={() => approveAndPublish(document, revision)} disabled={busy}><ShieldCheck className="mr-2 h-4 w-4" />Aprovar e publicar</Button><Button variant="outline" onClick={() => requestChanges(document, revision)} disabled={busy}>Pedir ajustes</Button></div></> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" />Apenas o dono da área ou administrador da KB pode decidir.</p>}</CardContent></Card>;
          })}
        </TabsContent>

        {isKnowledgeAdmin && <TabsContent value="governance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings2 className="h-5 w-5" />Criar área</CardTitle></CardHeader><CardContent><form onSubmit={createArea} className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><div><Label>Nome</Label><Input required value={newArea.name} onChange={(event) => setNewArea({ ...newArea, name: event.target.value, slug: slugifyKnowledgeId(event.target.value) })} /></div><div><Label>Slug</Label><Input required value={newArea.slug} onChange={(event) => setNewArea({ ...newArea, slug: slugifyKnowledgeId(event.target.value) })} /></div></div><div><Label>Descrição</Label><Input value={newArea.description} onChange={(event) => setNewArea({ ...newArea, description: event.target.value })} /></div><div className="grid gap-2 sm:grid-cols-2"><div><Label>Owner no OKF</Label><Input required value={newArea.owner_key} onChange={(event) => setNewArea({ ...newArea, owner_key: slugifyKnowledgeId(event.target.value) })} /></div><div><Label>Visibilidade padrão</Label><select value={newArea.default_visibility} onChange={(event) => setNewArea({ ...newArea, default_visibility: event.target.value as Area["default_visibility"] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="public">Pública</option><option value="internal">Interna</option><option value="restricted">Restrita</option></select></div></div><Button type="submit" disabled={busy}>Criar área</Button></form></CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" />Atribuir responsável</CardTitle><CardDescription>Donos aprovam; editores preparam o conteúdo.</CardDescription></CardHeader><CardContent><form onSubmit={assignAreaMember} className="space-y-3"><div><Label>Área</Label><select value={assignment.area_id} onChange={(event) => setAssignment({ ...assignment, area_id: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div><div><Label>Pessoa</Label><select value={assignment.user_id} onChange={(event) => setAssignment({ ...assignment, user_id: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name || profile.email}</option>)}</select></div><div><Label>Papel</Label><select value={assignment.role} onChange={(event) => setAssignment({ ...assignment, role: event.target.value as Membership["role"] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="owner">Dono da área</option><option value="editor">Editor da área</option></select></div><Button type="submit" disabled={busy}>Atribuir papel</Button></form></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-lg">Mapa de governança</CardTitle><CardDescription>Você está registrado como administrador da KB.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{areas.map((area) => <div key={area.id} className="rounded-lg border p-4"><div className="flex items-center justify-between gap-2"><strong>{area.name}</strong><Badge variant="outline">{area.default_visibility}</Badge></div><p className="mt-1 text-xs text-muted-foreground">OKF owner: {area.owner_key}</p><div className="mt-3 space-y-1">{memberships.filter((member) => member.area_id === area.id).map((member) => { const profile = profiles.find((item) => item.id === member.user_id); return <p key={member.id} className="text-sm">{profile?.full_name || profile?.email} · <span className="text-muted-foreground">{member.role === "owner" ? "dono" : "editor"}</span></p>; })}{!memberships.some((member) => member.area_id === area.id) && <p className="text-sm text-amber-500">Sem dono específico; o administrador da KB responde temporariamente.</p>}</div></div>)}</CardContent></Card>
        </TabsContent>}
      </Tabs>
    </div>
  );
};

export default KnowledgeAdmin;
