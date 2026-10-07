import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCopy,
  Download,
  Eye,
  FileUp,
  Link2,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldX,
  TicketCheck,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseInvitationCsv, serializeInvitationPackage, type InvitationCsvRow } from "@/lib/amplify-day/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type InvitationStatus = "ready" | "copied" | "visited" | "confirmed" | "revoked";
type InviteEmailStatus = "not_sent" | "sending" | "sent" | "delivered" | "failed" | "bounced" | "complained" | "suppressed";
type TargetStage = "amplify" | "teia";

interface Inviter {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  signature: string;
  base_message: string;
  additional_cc_emails: string[];
}

interface Invitation {
  id: string;
  inviter_id: string;
  target_stage: TargetStage;
  guest_name: string;
  guest_email: string;
  guest_company: string;
  guest_role: string;
  personal_message: string | null;
  code: string;
  status: InvitationStatus;
  first_visited_at: string | null;
  link: string;
  subject: string;
  message: string;
  confirmation_email_status: string;
  confirmation_email_error: string | null;
  kit_sync_status: string;
  kit_sync_error: string | null;
  invite_email_status: InviteEmailStatus;
  invite_email_id: string | null;
  invite_email_cc: string[];
  invite_email_error: string | null;
  send_locked?: boolean;
  campaign_id?: string | null;
}

interface Campaign {
  id: string;
  campaign_key: string;
  name: string;
  inviter_id: string;
  status: "preparing" | "ready_locked" | "scheduled" | "sending" | "sent" | "cancelled";
  send_locked: boolean;
  nominal_count: number;
  institutional_count: number;
  blocked_count: number;
  missing_email_count: number;
  prepared_at: string | null;
  scheduled_for: string | null;
  schedule_timezone: string;
  authorized_at: string | null;
}

interface CampaignRecipient {
  id: string;
  campaign_id: string;
  recipient_type: "nominal" | "institutional" | "blocked" | "missing_email";
  status: "ready" | "blocked" | "excluded" | "sending" | "scheduled" | "sent" | "failed";
  recipient_email: string | null;
  recipient_name: string | null;
  company: string | null;
  role: string | null;
  invitation_id: string | null;
  subject: string;
  block_reason: string | null;
  provider_email_id: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  suppressed_at: string | null;
  delivery_delayed_at: string | null;
  delivery_error: string | null;
}

interface CampaignPreview {
  recipientType: "nominal" | "institutional";
  to: string;
  cc: string[];
  from: string;
  subject: string;
  html: string;
  text: string;
  landingPage: string;
}

type LeadReviewStatus = "pending_review" | "approved" | "not_selected";

interface PriorityLead {
  id: string;
  name: string;
  email: string;
  target_stage: TargetStage;
  organization: string | null;
  role: string | null;
  whatsapp: string | null;
  review_status: LeadReviewStatus;
  invitation_id: string | null;
  completed_at: string | null;
  kit_sync_status: string;
  kit_sync_error: string | null;
}

const EMPTY_INVITER = {
  name: "",
  email: "",
  role: "",
  company: "",
  signature: "",
  baseMessage: "Olá, {convidado}. Quero fazer um convite pessoal para o Ampl_IA Day by X-Via 2026.",
  additionalCcEmails: "",
};

const EMPTY_GUEST: InvitationCsvRow = { name: "", email: "", company: "", role: "", personalMessage: "" };
const AMPLIFY_DAY_ADMIN_ENDPOINT = "/api/amplify-day-admin";

const STATUS_LABELS: Record<InvitationStatus, string> = {
  ready: "Preparado",
  copied: "Link copiado",
  visited: "Visitou",
  confirmed: "Confirmado",
  revoked: "Revogado",
};

const STATUS_CLASSES: Record<InvitationStatus, string> = {
  ready: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  copied: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  visited: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  revoked: "border-red-500/30 bg-red-500/10 text-red-300",
};

const EMAIL_STATUS_LABELS: Record<InviteEmailStatus, string> = {
  not_sent: "Não enviado",
  sending: "Enviando",
  sent: "Enviado",
  delivered: "Entregue",
  failed: "Falhou",
  bounced: "Devolvido",
  complained: "Spam",
  suppressed: "Suprimido",
};

const EMAIL_STATUS_CLASSES: Record<InviteEmailStatus, string> = {
  not_sent: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  sending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  sent: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  delivered: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
  bounced: "border-red-500/30 bg-red-500/10 text-red-300",
  complained: "border-red-500/30 bg-red-500/10 text-red-300",
  suppressed: "border-red-500/30 bg-red-500/10 text-red-300",
};

const STAGE_LABELS: Record<TargetStage, string> = {
  amplify: "Palco Amplify",
  teia: "Palco TEIA",
};

const STAGE_CLASSES: Record<TargetStage, string> = {
  amplify: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  teia: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
};

async function adminRequest(body?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sua sessão expirou.");
  const response = await fetch(AMPLIFY_DAY_ADMIN_ENDPOINT, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("A API local do gerador não respondeu corretamente. Atualize a página e tente novamente.");
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
  return payload;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-4 md:px-5">
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="text-2xl font-semibold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: TargetStage }) {
  return <Badge variant="outline" className={STAGE_CLASSES[stage]}>{STAGE_LABELS[stage]}</Badge>;
}

function readableIntegrationError(provider: "email" | "kit", error: string | null) {
  const value = String(error || "");
  const normalized = value.toLowerCase();
  if (provider === "kit" && (normalized.includes("api key is invalid") || normalized.includes("credencial do kit inválida") || normalized.includes("http 401"))) {
    return "Credencial do Kit inválida.";
  }
  if (provider === "kit" && normalized.includes("kit_api_key")) return "KIT_API_KEY não configurada.";
  if (provider === "email" && normalized.includes("resend")) return value || "Falha no Resend.";
  return value || (provider === "kit" ? "Falha ao sincronizar com o Kit." : "Falha no e-mail de confirmação.");
}

interface AmplifyDayInvitationsProps {
  initialData?: { inviters: Inviter[]; invitations: Invitation[]; leads?: PriorityLead[]; campaigns?: Campaign[]; campaignRecipients?: CampaignRecipient[] };
}

export default function AmplifyDayInvitations({ initialData }: AmplifyDayInvitationsProps) {
  const [inviters, setInviters] = useState<Inviter[]>(initialData?.inviters || []);
  const [invitations, setInvitations] = useState<Invitation[]>(initialData?.invitations || []);
  const [leads, setLeads] = useState<PriorityLead[]>(initialData?.leads || []);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialData?.campaigns || []);
  const [campaignRecipients, setCampaignRecipients] = useState<CampaignRecipient[]>(initialData?.campaignRecipients || []);
  const [campaignPreview, setCampaignPreview] = useState<CampaignPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedInviterId, setSelectedInviterId] = useState(initialData?.inviters?.[0]?.id || "");
  const [selectedTargetStage, setSelectedTargetStage] = useState<TargetStage>("amplify");
  const [inviterForm, setInviterForm] = useState(EMPTY_INVITER);
  const [creatingInviter, setCreatingInviter] = useState(false);
  const [guest, setGuest] = useState(EMPTY_GUEST);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [selectedInvitationIds, setSelectedInvitationIds] = useState<string[]>([]);
  const [sendDialogIds, setSendDialogIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<InvitationStatus | "all">("all");
  const [stageFilter, setStageFilter] = useState<TargetStage | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [retryingInvitationId, setRetryingInvitationId] = useState<string | null>(null);
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState<LeadReviewStatus | "all">("pending_review");
  const [leadStageFilter, setLeadStageFilter] = useState<TargetStage | "all">("all");
  const [leadDecision, setLeadDecision] = useState<{ id: string; action: "approve_lead" | "reject_lead" } | null>(null);
  const [reviewingLeadId, setReviewingLeadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDashboard = useCallback(async (preferredInviterId?: string) => {
    setLoading(true);
    try {
      const payload = await adminRequest();
      const nextInviters: Inviter[] = payload.inviters || [];
      setInviters(nextInviters);
      setInvitations(payload.invitations || []);
      setLeads(payload.leads || []);
      setCampaigns(payload.campaigns || []);
      setCampaignRecipients(payload.campaignRecipients || []);
      setSelectedInviterId((current) => {
        const preferredExists = preferredInviterId && nextInviters.some((item) => item.id === preferredInviterId);
        if (preferredExists) return preferredInviterId;
        if (nextInviters.some((item) => item.id === current)) return current;
        return nextInviters[0]?.id || "";
      });
      setCreatingInviter(nextInviters.length === 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar convites.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) loadDashboard();
  }, [initialData, loadDashboard]);

  const selectedInviter = inviters.find((item) => item.id === selectedInviterId);
  const isNewInviter = creatingInviter || !selectedInviter;
  useEffect(() => {
    if (!selectedInviter || isNewInviter) return;
    setInviterForm({
      name: selectedInviter.name,
      email: selectedInviter.email,
      role: selectedInviter.role,
      company: selectedInviter.company,
      signature: selectedInviter.signature,
      baseMessage: selectedInviter.base_message,
      additionalCcEmails: (selectedInviter.additional_cc_emails || []).join("\n"),
    });
  }, [selectedInviterId, selectedInviter, isNewInviter]);

  useEffect(() => {
    setSelectedInvitationIds([]);
  }, [selectedInviterId]);

  const selectedInvitations = invitations.filter((item) => item.inviter_id === selectedInviterId);
  const visibleInvitations = selectedInvitations.filter((item) => {
    const matchesStatus = filter === "all" || item.status === filter;
    const matchesStage = stageFilter === "all" || item.target_stage === stageFilter;
    const haystack = `${item.guest_name} ${item.guest_email} ${item.guest_company} ${item.guest_role}`.toLowerCase();
    return matchesStatus && matchesStage && haystack.includes(search.toLowerCase());
  });
  const stats = useMemo(() => ({
    ready: invitations.filter((item) => item.invite_email_status === "not_sent" && ["ready", "copied", "visited"].includes(item.status)).length,
    sent: invitations.filter((item) => ["sent", "delivered"].includes(item.invite_email_status)).length,
    visited: invitations.filter((item) => Boolean(item.first_visited_at)).length,
    confirmed: invitations.filter((item) => item.status === "confirmed").length,
    confirmedAmplify: invitations.filter((item) => item.status === "confirmed" && item.target_stage === "amplify").length,
    confirmedTeia: invitations.filter((item) => item.status === "confirmed" && item.target_stage === "teia").length,
  }), [invitations]);
  const visibleLeads = leads.filter((lead) => {
    const matchesStatus = leadFilter === "all" || lead.review_status === leadFilter;
    const matchesStage = leadStageFilter === "all" || lead.target_stage === leadStageFilter;
    const haystack = `${lead.name} ${lead.email} ${lead.organization || ""} ${lead.role || ""} ${lead.whatsapp || ""}`.toLowerCase();
    return matchesStatus && matchesStage && haystack.includes(leadSearch.toLowerCase());
  });
  const pendingLeadCount = leads.filter((lead) => lead.review_status === "pending_review").length;

  const sendableInvitations = visibleInvitations.filter((item) =>
    ["not_sent", "failed"].includes(item.invite_email_status)
    && ["ready", "copied", "visited"].includes(item.status)
    && !item.send_locked,
  );
  const sendableVisibleIds = sendableInvitations.map((item) => item.id);
  const allVisibleSelected = sendableVisibleIds.length > 0
    && sendableVisibleIds.every((id) => selectedInvitationIds.includes(id));
  const invitationsInSendDialog = invitations.filter((item) => sendDialogIds.includes(item.id));
  const ccPreview = selectedInviter
    ? [...new Set([selectedInviter.email, ...(selectedInviter.additional_cc_emails || [])])]
    : [];
  const activeCampaign = campaigns.find((item) => item.campaign_key === "amplify-day-2026-palco-amplify-gilson") || campaigns[0];
  const activeCampaignRecipients = useMemo(() => activeCampaign
    ? campaignRecipients.filter((item) => item.campaign_id === activeCampaign.id)
    : [], [activeCampaign, campaignRecipients]);
  const campaignTracking = useMemo(() => ({
    queued: activeCampaignRecipients.filter((item) => Boolean(item.provider_email_id)).length,
    delivered: activeCampaignRecipients.filter((item) => Boolean(item.delivered_at)).length,
    clicked: activeCampaignRecipients.filter((item) => Boolean(item.clicked_at)).length,
    failed: activeCampaignRecipients.filter((item) => Boolean(item.bounced_at || item.complained_at || item.suppressed_at || item.delivery_error)).length,
  }), [activeCampaignRecipients]);

  const openCampaignPreview = async (recipientType: "nominal" | "institutional") => {
    const recipient = activeCampaignRecipients.find((item) => item.recipient_type === recipientType && item.status === "ready");
    if (!recipient) return toast.error("Não há um rascunho disponível para esta modalidade.");
    setLoadingPreview(true);
    try {
      const payload = await adminRequest({ action: "preview_campaign_email", recipientId: recipient.id });
      setCampaignPreview(payload.preview);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o preview.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const saveInviter = async () => {
    setSaving(true);
    try {
      const payload = await adminRequest({
        action: isNewInviter ? "create_inviter" : "update_inviter",
        inviter: { ...inviterForm, id: selectedInviterId },
      });
      toast.success(isNewInviter ? "Convidante criado." : "Convidante atualizado.");
      setCreatingInviter(false);
      await loadDashboard(payload.inviter.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar convidante.");
    } finally {
      setSaving(false);
    }
  };

  const createGuests = async (guests: InvitationCsvRow[]) => {
    if (!selectedInviter) return toast.error("Crie ou selecione um convidante primeiro.");
    setSaving(true);
    try {
      await adminRequest({ action: "create_invitations", inviterId: selectedInviter.id, targetStage: selectedTargetStage, guests });
      toast.success(`${guests.length} ${guests.length === 1 ? "convite preparado" : "convites preparados"}.`);
      setGuestDialogOpen(false);
      setGuest(EMPTY_GUEST);
      await loadDashboard(selectedInviter.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao preparar convites.");
    } finally {
      setSaving(false);
    }
  };

  const handleCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const rows = parseInvitationCsv(await file.text());
      await createGuests(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV inválido.");
    }
  };

  const copyInvitation = async (invitation: Invitation, kind: "link" | "message") => {
    await navigator.clipboard.writeText(kind === "link" ? invitation.link : invitation.message);
    toast.success(kind === "link" ? "Link copiado." : "Mensagem copiada.");
    if (invitation.status === "ready") {
      try {
        await adminRequest({ action: "mark_copied", invitationId: invitation.id });
        setInvitations((current) => current.map((item) => item.id === invitation.id ? { ...item, status: "copied" } : item));
      } catch (_error) {
        // A cópia já ocorreu; a falha de telemetria não bloqueia o operador.
      }
    }
  };

  const revokeInvitation = async () => {
    if (!revokeId) return;
    try {
      await adminRequest({ action: "revoke", invitationId: revokeId });
      toast.success("Convite revogado.");
      setRevokeId(null);
      await loadDashboard(selectedInviterId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao revogar convite.");
    }
  };

  const sendInvitations = async () => {
    if (!sendDialogIds.length) return;
    setSaving(true);
    try {
      const payload = await adminRequest({ action: "send_invitations", invitationIds: sendDialogIds });
      if (payload.sent) toast.success(`${payload.sent} ${payload.sent === 1 ? "convite enviado" : "convites enviados"} com o convidante em cópia.`);
      if (payload.failed) toast.error(`${payload.failed} ${payload.failed === 1 ? "envio falhou" : "envios falharam"}. Consulte o status na lista.`);
      setSendDialogIds([]);
      setSelectedInvitationIds([]);
      await loadDashboard(selectedInviterId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar convites.");
    } finally {
      setSaving(false);
    }
  };

  const retryConfirmationIntegrations = async (invitation: Invitation) => {
    setRetryingInvitationId(invitation.id);
    try {
      const payload = await adminRequest({ action: "retry_confirmation_integrations", invitationId: invitation.id });
      const failed = [payload.integrations?.email, payload.integrations?.kit].filter((item) => item && !item.ok);
      if (failed.length) toast.error(failed.map((item) => item.error).filter(Boolean).join(" ") || "A integração ainda falhou.");
      else toast.success("Integrações concluídas.");
      await loadDashboard(selectedInviterId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível tentar novamente.");
    } finally {
      setRetryingInvitationId(null);
    }
  };

  const updateTargetStage = async ({ invitationId, leadId, targetStage, name }: { invitationId?: string; leadId?: string; targetStage: TargetStage; name: string }) => {
    const recordId = invitationId || leadId;
    if (!recordId) return;
    setUpdatingStageId(recordId);
    try {
      const payload = await adminRequest({ action: "update_target_stage", invitationId, leadId, targetStage });
      toast.success(`${name} foi alocado no ${STAGE_LABELS[targetStage]}.`);
      if (payload.kit && !payload.kit.ok) toast.warning("O palco foi alterado, mas a atualização no Kit precisa ser tentada novamente.");
      await loadDashboard(selectedInviterId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o palco.");
    } finally {
      setUpdatingStageId(null);
    }
  };

  const retryLeadKitIntegration = async (lead: Lead) => {
    setRetryingInvitationId(lead.id);
    try {
      const payload = await adminRequest({ action: "retry_lead_integrations", leadId: lead.id });
      if (payload.integration?.ok) toast.success("Cadastro sincronizado com o Kit.");
      else toast.error(payload.integration?.error || "A sincronização com o Kit ainda falhou.");
      await loadDashboard(selectedInviterId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível tentar novamente.");
    } finally {
      setRetryingInvitationId(null);
    }
  };

  const reviewLead = async () => {
    if (!leadDecision) return;
    setReviewingLeadId(leadDecision.id);
    try {
      const payload = await adminRequest({ action: leadDecision.action, leadId: leadDecision.id });
      if (leadDecision.action === "approve_lead") {
        const failed = [payload.integrations?.email, payload.integrations?.kit].filter((item) => item && !item.ok);
        if (failed.length) toast.error("Perfil aprovado; uma integração precisa de nova tentativa.");
        else toast.success("Perfil aprovado, código gerado e confirmação enviada.");
      } else {
        toast.success("Perfil marcado como não selecionado.");
      }
      setLeadDecision(null);
      await loadDashboard(selectedInviterId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a análise.");
    } finally {
      setReviewingLeadId(null);
    }
  };

  const exportPackage = () => {
    if (!selectedInviter || !selectedInvitations.length) return toast.error("Não há convites para exportar.");
    const slug = selectedInviter.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    downloadCsv(`convites-${slug}.csv`, serializeInvitationPackage(selectedInvitations as unknown as Array<Record<string, unknown>>));
    toast.success("Pacote exportado.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Convites do Ampl_IA Day by X-Via</h1>
          <p className="mt-1 text-sm text-muted-foreground">Prepare e envie cortesias nominais com o convidante em cópia real.</p>
        </div>
        <Button onClick={() => { setCreatingInviter(true); setSelectedInviterId(""); setInviterForm(EMPTY_INVITER); }}>
          <Plus className="mr-2 h-4 w-4" />Novo convidante
        </Button>
      </div>

      <div className="grid overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-2 xl:grid-cols-6 xl:divide-x xl:divide-border">
        <Stat icon={Users} label="Preparados" value={stats.ready} />
        <Stat icon={Mail} label="Emails enviados" value={stats.sent} />
        <Stat icon={Eye} label="Visitaram" value={stats.visited} />
        <Stat icon={CheckCircle2} label="Confirmados" value={stats.confirmed} />
        <Stat icon={CheckCircle2} label="Confirmados · Palco Amplify" value={stats.confirmedAmplify} />
        <Stat icon={CheckCircle2} label="Confirmados · Palco TEIA" value={stats.confirmedTeia} />
      </div>

      {activeCampaign && (
        <section className="overflow-hidden rounded-lg border border-cyan-500/30 bg-card">
          <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{activeCampaign.name}</h2>
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">Envio bloqueado</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Tudo preparado. Nenhuma mensagem, teste ou cópia será enviada antes do good to go.</p>
              {activeCampaign.scheduled_for && <p className="mt-1 text-xs text-muted-foreground">Horário preparado: <strong className="text-foreground">15/09/2026 às 08:00</strong> · America/Sao_Paulo. Ainda não submetido ao provedor.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={loadingPreview} onClick={() => openCampaignPreview("nominal")}><Eye className="mr-2 h-4 w-4" />Preview nominal</Button>
              <Button variant="outline" disabled={loadingPreview} onClick={() => openCampaignPreview("institutional")}><Eye className="mr-2 h-4 w-4" />Preview institucional</Button>
              <Button disabled title="Aguardando autorização explícita">Enviar campanha — {activeCampaign.nominal_count + activeCampaign.institutional_count}</Button>
            </div>
          </div>
          <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
            <Stat icon={UserCheck} label="Convites nominais prontos" value={activeCampaign.nominal_count} />
            <Stat icon={Mail} label="Institucionais prontos" value={activeCampaign.institutional_count} />
            <Stat icon={ShieldX} label="Endereços bloqueados" value={activeCampaign.blocked_count} />
            <Stat icon={UserX} label="Registros sem e-mail" value={activeCampaign.missing_email_count} />
          </div>
          <div className="border-t border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
            Disparo final previsto: <strong className="text-foreground">{activeCampaign.nominal_count + activeCampaign.institutional_count} destinatários + {activeCampaign.nominal_count + activeCampaign.institutional_count} cópias para Gilson</strong>.
            {campaignTracking.queued > 0 && <span className="ml-2">Tracking: {campaignTracking.queued} agendados · {campaignTracking.delivered} entregues · {campaignTracking.clicked} cliques · {campaignTracking.failed} falhas.</span>}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary" /><h2 className="font-semibold">Curadoria de interessados</h2></div>
            <p className="mt-1 text-xs text-muted-foreground">Aprovar confirma a inscrição, gera o código individual e dispara e-mail e Kit.</p>
          </div>
          <Badge variant="outline" className="w-fit border-amber-500/30 bg-amber-500/10 text-amber-300">{pendingLeadCount} aguardando análise</Badge>
        </div>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <Select value={leadFilter} onValueChange={(value) => setLeadFilter(value as typeof leadFilter)}>
            <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="pending_review">Aguardando análise</SelectItem><SelectItem value="approved">Aprovados</SelectItem><SelectItem value="not_selected">Não selecionados</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent>
          </Select>
          <Select value={leadStageFilter} onValueChange={(value) => setLeadStageFilter(value as typeof leadStageFilter)}>
            <SelectTrigger className="sm:w-48" aria-label="Filtrar interessados por palco"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os palcos</SelectItem><SelectItem value="amplify">Palco Amplify</SelectItem><SelectItem value="teia">Palco TEIA</SelectItem></SelectContent>
          </Select>
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar interessado, organização ou cargo..." value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Interessado</th><th className="px-4 py-3 font-medium">Organização e cargo</th><th className="px-4 py-3 font-medium">Palco</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Ações</th></tr></thead>
            <tbody>{visibleLeads.map((lead) => {
              const linkedInvitation = lead.invitation_id ? invitations.find((item) => item.id === lead.invitation_id) : null;
              const hasIntegrationFailure = linkedInvitation?.confirmation_email_status === "failed" || linkedInvitation?.kit_sync_status === "failed" || lead.kit_sync_status === "failed";
              return (
              <tr key={lead.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3"><p className="font-medium">{lead.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{lead.email}</p>{lead.whatsapp && <p className="mt-0.5 text-xs text-muted-foreground">WhatsApp: {lead.whatsapp}</p>}</td>
                <td className="px-4 py-3"><p>{lead.organization || "—"}</p><p className="mt-0.5 text-xs text-muted-foreground">{lead.role || "—"}</p></td>
                <td className="px-4 py-3">
                  <Select
                    value={lead.target_stage}
                    disabled={updatingStageId === (lead.invitation_id || lead.id)}
                    onValueChange={(value) => updateTargetStage({ invitationId: lead.invitation_id || undefined, leadId: lead.invitation_id ? undefined : lead.id, targetStage: value as TargetStage, name: lead.name })}
                  >
                    <SelectTrigger className={`h-8 w-40 ${STAGE_CLASSES[lead.target_stage]}`} aria-label={`Alterar palco de ${lead.name}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="amplify">Palco Amplify</SelectItem><SelectItem value="teia">Palco TEIA</SelectItem></SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3"><Badge variant="outline" className={lead.review_status === "approved" ? STATUS_CLASSES.confirmed : lead.review_status === "not_selected" ? STATUS_CLASSES.revoked : "border-amber-500/30 bg-amber-500/10 text-amber-300"}>{lead.review_status === "approved" ? "Aprovado" : lead.review_status === "not_selected" ? "Não selecionado" : "Aguardando análise"}</Badge>{linkedInvitation && <p className="mt-1 font-mono text-xs text-primary">{linkedInvitation.code}</p>}{hasIntegrationFailure && <p className="mt-1 text-xs text-amber-300">Integração pendente</p>}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2">{hasIntegrationFailure && (linkedInvitation ? <Button variant="outline" size="sm" disabled={retryingInvitationId === linkedInvitation.id} onClick={() => retryConfirmationIntegrations(linkedInvitation)}><RefreshCw className={`mr-1.5 h-4 w-4 ${retryingInvitationId === linkedInvitation.id ? "animate-spin" : ""}`} />Tentar novamente</Button> : <Button variant="outline" size="sm" disabled={retryingInvitationId === lead.id} onClick={() => retryLeadKitIntegration(lead)}><RefreshCw className={`mr-1.5 h-4 w-4 ${retryingInvitationId === lead.id ? "animate-spin" : ""}`} />Tentar Kit novamente</Button>)}<Button size="sm" disabled={lead.review_status !== "pending_review" || reviewingLeadId === lead.id} onClick={() => setLeadDecision({ id: lead.id, action: "approve_lead" })}><UserCheck className="mr-1.5 h-4 w-4" />Aprovar</Button><Button variant="outline" size="sm" disabled={lead.review_status !== "pending_review" || reviewingLeadId === lead.id} onClick={() => setLeadDecision({ id: lead.id, action: "reject_lead" })}><UserX className="mr-1.5 h-4 w-4" />Não selecionar</Button></div></td>
              </tr>
            )})}</tbody>
          </table>
          {visibleLeads.length === 0 && <div className="px-6 py-12 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Nenhum interessado neste status.</p></div>}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando convites...</div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-border bg-card p-4">
            {!isNewInviter && inviters.length > 0 && (
              <div className="mb-5">
                <Label htmlFor="inviter-select">Convidante selecionado</Label>
                <Select value={selectedInviterId} onValueChange={(value) => { setCreatingInviter(false); setSelectedInviterId(value); }}>
                  <SelectTrigger id="inviter-select" className="mt-2"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{inviters.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="mb-4 flex items-center gap-2">
              {isNewInviter ? <Plus className="h-4 w-4 text-primary" /> : <Pencil className="h-4 w-4 text-primary" />}
              <h2 className="font-semibold">{isNewInviter ? "Novo convidante" : "Dados do convidante"}</h2>
            </div>
            <div className="space-y-4">
              {([['name', 'Nome'], ['email', 'Email'], ['role', 'Cargo'], ['company', 'Empresa']] as const).map(([key, label]) => (
                <div key={key} className="space-y-1.5"><Label htmlFor={`inviter-${key}`}>{label}</Label><Input id={`inviter-${key}`} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'email' ? undefined : 160} value={inviterForm[key]} onChange={(event) => setInviterForm((current) => ({ ...current, [key]: event.target.value }))} /></div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="inviter-cc">Pessoas adicionais em cópia</Label>
                <Textarea id="inviter-cc" rows={3} placeholder={'email1@empresa.com\nemail2@empresa.com'} value={inviterForm.additionalCcEmails} onChange={(event) => setInviterForm((current) => ({ ...current, additionalCcEmails: event.target.value }))} />
                <p className="text-xs text-muted-foreground">O email do convidante já entra no CC. Adicione até cinco endereços, separados por vírgula ou linha. Todos ficarão visíveis no email.</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-end justify-between gap-3"><Label htmlFor="inviter-signature">Assinatura da mensagem</Label><span className="text-[10px] text-muted-foreground">{inviterForm.signature.length}/400</span></div>
                <Textarea id="inviter-signature" rows={3} maxLength={400} value={inviterForm.signature} onChange={(event) => setInviterForm((current) => ({ ...current, signature: event.target.value }))} />
                <p className="text-xs text-muted-foreground">Usada apenas no texto copiado para WhatsApp ou email. Não aparece na landing page.</p>
              </div>
              <div className="space-y-1.5"><Label htmlFor="inviter-message">Mensagem-base de compartilhamento</Label><Textarea id="inviter-message" rows={5} value={inviterForm.baseMessage} onChange={(event) => setInviterForm((current) => ({ ...current, baseMessage: event.target.value }))} /><p className="text-xs text-muted-foreground">Usada apenas no texto copiado para WhatsApp ou email. Use {'{convidado}'} para inserir o primeiro nome; ela não aparece na landing page.</p></div>
              <Button className="w-full" onClick={saveInviter} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isNewInviter ? "Criar convidante" : "Salvar alterações"}</Button>
            </div>
          </aside>

          <section className="min-w-0 rounded-lg border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setGuestDialogOpen(true)} disabled={!selectedInviter}><Plus className="mr-2 h-4 w-4" />Adicionar convidado</Button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsv} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!selectedInviter || saving}><FileUp className="mr-2 h-4 w-4" />Importar CSV</Button>
                <Button variant="outline" onClick={exportPackage} disabled={!selectedInviter}><Download className="mr-2 h-4 w-4" />Exportar pacote</Button>
                <Button variant="outline" onClick={() => setSendDialogIds(selectedInvitationIds)} disabled={!selectedInvitationIds.length || saving}><Send className="mr-2 h-4 w-4" />Enviar selecionados ({selectedInvitationIds.length})</Button>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="target-stage-select" className="whitespace-nowrap text-xs text-muted-foreground">Palco dos novos convites</Label>
                <Select value={selectedTargetStage} onValueChange={(value) => setSelectedTargetStage(value as TargetStage)}>
                  <SelectTrigger id="target-stage-select" className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amplify">Palco Amplify</SelectItem>
                    <SelectItem value="teia">Palco TEIA</SelectItem>
                  </SelectContent>
                </Select>
                <div className="hidden items-center gap-2 2xl:flex">
                  <StageBadge stage="amplify" /><span className="text-xs text-muted-foreground">{selectedInvitations.filter((item) => item.target_stage === "amplify").length}</span>
                  <StageBadge stage="teia" /><span className="text-xs text-muted-foreground">{selectedInvitations.filter((item) => item.target_stage === "teia").length}</span>
                </div>
                <span className="whitespace-nowrap text-sm text-muted-foreground">{selectedInvitations.length} {selectedInvitations.length === 1 ? "convidado" : "convidados"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
              <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
              <Select value={stageFilter} onValueChange={(value) => setStageFilter(value as typeof stageFilter)}><SelectTrigger className="sm:w-48" aria-label="Filtrar convites por palco"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os palcos</SelectItem><SelectItem value="amplify">Palco Amplify</SelectItem><SelectItem value="teia">Palco TEIA</SelectItem></SelectContent></Select>
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar convidado, empresa ou cargo..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="w-10 px-4 py-3 font-medium"><Checkbox aria-label="Selecionar todos os convites disponíveis" checked={allVisibleSelected} onCheckedChange={(checked) => setSelectedInvitationIds((current) => checked ? [...new Set([...current, ...sendableVisibleIds])] : current.filter((id) => !sendableVisibleIds.includes(id)))} disabled={!sendableVisibleIds.length} /></th><th className="px-4 py-3 font-medium">Convidado</th><th className="px-4 py-3 font-medium">Empresa e cargo</th><th className="px-4 py-3 font-medium">Palco</th><th className="px-4 py-3 font-medium">Código</th><th className="px-4 py-3 font-medium">Convite</th><th className="px-4 py-3 font-medium">Email</th><th className="px-4 py-3 text-right font-medium">Ações</th></tr></thead>
                <tbody>
                  {visibleInvitations.map((invitation) => (
                    <tr key={invitation.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3"><Checkbox aria-label={`Selecionar convite de ${invitation.guest_name}`} checked={selectedInvitationIds.includes(invitation.id)} disabled={!sendableVisibleIds.includes(invitation.id)} onCheckedChange={(checked) => setSelectedInvitationIds((current) => checked ? [...new Set([...current, invitation.id])] : current.filter((id) => id !== invitation.id))} /></td>
                      <td className="px-4 py-3"><p className="font-medium">{invitation.guest_name}</p><p className="mt-0.5 text-xs text-muted-foreground">{invitation.guest_email}</p></td>
                      <td className="px-4 py-3"><p>{invitation.guest_company}</p><p className="mt-0.5 text-xs text-muted-foreground">{invitation.guest_role}</p></td>
                      <td className="px-4 py-3">
                        <Select
                          value={invitation.target_stage}
                          disabled={updatingStageId === invitation.id}
                          onValueChange={(value) => updateTargetStage({ invitationId: invitation.id, targetStage: value as TargetStage, name: invitation.guest_name })}
                        >
                          <SelectTrigger className={`h-8 w-40 ${STAGE_CLASSES[invitation.target_stage]}`} aria-label={`Alterar palco de ${invitation.guest_name}`}><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="amplify">Palco Amplify</SelectItem><SelectItem value="teia">Palco TEIA</SelectItem></SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">{invitation.code}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_CLASSES[invitation.status]}>{STATUS_LABELS[invitation.status]}</Badge>
                        {invitation.send_locked && <Badge variant="outline" className="ml-1 border-amber-500/30 bg-amber-500/10 text-amber-300">Campanha bloqueada</Badge>}
                        {invitation.confirmation_email_status === "failed" && <p className="mt-1 max-w-56 text-xs text-red-300" title={invitation.confirmation_email_error || undefined}>E-mail de confirmação: {readableIntegrationError("email", invitation.confirmation_email_error)}</p>}
                        {invitation.kit_sync_status === "failed" && <p className="mt-1 max-w-56 text-xs text-amber-300" title={invitation.kit_sync_error || undefined}>Kit: {readableIntegrationError("kit", invitation.kit_sync_error)}</p>}
                        {(invitation.confirmation_email_status === "failed" || invitation.kit_sync_status === "failed") && (
                          <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" disabled={retryingInvitationId === invitation.id} onClick={() => retryConfirmationIntegrations(invitation)}>
                            <RefreshCw className={`mr-1.5 h-3 w-3 ${retryingInvitationId === invitation.id ? "animate-spin" : ""}`} />Tentar novamente
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline" className={EMAIL_STATUS_CLASSES[invitation.invite_email_status]}>{EMAIL_STATUS_LABELS[invitation.invite_email_status]}</Badge>{invitation.invite_email_error && <p className="mt-1 max-w-44 truncate text-xs text-red-300" title={invitation.invite_email_error}>Ver detalhe</p>}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" title={invitation.invite_email_status === "failed" ? "Tentar enviar novamente" : "Enviar convite"} disabled={!sendableVisibleIds.includes(invitation.id)} onClick={() => setSendDialogIds([invitation.id])}><Send className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Copiar link" onClick={() => copyInvitation(invitation, "link")}><Link2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Copiar mensagem" onClick={() => copyInvitation(invitation, "message")}><ClipboardCopy className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Revogar" disabled={invitation.status === "confirmed" || invitation.status === "revoked"} onClick={() => setRevokeId(invitation.id)} className="text-muted-foreground hover:text-destructive"><ShieldX className="h-4 w-4" /></Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleInvitations.length === 0 && <div className="px-6 py-16 text-center"><TicketCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">{selectedInviterId ? "Nenhum convite encontrado." : "Crie ou selecione um convidante."}</p></div>}
            </div>
          </section>
        </div>
      )}

      <Dialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar convidado</DialogTitle><DialogDescription>O código e o link nominal serão gerados automaticamente para {selectedTargetStage === "teia" ? "o Palco TEIA" : "o Palco Amplify"}.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {([['name', 'Nome'], ['email', 'Email'], ['company', 'Empresa'], ['role', 'Cargo']] as const).map(([key, label]) => <div key={key} className="space-y-1.5"><Label htmlFor={`guest-${key}`}>{label}</Label><Input id={`guest-${key}`} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'email' ? undefined : 160} value={guest[key]} onChange={(event) => setGuest((current) => ({ ...current, [key]: event.target.value }))} /></div>)}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-end justify-between gap-3"><Label htmlFor="guest-message">Recado pessoal na landing page (opcional)</Label><span className="text-[10px] text-muted-foreground">{guest.personalMessage.length}/180</span></div>
              <Textarea id="guest-message" rows={3} maxLength={180} value={guest.personalMessage} onChange={(event) => setGuest((current) => ({ ...current, personalMessage: event.target.value }))} />
              <p className="text-xs text-muted-foreground">Um recado curto para este convidado. Se ficar vazio, esse bloco não aparece na página.</p>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setGuestDialogOpen(false)}>Cancelar</Button><Button onClick={() => createGuests([guest])} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(campaignPreview)} onOpenChange={(open) => !open && setCampaignPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview do e-mail {campaignPreview?.recipientType === "nominal" ? "nominal" : "institucional"}</DialogTitle>
            <DialogDescription>{campaignPreview?.from} → {campaignPreview?.to} · CC: {campaignPreview?.cc.join(", ")}</DialogDescription>
          </DialogHeader>
          {campaignPreview && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm"><strong>Assunto:</strong> {campaignPreview.subject}</div>
              <iframe title={`Preview ${campaignPreview.recipientType}`} srcDoc={campaignPreview.html} className="h-[62vh] w-full rounded-md border border-border bg-white" />
              <a href={campaignPreview.landingPage} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-primary underline underline-offset-4">Abrir landing page vinculada</a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(revokeId)} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Revogar este convite?</AlertDialogTitle><AlertDialogDescription>O link deixará de funcionar. Uma presença já confirmada não pode ser revogada por esta ação.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={revokeInvitation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Revogar convite</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(leadDecision)} onOpenChange={(open) => !open && setLeadDecision(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{leadDecision?.action === "approve_lead" ? "Aprovar este perfil?" : "Marcar como não selecionado?"}</AlertDialogTitle><AlertDialogDescription>{leadDecision?.action === "approve_lead" ? "A inscrição será confirmada imediatamente, com geração do código pessoal e envio por e-mail e Kit." : "A decisão ficará registrada e nenhuma mensagem automática será enviada."}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={Boolean(reviewingLeadId)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={reviewLead} disabled={Boolean(reviewingLeadId)}>{reviewingLeadId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{leadDecision?.action === "approve_lead" ? "Aprovar e confirmar" : "Não selecionar"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sendDialogIds.length > 0} onOpenChange={(open) => !open && setSendDialogIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{sendDialogIds.length === 1 ? "Enviar este convite?" : `Enviar ${sendDialogIds.length} convites?`}</AlertDialogTitle>
            <AlertDialogDescription>O envio sairá pelo Resend em nome de {selectedInviter?.name || "Ampl_IA Day by X-Via"} | Ampl_IA Day by X-Via. O convidante e as pessoas adicionais aparecerão em CC verdadeiro.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-border bg-muted/20 p-4 text-sm">
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Em cópia</p><p className="mt-1 break-all text-foreground">{ccPreview.join(", ") || "Nenhum email válido"}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destinatários</p>{invitationsInSendDialog.map((invitation) => <p key={invitation.id} className="mt-1 text-foreground">{invitation.guest_name} <span className="text-muted-foreground">&lt;{invitation.guest_email}&gt;</span></p>)}</div>
          </div>
          <AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={sendInvitations} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar envio</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
